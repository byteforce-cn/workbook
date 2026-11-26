/**
 * ProseMirror → PageView write-back.
 *
 * The converter only produces `content`; every document-level attribute comes
 * from `base` untouched. A document that cannot be represented losslessly
 * raises `EditorSerializationError` after AJV validation — it never returns a
 * half-valid document.
 */

import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { PageBlockDefinition, PageViewDefinition } from "../../core/types";
import { validateWorkbookDocument } from "../../schema";
import type { WorkbookDefinition } from "../../schema/generated-types";
import { editorSchema } from "../schema/extensions";
import type { EditorDiagnostic } from "./diagnostics";
import { EditorSerializationError } from "./errors";

export interface FromProseMirrorOptions {
  schema?: Schema;
  /** Override the bundled AJV validator (e.g. in a CSP-hardened host). */
  validate?: (workbook: unknown) => { valid: boolean; errors: Array<{ message?: string; instancePath?: string }> };
}

export interface FromProseMirrorResult {
  view: PageViewDefinition;
  diagnostics: EditorDiagnostic[];
}

const TEXT_FORMAT_KEYS = [
  "style",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "fontFamily",
  "fontSize",
  "color",
  "link",
] as const;

type MutableParagraph = Extract<PageBlockDefinition, { type: "paragraph" }>;
type TextRunLike = MutableParagraph["runs"][number];

const PERCENT_PATTERN = /^[0-9]+(\.[0-9]+)?%$/;

function isMeasurement(value: unknown): value is number | string {
  return (
    (typeof value === "number" && Number.isFinite(value) && value > 0) ||
    (typeof value === "string" && PERCENT_PATTERN.test(value))
  );
}

function withoutNulls(attrs: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const value = attrs[key];
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}

function readMarkFormat(
  markAttrs: Record<string, unknown>,
  path: string,
  diagnostics: EditorDiagnostic[],
): Record<string, unknown> {
  const known = new Set<string>(TEXT_FORMAT_KEYS);
  for (const [key, value] of Object.entries(markAttrs)) {
    if (value != null && !known.has(key)) {
      diagnostics.push({
        code: "unknown-attr",
        path,
        severity: "error",
        message: `Unknown wbText mark attribute "${key}".`,
        raw: { key, value },
      });
    }
  }

  return withoutNulls(markAttrs, TEXT_FORMAT_KEYS);
}

function mergeTextRun(runs: TextRunLike[], nextRun: TextRunLike): void {
  const previous = runs[runs.length - 1];
  if (previous == null || previous.type !== "text" || nextRun.type !== "text") {
    runs.push(nextRun);
    return;
  }

  if (previous.bind != null || nextRun.bind != null) {
    runs.push(nextRun);
    return;
  }

  const { text: previousText, ...previousFormat } = previous;
  const { text: nextText, ...nextFormat } = nextRun;
  if (JSON.stringify(previousFormat) === JSON.stringify(nextFormat)) {
    previous.text = `${previousText ?? ""}${nextText ?? ""}`;
    return;
  }

  runs.push(nextRun);
}

function paragraphRuns(node: PMNode, path: string, diagnostics: EditorDiagnostic[]): MutableParagraph["runs"] {
  const runs: TextRunLike[] = [];

  node.forEach((child, _offset, index) => {
    const childPath = `${path}.content[${index}]`;

    if (child.isText) {
      const wbMarks = child.marks.filter((mark) => mark.type.name === "wbText");
      const otherMarks = child.marks.filter((mark) => mark.type.name !== "wbText");
      if (otherMarks.length > 0) {
        diagnostics.push({
          code: "unknown-mark",
          path: childPath,
          severity: "error",
          message: `Unknown mark(s): ${otherMarks.map((mark) => mark.type.name).join(", ")}.`,
        });
      }

      const format = wbMarks[0] == null ? {} : readMarkFormat(wbMarks[0].attrs, childPath, diagnostics);
      mergeTextRun(runs, {
        type: "text",
        text: child.text ?? "",
        ...format,
      } as TextRunLike);
      return;
    }

    if (child.type.name === "hardBreak") {
      runs.push({ type: "break" });
      return;
    }

    if (child.type.name === "wbBind") {
      const attrs = child.attrs;
      const bind: {
        path: string;
        mode?: "twoWay" | "oneWay" | "oneWayToData";
        format?: string;
        placeholder?: unknown;
      } = {
        path: String(attrs.path ?? ""),
      };
      if (attrs.mode === "twoWay" || attrs.mode === "oneWay" || attrs.mode === "oneWayToData") {
        bind.mode = attrs.mode;
      }
      if (typeof attrs.format === "string") {
        bind.format = attrs.format;
      }
      if (attrs.placeholder != null) {
        bind.placeholder = attrs.placeholder;
      }

      runs.push({
        type: "text",
        ...(typeof attrs.text === "string" ? { text: attrs.text } : {}),
        bind,
        ...withoutNulls(attrs, TEXT_FORMAT_KEYS),
      } as TextRunLike);
      return;
    }

    if (child.type.name === "wbInlineImage") {
      runs.push({
        type: "inline-image",
        src: String(child.attrs.src ?? ""),
        ...withoutNulls(child.attrs, ["width", "height", "lockAspectRatio", "alt"]),
      } as TextRunLike);
      return;
    }

    diagnostics.push({
      code: "unsupported-run",
      path: childPath,
      severity: "error",
      message: `Inline node "${child.type.name}" has no workbook run equivalent.`,
      raw: child.toJSON(),
    });
  });

  if (runs.length === 0) {
    runs.push({ type: "text", text: "" });
  }

  return runs as MutableParagraph["runs"];
}

interface ConversionContext {
  schema: Schema;
  diagnostics: EditorDiagnostic[];
}

function paragraphFromNode(node: PMNode, path: string, context: ConversionContext): PageBlockDefinition {
  return {
    type: "paragraph",
    ...withoutNulls(node.attrs, [
      "style",
      "visible",
      "alignment",
      "indent",
      "spaceBefore",
      "spaceAfter",
      "lineHeight",
      "comment",
      "renderHints",
    ]),
    runs: paragraphRuns(node, path, context.diagnostics),
  } as PageBlockDefinition;
}

function cellBlocksFromNode(node: PMNode, path: string, context: ConversionContext): PageBlockDefinition[] {
  const blocks: PageBlockDefinition[] = [];

  node.forEach((child, _offset, index) => {
    const block = blockFromNode(child, `${path}[${index}]`, context);
    if (block != null) {
      blocks.push(block);
    }
  });

  return blocks;
}

function tableFromNode(node: PMNode, path: string, context: ConversionContext): PageBlockDefinition {
  let columns: Array<number | string> = [];
  const rows: Array<{ height?: number; cells: Array<Record<string, unknown>> }> = [];

  node.forEach((child, _offset, index) => {
    const childPath = `${path}.children[${index}]`;

    if (child.type.name === "wbTableColgroup") {
      const widths = child.attrs.widths;
      if (!Array.isArray(widths) || widths.length === 0) {
        context.diagnostics.push({
          code: "invalid-table-width",
          path: childPath,
          severity: "error",
          message: "Table colgroup must carry at least one column width.",
          raw: child.toJSON(),
        });
      } else {
        widths.forEach((width, widthIndex) => {
          if (!isMeasurement(width)) {
            context.diagnostics.push({
              code: "invalid-table-width",
              path: `${childPath}.widths[${widthIndex}]`,
              severity: "error",
              message: `Column width must be a positive number (pt) or a percentage string, received ${JSON.stringify(width)}.`,
              raw: width,
            });
          }
        });
        columns = widths as Array<number | string>;
      }
      return;
    }

    if (child.type.name !== "wbTableRow") {
      context.diagnostics.push({
        code: "invalid-node",
        path: childPath,
        severity: "error",
        message: `Table may only contain colgroup and rows; found "${child.type.name}".`,
      });
      return;
    }

    const cells: Array<Record<string, unknown>> = [];
    child.forEach((cell, _cellOffset, cellIndex) => {
      const cellPath = `${path}.rows[${rows.length}].cells[${cellIndex}]`;
      const cellBlock = cellBlocksFromNode(cell, `${cellPath}.content`, context);
      if (cellBlock.length === 0) {
        context.diagnostics.push({
          code: "invalid-node",
          path: cellPath,
          severity: "error",
          message: "A table cell must contain at least one paragraph, image, or list.",
        });
      }
      cells.push({
        ...withoutNulls(cell.attrs, ["colSpan", "rowSpan", "style", "width", "verticalAlign", "comment"]),
        content: cellBlock,
      });
    });

    rows.push({
      ...withoutNulls(child.attrs, ["height"]),
      cells,
    });
  });

  if (columns.length === 0) {
    context.diagnostics.push({
      code: "invalid-table-width",
      path,
      severity: "error",
      message: "Table is missing its column widths.",
    });
  }

  if (rows.length === 0) {
    context.diagnostics.push({
      code: "invalid-node",
      path,
      severity: "error",
      message: "Table must contain at least one row.",
    });
  }

  return {
    type: "table",
    ...withoutNulls(node.attrs, ["style", "visible", "width", "border", "fill", "comment", "renderHints"]),
    columns,
    rows,
  } as unknown as PageBlockDefinition;
}

function listFromNode(node: PMNode, path: string, context: ConversionContext): PageBlockDefinition {
  const items: PageBlockDefinition[][] = [];

  node.forEach((item, _offset, index) => {
    const blocks = cellBlocksFromNode(item, `${path}.items[${index}]`, context);
    if (blocks.length === 0) {
      context.diagnostics.push({
        code: "invalid-node",
        path: `${path}.items[${index}]`,
        severity: "error",
        message: "A list item must contain at least one block.",
      });
    }
    items.push(blocks);
  });

  return {
    type: "list",
    ...withoutNulls(node.attrs, [
      "style",
      "visible",
      "listType",
      "bulletChar",
      "numberFormat",
      "start",
      "comment",
      "renderHints",
    ]),
    items,
  } as PageBlockDefinition;
}

function blockFromNode(node: PMNode, path: string, context: ConversionContext): PageBlockDefinition | null {
  switch (node.type.name) {
    case "wbParagraph":
      return paragraphFromNode(node, path, context);
    case "wbTable":
      return tableFromNode(node, path, context);
    case "wbList":
      return listFromNode(node, path, context);
    case "wbImage":
      if (typeof node.attrs.src !== "string" || node.attrs.src === "") {
        context.diagnostics.push({
          code: "invalid-node",
          path,
          severity: "error",
          message: "Image block is missing its src.",
        });
      }
      return {
        type: "image",
        src: String(node.attrs.src ?? ""),
        ...withoutNulls(node.attrs, [
          "width",
          "height",
          "lockAspectRatio",
          "alignment",
          "alt",
          "comment",
          "renderHints",
        ]),
      } as PageBlockDefinition;
    case "wbPageBreak":
      return {
        type: "page-break",
        ...withoutNulls(node.attrs, ["comment"]),
      } as PageBlockDefinition;
    case "wbSpreadsheet":
      if (node.attrs.sheet == null) {
        context.diagnostics.push({
          code: "invalid-node",
          path,
          severity: "error",
          message: "Spreadsheet block is missing its sheet definition.",
        });
      }
      return {
        type: "spreadsheet",
        sheet: node.attrs.sheet,
        ...withoutNulls(node.attrs, ["comment", "renderHints"]),
      } as PageBlockDefinition;
    case "wbCustom": {
      if (node.attrs.component === "workbook:unsupported" && node.attrs.rawBlock != null) {
        return node.attrs.rawBlock as PageBlockDefinition;
      }

      if (typeof node.attrs.component !== "string" || node.attrs.component === "") {
        context.diagnostics.push({
          code: "invalid-node",
          path,
          severity: "error",
          message: "Custom block is missing its component id.",
        });
      }

      return {
        type: "custom",
        component: String(node.attrs.component ?? ""),
        ...withoutNulls(node.attrs, ["visible", "props", "comment", "renderHints"]),
      } as PageBlockDefinition;
    }
    default:
      context.diagnostics.push({
        code: "unsupported-block",
        path,
        severity: "error",
        message: `Block node "${node.type.name}" has no workbook equivalent.`,
        raw: node.toJSON(),
      });
      return null;
  }
}

function validateOrThrow(
  view: PageViewDefinition,
  diagnostics: EditorDiagnostic[],
  options: FromProseMirrorOptions,
): void {
  const blocking = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (blocking.length > 0) {
    throw new EditorSerializationError(`Cannot save the document: ${blocking[0].message}`, diagnostics);
  }

  const workbook = {
    kind: "workbook",
    schemaVersion: "4.1.1",
    data: {},
    views: [view],
  } as unknown as WorkbookDefinition;

  const validation = (options.validate ?? validateWorkbookDocument)(workbook);
  if (!validation.valid) {
    const messages = validation.errors.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
    const validationDiagnostics: EditorDiagnostic[] = messages.map((message) => ({
      code: "invalid-node",
      path: "content",
      severity: "error",
      message,
    }));
    throw new EditorSerializationError(`Cannot save the document: schema validation failed (${messages.join("; ")}).`, [
      ...diagnostics,
      ...validationDiagnostics,
    ]);
  }
}

export function fromProseMirror(
  doc: PMNode,
  base: PageViewDefinition,
  options: FromProseMirrorOptions = {},
): FromProseMirrorResult {
  const schema = options.schema ?? doc.type.schema ?? editorSchema;
  if (doc.type.name !== "doc") {
    throw new EditorSerializationError("Cannot save the document: the root node is not a wb document.", [
      { code: "invalid-node", path: "", severity: "error", message: "Expected a doc node." },
    ]);
  }

  const diagnostics: EditorDiagnostic[] = [];
  const content = cellBlocksFromNode(doc, "content", { schema, diagnostics });
  const view: PageViewDefinition = { ...base, content };

  validateOrThrow(view, diagnostics, options);

  return { view, diagnostics };
}
