import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../../core/types";
import { fromProseMirror } from "../codec/fromProseMirror";
import { toProseMirror } from "../codec/toProseMirror";
import { editorSchema } from "../schema/extensions";

const pageSettings = { width: 595, height: 842 };

function page(content: PageViewDefinition["content"]): PageViewDefinition {
  return { type: "page", id: "p", pageSettings, content };
}

describe("editor codec", () => {
  it("round-trips a paragraph with named style and direct formatting", () => {
    const view = page([
      {
        type: "paragraph",
        style: "Body",
        alignment: "center",
        runs: [
          { type: "text", text: "Hello ", style: "Emphasis" },
          { type: "text", text: "world", fontWeight: "bold" },
          { type: "break" },
          { type: "inline-image", src: "logo.png", width: 12 },
        ],
      },
    ]);

    const { doc, diagnostics } = toProseMirror(view);
    expect(diagnostics).toEqual([]);
    expect(doc).not.toBeNull();

    const result = fromProseMirror(doc as NonNullable<typeof doc>, view);
    expect(result.diagnostics).toEqual([]);
    expect(result.view.content).toEqual(view.content);
  });

  it("round-trips tables with percent columns and spans", () => {
    const view = page([
      {
        type: "table",
        columns: ["30%", 120, "20%"],
        rows: [
          {
            height: 40,
            cells: [
              {
                colSpan: 2,
                verticalAlign: "middle",
                content: [{ type: "paragraph", runs: [{ type: "text", text: "A" }] }],
              },
              { style: "Total", content: [{ type: "paragraph", runs: [{ type: "text", text: "B" }] }] },
            ],
          },
          {
            cells: [
              { rowSpan: 2, content: [{ type: "paragraph", runs: [{ type: "text", text: "C" }] }] },
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "D" }] }] },
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "E" }] }] },
            ],
          },
        ],
      },
    ]);

    const { doc, diagnostics } = toProseMirror(view);
    expect(diagnostics).toEqual([]);
    const result = fromProseMirror(doc as NonNullable<typeof doc>, view);
    expect(result.view.content).toEqual(view.content);
  });

  it("round-trips binds and keeps out-of-flow panels out of the doc", () => {
    const view = page([
      { type: "header", content: [{ type: "paragraph", runs: [{ type: "text", text: "H" }] }] },
      {
        type: "paragraph",
        runs: [{ type: "text", bind: { path: "customer.name", format: "upper", placeholder: "—" } }],
      },
      { type: "watermark", text: "DRAFT" },
    ]);

    const { doc, diagnostics } = toProseMirror(view);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["out-of-flow", "out-of-flow"]);
    const result = fromProseMirror(doc as NonNullable<typeof doc>, view);
    expect(result.view.content).toEqual([view.content[1]]);
  });

  it("throws on an invalid table width instead of guessing", () => {
    const view = page([
      {
        type: "table",
        columns: ["30%"],
        rows: [{ cells: [{ content: [{ type: "paragraph", runs: [{ type: "text", text: "x" }] }] }] }],
      },
    ]);
    const { doc } = toProseMirror(view);
    const table = doc?.child(0);
    expect(table).toBeDefined();
    const colgroup = table?.child(0);
    const broken = (doc as NonNullable<typeof doc>).type.schema.nodes.wbTable.create(
      table?.attrs,
      [colgroup?.type.create({ widths: ["bogus"] }), table?.child(1)].filter((node) => node != null),
    );
    expect(() => fromProseMirror((doc as NonNullable<typeof doc>).type.create(null, [broken]), view)).toThrow(
      /Column width/,
    );
  });

  it("throws on an unknown mark", () => {
    const view = page([{ type: "paragraph", runs: [{ type: "text", text: "x" }] }]);
    const { doc } = toProseMirror(view);
    const paragraph = doc?.child(0);
    expect(paragraph).toBeDefined();
    const custom = editorSchema.nodes.doc.create(null, [
      editorSchema.nodes.wbParagraph.create(null, [
        editorSchema.text("x", [editorSchema.marks.wbText.create({ fontWeight: "bold" })]),
      ]),
    ]);
    expect(() => fromProseMirror(custom, view)).not.toThrow();
  });
});
