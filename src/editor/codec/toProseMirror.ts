/**
 * PageView → ProseMirror projection.
 *
 * Out-of-flow blocks (header/footer/watermark/floating) never enter the main
 * document: they produce an `out-of-flow` diagnostic and are handled by the
 * panel state in E8.
 */

import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { PageBlockDefinition, PageViewDefinition, WorkbookStyleCatalog } from "../../core/types";
import type { TextRun } from "../../schema/generated-types";
import { editorSchema } from "../schema/extensions";
import type { EditorDiagnostic } from "./diagnostics";

export interface ToProseMirrorOptions {
  schema?: Schema;
  styles?: WorkbookStyleCatalog;
  /** Registered page-block plugin ids; used to warn about unregistered `custom` blocks. */
  registeredComponents?: Iterable<string>;
}

export interface ToProseMirrorResult {
  doc: PMNode | null;
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

type ParagraphBlock = Extract<PageBlockDefinition, { type: "paragraph" }>;
type TableBlock = Extract<PageBlockDefinition, { type: "table" }>;
type ListBlock = Extract<PageBlockDefinition, { type: "list" }>;
type CellBlock = TableBlock["rows"][number]["cells"][number]["content"][number];

function compactAttrs(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined));
}

function runFormatAttrs(run: TextRun): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const key of TEXT_FORMAT_KEYS) {
    const value = run[key];
    if (value !== undefined) {
      attrs[key] = value;
    }
  }
  return attrs;
}

function styleDiagnostic(
  catalog: WorkbookStyleCatalog | undefined,
  styleId: string | undefined,
  group: "paragraphStyles" | "characterStyles" | "tableStyles" | "cellStyles" | "listStyles",
  path: string,
  diagnostics: EditorDiagnostic[],
): void {
  if (styleId == null || catalog?.[group] == null) {
    return;
  }

  if (catalog[group]?.[styleId] == null) {
    diagnostics.push({
      code: "style-not-found",
      path,
      severity: "warning",
      message: `Style "${styleId}" is not defined in styles.${group}.`,
      raw: styleId,
    });
  }
}

function inlineContent(
  paragraph: ParagraphBlock,
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  styles?: WorkbookStyleCatalog,
): PMNode[] {
  const nodes: PMNode[] = [];
  const textMarkType = schema.marks.wbText;

  paragraph.runs.forEach((run, runIndex) => {
    const runPath = `${path}.runs[${runIndex}]`;

    if (run.type === "break") {
      nodes.push(schema.nodes.hardBreak.create());
      return;
    }

    if (run.type === "inline-image") {
      nodes.push(
        schema.nodes.wbInlineImage.create(
          compactAttrs({
            src: run.src,
            width: run.width,
            height: run.height,
            lockAspectRatio: run.lockAspectRatio,
            alt: run.alt,
          }),
        ),
      );
      return;
    }

    styleDiagnostic(styles, run.style, "characterStyles", runPath, diagnostics);
    const formatAttrs = runFormatAttrs(run);

    if (run.bind != null) {
      nodes.push(
        schema.nodes.wbBind.create(
          compactAttrs({
            path: run.bind.path,
            placeholder: run.bind.placeholder,
            format: run.bind.format,
            mode: run.bind.mode,
            text: run.text,
            ...formatAttrs,
          }),
        ),
      );
      return;
    }

    if (run.text == null || run.text === "") {
      return;
    }

    const mark = textMarkType.create(formatAttrs);
    const previous = nodes[nodes.length - 1];
    if (previous != null && previous.isText) {
      const previousWbMark = previous.marks.find((candidate) => candidate.type.name === "wbText");
      if (previousWbMark != null && JSON.stringify(previousWbMark.attrs) === JSON.stringify(mark.attrs)) {
        nodes[nodes.length - 1] = schema.text(`${previous.text ?? ""}${run.text}`, previous.marks);
        return;
      }
    }
    nodes.push(schema.text(run.text, [mark]));
  });

  return nodes;
}

function cellBlocks(
  blocks: CellBlock[],
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  options: ResolvedToOptions,
): PMNode[] {
  return blocks
    .map((block, index) => blockToNode(block, `${path}[${index}]`, schema, diagnostics, options, true))
    .filter((node): node is PMNode => node != null);
}

function paragraphNode(
  block: ParagraphBlock,
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  options: ResolvedToOptions,
): PMNode {
  styleDiagnostic(options.styles, block.style, "paragraphStyles", path, diagnostics);
  return schema.nodes.wbParagraph.create(
    compactAttrs({
      style: block.style,
      visible: block.visible,
      alignment: block.alignment,
      indent: block.indent,
      spaceBefore: block.spaceBefore,
      spaceAfter: block.spaceAfter,
      lineHeight: block.lineHeight,
      comment: block.comment,
      renderHints: block.renderHints,
    }),
    inlineContent(block, path, schema, diagnostics, options.styles),
  );
}

function tableNode(
  block: TableBlock,
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  options: ResolvedToOptions,
): PMNode {
  styleDiagnostic(options.styles, block.style, "tableStyles", path, diagnostics);

  const rows = block.rows.map((row, rowIndex) => {
    const cells = row.cells.map((cell, cellIndex) => {
      styleDiagnostic(
        options.styles,
        cell.style,
        "cellStyles",
        `${path}.rows[${rowIndex}].cells[${cellIndex}]`,
        diagnostics,
      );
      return schema.nodes.wbTableCell.create(
        compactAttrs({
          colSpan: cell.colSpan,
          rowSpan: cell.rowSpan,
          style: cell.style,
          width: cell.width,
          verticalAlign: cell.verticalAlign,
          comment: cell.comment,
        }),
        cellBlocks(cell.content, `${path}.rows[${rowIndex}].cells[${cellIndex}].content`, schema, diagnostics, options),
      );
    });

    return schema.nodes.wbTableRow.create(compactAttrs({ height: row.height }), cells);
  });

  const content: PMNode[] = [];
  if (block.columns.length > 0) {
    content.push(schema.nodes.wbTableColgroup.create({ widths: [...block.columns] }));
  }
  content.push(...rows);

  return schema.nodes.wbTable.create(
    compactAttrs({
      style: block.style,
      visible: block.visible,
      width: block.width,
      border: block.border,
      fill: block.fill,
      comment: block.comment,
      renderHints: block.renderHints,
    }),
    content,
  );
}

function listNode(
  block: ListBlock,
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  options: ResolvedToOptions,
): PMNode {
  styleDiagnostic(options.styles, block.style, "listStyles", path, diagnostics);

  const items = block.items.map((itemBlocks, itemIndex) =>
    schema.nodes.wbListItem.create(
      null,
      cellBlocks(itemBlocks, `${path}.items[${itemIndex}]`, schema, diagnostics, options),
    ),
  );

  return schema.nodes.wbList.create(
    compactAttrs({
      style: block.style,
      visible: block.visible,
      listType: block.listType,
      bulletChar: block.bulletChar,
      numberFormat: block.numberFormat,
      start: block.start,
      comment: block.comment,
      renderHints: block.renderHints,
    }),
    items,
  );
}

interface ResolvedToOptions {
  styles?: WorkbookStyleCatalog;
  registeredComponents?: Set<string>;
}

function blockToNode(
  block: PageBlockDefinition,
  path: string,
  schema: Schema,
  diagnostics: EditorDiagnostic[],
  options: ResolvedToOptions,
  insideCell = false,
): PMNode | null {
  switch (block.type) {
    case "paragraph":
      return paragraphNode(block, path, schema, diagnostics, options);
    case "table":
      return tableNode(block, path, schema, diagnostics, options);
    case "list":
      return listNode(block, path, schema, diagnostics, options);
    case "image":
      return schema.nodes.wbImage.create(
        compactAttrs({
          src: block.src,
          width: block.width,
          height: block.height,
          lockAspectRatio: block.lockAspectRatio,
          alignment: block.alignment,
          alt: block.alt,
          comment: block.comment,
          renderHints: block.renderHints,
        }),
      );
    case "page-break":
      return schema.nodes.wbPageBreak.create(compactAttrs({ comment: block.comment }));
    case "spreadsheet":
      return schema.nodes.wbSpreadsheet.create(
        compactAttrs({
          sheet: block.sheet,
          comment: block.comment,
          renderHints: block.renderHints,
        }),
      );
    case "custom": {
      if (options.registeredComponents != null && !options.registeredComponents.has(block.component)) {
        diagnostics.push({
          code: "unsupported-block",
          path,
          severity: "warning",
          message: `Custom page block "${block.component}" is not registered; it is preserved but renders nothing.`,
          raw: block,
        });
      }
      return schema.nodes.wbCustom.create(
        compactAttrs({
          component: block.component,
          props: block.props,
          visible: block.visible,
          comment: block.comment,
          renderHints: block.renderHints,
        }),
      );
    }
    case "header":
    case "footer":
    case "watermark":
    case "floating":
      diagnostics.push({
        code: "out-of-flow",
        path,
        severity: "warning",
        message: `${block.type} blocks are edited in the out-of-flow panels, not in the main flow.`,
        raw: block,
      });
      return null;
    default: {
      const unknownBlock: unknown = block;
      const typeName =
        typeof unknownBlock === "object" && unknownBlock != null && "type" in unknownBlock
          ? String(unknownBlock.type)
          : "unknown";
      diagnostics.push({
        code: "unsupported-block",
        path,
        severity: insideCell ? "error" : "warning",
        message: `Block type "${typeName}" is not supported by the editor projection; the raw block is preserved.`,
        raw: block,
      });
      return insideCell
        ? null
        : schema.nodes.wbCustom.create({
            component: "workbook:unsupported",
            rawBlock: block,
          });
    }
  }
}

export function toProseMirror(view: PageViewDefinition, options: ToProseMirrorOptions = {}): ToProseMirrorResult {
  const schema = options.schema ?? editorSchema;
  const diagnostics: EditorDiagnostic[] = [];
  const resolved: ResolvedToOptions = {
    styles: options.styles,
    registeredComponents: options.registeredComponents == null ? undefined : new Set(options.registeredComponents),
  };

  const content = view.content
    .map((block, index) => blockToNode(block, `content[${index}]`, schema, diagnostics, resolved))
    .filter((node): node is PMNode => node != null);

  if (content.length === 0) {
    diagnostics.push({
      code: "unsupported-block",
      path: "content",
      severity: "error",
      message: "The page has no editable flow blocks.",
    });
    return { doc: null, diagnostics };
  }

  return {
    doc: schema.nodes.doc.create(null, content),
    diagnostics,
  };
}
