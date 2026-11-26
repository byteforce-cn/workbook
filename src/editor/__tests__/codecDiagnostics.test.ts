import { Schema } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";
import type { PageBlockDefinition, PageViewDefinition } from "../../core/types";
import { isBlockingDiagnostic } from "../codec/diagnostics";
import { EditorSerializationError } from "../codec/errors";
import { fromProseMirror } from "../codec/fromProseMirror";
import { toProseMirror } from "../codec/toProseMirror";
import { editorSchema } from "../schema/extensions";

const pageSettings = { width: 595, height: 842 };

function page(content: PageViewDefinition["content"]): PageViewDefinition {
  return { type: "page", id: "p", pageSettings, content };
}

function paragraph(text: string): Extract<PageBlockDefinition, { type: "paragraph" }> {
  return { type: "paragraph", runs: [{ type: "text", text }] };
}

function captureError(run: () => unknown): EditorSerializationError {
  try {
    run();
  } catch (error) {
    if (error instanceof EditorSerializationError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected an EditorSerializationError");
}

type NodeSpecs = typeof editorSchema.spec.nodes;
type MarkSpecs = typeof editorSchema.spec.marks;

function extendSchema(options: {
  nodes?: (nodes: NodeSpecs) => NodeSpecs;
  marks?: (marks: MarkSpecs) => MarkSpecs;
}): Schema {
  return new Schema({
    nodes: options.nodes?.(editorSchema.spec.nodes) ?? editorSchema.spec.nodes,
    marks: options.marks?.(editorSchema.spec.marks) ?? editorSchema.spec.marks,
  });
}

function withRelaxedTable(content: string, extraNodes?: (nodes: NodeSpecs) => NodeSpecs) {
  return extendSchema({
    nodes: (nodes) => {
      const spec = nodes.get("wbTable");
      if (spec == null) {
        throw new Error("wbTable is missing from the editor schema");
      }
      const relaxed = nodes.update("wbTable", { ...spec, content });
      return extraNodes == null ? relaxed : extraNodes(relaxed);
    },
  });
}

describe("toProseMirror diagnostics", () => {
  it("warns about style ids missing from the catalog", () => {
    const view = page([
      { type: "paragraph", style: "MissingParagraph", runs: [{ type: "text", text: "x", style: "MissingRun" }] },
      {
        type: "table",
        style: "MissingTable",
        columns: ["50%", "50%"],
        rows: [
          {
            cells: [{ style: "MissingCell", content: [paragraph("a")] }, { content: [paragraph("b")] }],
          },
        ],
      },
      {
        type: "list",
        style: "MissingList",
        listType: "bullet",
        items: [[paragraph("item")]],
      },
    ]);

    const { doc, diagnostics } = toProseMirror(view, {
      styles: { paragraphStyles: {}, characterStyles: {}, tableStyles: {}, cellStyles: {}, listStyles: {} },
    });

    expect(doc).not.toBeNull();
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "style-not-found",
      "style-not-found",
      "style-not-found",
      "style-not-found",
      "style-not-found",
    ]);
    expect(diagnostics.every((diagnostic) => diagnostic.severity === "warning")).toBe(true);
  });

  it("warns only while a custom block has no registered component", () => {
    const view = page([
      { type: "custom", component: "app:unknown", props: { id: 1 } },
      { type: "custom", component: "app:known" },
    ]);

    const unregistered = toProseMirror(view, { registeredComponents: ["app:known"] });
    expect(unregistered.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Custom page block "app:unknown" is not registered; it is preserved but renders nothing.',
    ]);

    const registered = toProseMirror(view, { registeredComponents: ["app:unknown", "app:known"] });
    expect(registered.diagnostics).toEqual([]);
  });

  it("preserves an unknown block as a raw wbCustom node", () => {
    const unknown = { type: "future-widget", payload: { id: 7 } } as unknown as PageBlockDefinition;
    const { doc, diagnostics } = toProseMirror(page([paragraph("before"), unknown, paragraph("after")]));

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "unsupported-block",
        severity: "warning",
        raw: unknown,
      }),
    ]);
    expect(doc?.child(1).type.name).toBe("wbCustom");
    expect(doc?.child(1).attrs.component).toBe("workbook:unsupported");
    expect(doc?.child(1).attrs.rawBlock).toEqual(unknown);
  });

  it("returns no document when the page has no flow blocks", () => {
    const view = page([{ type: "header", content: [paragraph("H")] }]);
    const { doc, diagnostics } = toProseMirror(view);
    expect(doc).toBeNull();
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "out-of-flow", severity: "warning" }),
      expect.objectContaining({ code: "unsupported-block", severity: "error" }),
    ]);
  });
});

describe("fromProseMirror diagnostics", () => {
  it("rejects unknown wbText mark attributes instead of dropping them", () => {
    const schema = extendSchema({
      marks: (marks) => {
        const spec = marks.get("wbText");
        if (spec == null) {
          throw new Error("wbText is missing from the editor schema");
        }
        return marks.update("wbText", {
          ...spec,
          attrs: { ...spec.attrs, futureFlag: { default: null } },
        });
      },
    });
    const base = page([paragraph("x")]);
    const mark = schema.marks.wbText.create({ fontSize: 12, futureFlag: true });
    const doc = schema.nodes.doc.create(null, [schema.nodes.wbParagraph.create(null, [schema.text("x", [mark])])]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics).toEqual([
      expect.objectContaining({ code: "unknown-attr", severity: "error", path: "content[0].content[0]" }),
    ]);
    expect(error.message).toMatch(/Unknown wbText mark attribute "futureFlag"/);
  });

  it("rejects marks that have no workbook equivalent", () => {
    const schema = extendSchema({ marks: (marks) => marks.addToEnd("bold", {}) });
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.wbParagraph.create(null, [
        schema.text("x", [schema.marks.bold.create(), schema.marks.wbText.create({ fontSize: 12 })]),
      ]),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics).toEqual([expect.objectContaining({ code: "unknown-mark", severity: "error" })]);
  });

  it("rejects inline nodes that have no workbook run equivalent", () => {
    const schema = extendSchema({
      nodes: (nodes) => nodes.addToEnd("emoji", { group: "inline", inline: true, atom: true }),
    });
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.wbParagraph.create(null, [schema.nodes.emoji.create(), schema.text("x")]),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics).toEqual([expect.objectContaining({ code: "unsupported-run", severity: "error" })]);
  });

  it("merges three adjacent same-format runs into one", () => {
    const base = page([paragraph("x")]);
    // ProseMirror already joins text nodes that carry an identical mark, so use
    // one unmarked and one empty-`wbText` node here: both project to the same
    // format object, which is exactly the case `mergeTextRun` has to collapse.
    const emptyMark = editorSchema.marks.wbText.create();
    const doc = editorSchema.nodes.doc.create(null, [
      editorSchema.nodes.wbParagraph.create(null, [
        editorSchema.text("a"),
        editorSchema.text("b", [emptyMark]),
        editorSchema.text("c"),
      ]),
    ]);
    expect(doc.child(0).childCount).toBe(3);

    const { view, diagnostics } = fromProseMirror(doc, base);
    expect(diagnostics).toEqual([]);
    expect(view.content).toEqual([{ type: "paragraph", runs: [{ type: "text", text: "abc" }] }]);
  });

  it("rejects a table colgroup without widths", () => {
    const schema = withRelaxedTable("wbTableColgroup? wbTableRow*");
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.wbTable.create(null, [
        schema.nodes.wbTableColgroup.create({ widths: [] }),
        schema.nodes.wbTableRow.create(null, [
          schema.nodes.wbTableCell.create(null, [schema.nodes.wbParagraph.create(null, [])]),
        ]),
      ]),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Table colgroup must carry at least one column width.",
      "Table is missing its column widths.",
    ]);
  });

  it("rejects a table without column widths and rows", () => {
    const schema = withRelaxedTable("wbTableColgroup? wbTableRow*");
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [schema.nodes.wbTable.create(null, [])]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Table is missing its column widths.",
      "Table must contain at least one row.",
    ]);
  });

  it("rejects table children that are neither colgroup nor rows", () => {
    const schema = withRelaxedTable("(wbTableColgroup | wbTableRow | wbPageBreak)+");
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.wbTable.create(null, [
        schema.nodes.wbTableColgroup.create({ widths: ["100%"] }),
        schema.nodes.wbPageBreak.create(),
        schema.nodes.wbTableRow.create(null, [
          schema.nodes.wbTableCell.create(null, [schema.nodes.wbParagraph.create(null, [])]),
        ]),
      ]),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics).toEqual([expect.objectContaining({ code: "invalid-node" })]);
  });

  it("rejects a cell whose only block has no workbook equivalent", () => {
    const schema = withRelaxedTable("wbTableColgroup? wbTableRow+", (nodes) =>
      nodes.addToEnd("futureBlock", { group: "block wbCellBlock", atom: true }),
    );
    const base = page([paragraph("x")]);
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.wbTable.create(null, [
        schema.nodes.wbTableColgroup.create({ widths: ["100%"] }),
        schema.nodes.wbTableRow.create(null, [
          schema.nodes.wbTableCell.create(null, [schema.nodes.futureBlock.create()]),
        ]),
      ]),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unsupported-block", "invalid-node"]);
  });

  it("rejects images, spreadsheets and custom blocks missing required attributes", () => {
    const base = page([paragraph("x")]);
    const doc = editorSchema.nodes.doc.create(null, [
      editorSchema.nodes.wbImage.create({ src: "" }),
      editorSchema.nodes.wbSpreadsheet.create({ sheet: null }),
      editorSchema.nodes.wbCustom.create({ component: null }),
    ]);

    const error = captureError(() => fromProseMirror(doc, base));
    expect(error.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Image block is missing its src.",
      "Spreadsheet block is missing its sheet definition.",
      "Custom block is missing its component id.",
    ]);
  });

  it("restores the raw block preserved on an unsupported wbCustom node", () => {
    const base = page([paragraph("x")]);
    const rawBlock = { type: "page-break" as const };
    const doc = editorSchema.nodes.doc.create(null, [
      editorSchema.nodes.wbCustom.create({ component: "workbook:unsupported", rawBlock }),
    ]);

    const { view, diagnostics } = fromProseMirror(doc, base);
    expect(diagnostics).toEqual([]);
    expect(view.content).toEqual([rawBlock]);
  });

  it("rejects a root node that is not a document", () => {
    const base = page([paragraph("x")]);
    const paragraphNode = editorSchema.nodes.wbParagraph.create(null, [editorSchema.text("x")]);
    const error = captureError(() => fromProseMirror(paragraphNode, base));
    expect(error.diagnostics).toEqual([
      expect.objectContaining({ code: "invalid-node", message: "Expected a doc node." }),
    ]);
  });

  it("surfaces AJV validation failures as diagnostics", () => {
    const base = page([paragraph("x")]);
    const doc = editorSchema.nodes.doc.create(null, [
      editorSchema.nodes.wbParagraph.create(null, [editorSchema.text("x")]),
    ]);
    const validate = vi.fn(() => ({ valid: false, errors: [{ message: "must NOT have fewer than 1 items" }] }));

    const error = captureError(() => fromProseMirror(doc, base, { validate }));
    expect(validate).toHaveBeenCalledTimes(1);
    expect(error.message).toMatch(/schema validation failed/);
    expect(error.diagnostics).toEqual([
      expect.objectContaining({ code: "invalid-node", path: "content", severity: "error" }),
    ]);
  });
});

describe("diagnostic helpers", () => {
  it("only treats error severity as blocking", () => {
    expect(isBlockingDiagnostic({ code: "unknown-mark", path: "", severity: "error", message: "x" })).toBe(true);
    expect(isBlockingDiagnostic({ code: "out-of-flow", path: "", severity: "warning", message: "x" })).toBe(false);
  });
});
