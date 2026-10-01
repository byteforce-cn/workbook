import { resolveBindValue } from "../../core/bind/resolveBind";
import { evaluateBooleanLike } from "../../core/condition/evaluate";
import type { PageBlockDefinition, PageViewDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { pluginRegistry, type WorkbookPluginRegistry } from "../../react/registry";
import type { createStyleCatalogResolver } from "../../styles/catalog";

const BLOCK_GAP = 16;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_LINE_HEIGHT = 1.4;
const DEFAULT_TABLE_ROW_HEIGHT = 40;
const DEFAULT_LIST_ITEM_HEIGHT = 28;
const OVERLAY_GAP = 8;
const HEADER_Y = 24;
const HEADER_BLOCK_HEIGHT = 24;
const FOOTER_Y_FROM_BOTTOM = 56;

type FlowBlockDefinition = Exclude<
  PageBlockDefinition,
  Extract<PageBlockDefinition, { type: "header" | "footer" | "watermark" | "floating" | "page-break" }>
>;
type ParagraphBlockDefinition = Extract<PageBlockDefinition, { type: "paragraph" }>;
type TableBlockDefinition = Extract<PageBlockDefinition, { type: "table" }>;
type ListBlockDefinition = Extract<PageBlockDefinition, { type: "list" }>;

export type PageLayoutStyleResolver = ReturnType<typeof createStyleCatalogResolver>;

export interface PageLayoutOptions {
  data?: WorkbookData;
  registry?: WorkbookPluginRegistry;
  styleResolver?: PageLayoutStyleResolver;
}

interface ResolvedPageLayoutOptions {
  data: WorkbookData;
  registry: WorkbookPluginRegistry;
  styleResolver?: PageLayoutStyleResolver;
}

export interface PageLayoutBlock<TBlock extends PageBlockDefinition = PageBlockDefinition> {
  block: TBlock;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayoutPage {
  pageIndex: number;
  pageNumber: number;
  width: number;
  height: number;
  contentLeft: number;
  contentTop: number;
  contentBottom: number;
  contentWidth: number;
  flowBlocks: Array<PageLayoutBlock<FlowBlockDefinition>>;
  headerBlocks: Array<PageLayoutBlock<Extract<PageBlockDefinition, { type: "header" }>>>;
  footerBlocks: Array<PageLayoutBlock<Extract<PageBlockDefinition, { type: "footer" }>>>;
  watermarkBlocks: Array<PageLayoutBlock<Extract<PageBlockDefinition, { type: "watermark" }>>>;
  floatingBlocks: Array<PageLayoutBlock<Extract<PageBlockDefinition, { type: "floating" }>>>;
}

export interface PageLayoutResult {
  pages: PageLayoutPage[];
}

function readNumericRenderHint(block: { renderHints?: Record<string, unknown> }, key: string): number | undefined {
  const value = block.renderHints?.[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function resolveOptions(options: PageLayoutOptions): ResolvedPageLayoutOptions {
  return {
    data: options.data ?? {},
    registry: options.registry ?? pluginRegistry,
    styleResolver: options.styleResolver,
  };
}

function readNumericStyleValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveParagraphStyle(
  block: ParagraphBlockDefinition,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
) {
  return options.styleResolver?.resolveParagraphStyle(block.style, options.data, rowContext) ?? {};
}

function resolveListStyle(
  block: ListBlockDefinition,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
) {
  return options.styleResolver?.resolveListStyle(block.style, options.data, rowContext) ?? {};
}

function readRunFontSize(
  run: ParagraphBlockDefinition["runs"][number],
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
): number | undefined {
  if (run.type !== "text") {
    return undefined;
  }

  if (run.fontSize != null) {
    return run.fontSize;
  }

  return readNumericStyleValue(
    options.styleResolver?.resolveCharacterStyle(run.style, options.data, rowContext).fontSize,
    NaN,
  );
}

function readFontSize(
  view: PageViewDefinition,
  block: ParagraphBlockDefinition | ListBlockDefinition | undefined,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
) {
  const baseFontSize = view.pageSettings.defaultFontSize ?? DEFAULT_FONT_SIZE;

  if (block != null && "runs" in block) {
    const style = resolveParagraphStyle(block, options, rowContext);
    const paragraphFontSize = readNumericStyleValue(style.fontSize, baseFontSize);
    const runFontSize = block.runs.reduce(
      (fontSize, run) => Math.max(fontSize, readRunFontSize(run, options, rowContext) ?? 0),
      0,
    );
    return Math.max(paragraphFontSize, runFontSize || paragraphFontSize);
  }

  if (block != null) {
    return readNumericStyleValue(resolveListStyle(block, options, rowContext).fontSize, baseFontSize);
  }

  return baseFontSize;
}

function readLineHeight(
  view: PageViewDefinition,
  block: ParagraphBlockDefinition,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
) {
  const style = resolveParagraphStyle(block, options, rowContext);
  return (
    block.lineHeight ??
    readNumericStyleValue(style.lineHeight, view.pageSettings.defaultLineHeight ?? DEFAULT_LINE_HEIGHT)
  );
}

function readParagraphSpacing(
  block: ParagraphBlockDefinition,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
) {
  const style = resolveParagraphStyle(block, options, rowContext);
  return {
    indent: block.indent ?? readNumericStyleValue(style.indent, 0),
    spaceBefore: block.spaceBefore ?? readNumericStyleValue(style.spaceBefore, 0),
    spaceAfter: block.spaceAfter ?? readNumericStyleValue(style.spaceAfter, 0),
  };
}

function resolveRunText(
  block: ParagraphBlockDefinition,
  options: ResolvedPageLayoutOptions,
  rowContext?: WorkbookRowContext,
): string {
  return block.runs
    .map((run) => {
      if (run.type === "break") {
        return "\n";
      }

      if (run.type === "inline-image") {
        return run.alt ?? " ";
      }

      if (run.bind != null) {
        return String(resolveBindValue(run.bind, options.data, rowContext) ?? run.text ?? "");
      }

      return run.text ?? "";
    })
    .join("");
}

/** 全角 / CJK 字符按 1.1em 计宽，半角 / ASCII 按 0.55em 计宽（接近浏览器实际排版，宁可略宽避免行数低估） */
function isWideChar(ch: string): boolean {
  return /[\u1100-\u11ff\u2e80-\u303f\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uff60\uffe0-\uffe6]/.test(
    ch,
  );
}

function textWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    width += isWideChar(ch) ? fontSize * 1.1 : fontSize * 0.55;
  }
  return width;
}

function wrapText(text: string, width: number, fontSize: number): string[] {
  const maxWidth = Math.max(1, width);
  const lines: string[] = [];

  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    let currentLine = "";
    let currentWidth = 0;

    for (const word of words.length === 0 ? [""] : words) {
      const wordWidth = textWidth(word, fontSize);

      // 单词本身超宽：按字符实际宽度硬切
      if (wordWidth > maxWidth) {
        if (currentLine !== "") {
          lines.push(currentLine);
          currentLine = "";
          currentWidth = 0;
        }
        let segment = "";
        let segmentWidth = 0;
        for (const ch of word) {
          const chWidth = isWideChar(ch) ? fontSize * 1.1 : fontSize * 0.55;
          if (segmentWidth + chWidth > maxWidth && segment !== "") {
            lines.push(segment);
            segment = "";
            segmentWidth = 0;
          }
          segment += ch;
          segmentWidth += chWidth;
        }
        currentLine = segment;
        currentWidth = segmentWidth;
        continue;
      }

      // 单词间空格按 0.55em 计
      const separatorWidth = currentLine === "" ? 0 : fontSize * 0.55;
      if (currentLine !== "" && currentWidth + separatorWidth + wordWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
        currentWidth = wordWidth;
      } else {
        currentLine = currentLine === "" ? word : `${currentLine} ${word}`;
        currentWidth += separatorWidth + wordWidth;
      }
    }

    if (currentLine !== "") {
      lines.push(currentLine);
    }
  }

  return lines.length === 0 ? [""] : lines;
}

function measureParagraphHeight(
  view: PageViewDefinition,
  block: ParagraphBlockDefinition,
  width: number,
  options: ResolvedPageLayoutOptions,
): number {
  const hintedHeight = readNumericRenderHint(block, "height");
  if (hintedHeight != null) {
    return hintedHeight;
  }

  const fontSize = readFontSize(view, block, options);
  const lineHeight = fontSize * readLineHeight(view, block, options);
  const spacing = readParagraphSpacing(block, options);
  const lines = wrapText(resolveRunText(block, options), width - spacing.indent, fontSize);
  // 段落实际渲染高度 = 行数 × 行高 + 段前段后距（浏览器 line-height 即按此计算）。
  // 固定 24px 下限对 10.5px/1.6 行高的内容会整体高估，导致表格单元格与段落后留白。
  return Math.max(lineHeight, lines.length * lineHeight + spacing.spaceBefore + spacing.spaceAfter);
}

function createTextParagraph(source: ParagraphBlockDefinition, text: string): ParagraphBlockDefinition {
  return {
    ...source,
    runs: [{ type: "text", text }],
  };
}

function splitParagraph(
  view: PageViewDefinition,
  block: ParagraphBlockDefinition,
  width: number,
  availableHeight: number,
  options: ResolvedPageLayoutOptions,
) {
  const fontSize = readFontSize(view, block, options);
  const lineHeight = fontSize * readLineHeight(view, block, options);
  const spacing = readParagraphSpacing(block, options);
  const verticalSpace = spacing.spaceBefore + spacing.spaceAfter;
  const maxLines = Math.floor(Math.max(0, availableHeight - verticalSpace) / lineHeight);
  if (maxLines <= 0) {
    return undefined;
  }

  const lines = wrapText(resolveRunText(block, options), width - spacing.indent, fontSize);
  if (lines.length <= maxLines) {
    return undefined;
  }

  const head = createTextParagraph(block, lines.slice(0, maxLines).join(" "));
  const tail = createTextParagraph(block, lines.slice(maxLines).join(" "));

  return {
    head,
    tail,
    height: measureParagraphHeight(view, head, width, options),
  };
}

type PageCellBlock = TableBlockDefinition["rows"][number]["cells"][number]["content"][number];

function measurePageCellBlocks(
  view: PageViewDefinition,
  blocks: PageCellBlock[],
  width: number,
  options: ResolvedPageLayoutOptions,
): number {
  return blocks.reduce((height, block) => {
    if (block.type === "paragraph") {
      return height + measureParagraphHeight(view, block, width, options);
    }

    if (block.type === "image") {
      return height + (block.height ?? readNumericRenderHint(block, "height") ?? 80);
    }

    return height + measureListHeight(view, block, width, options);
  }, 0);
}

function measureTableRowHeight(
  view: PageViewDefinition,
  table: TableBlockDefinition,
  row: TableBlockDefinition["rows"][number],
  width: number,
  options: ResolvedPageLayoutOptions,
): number {
  const tableStyle = options.styleResolver?.resolveTableStyle(table.style, options.data) ?? {};
  const cellPadding = readNumericStyleValue(tableStyle.cellPadding, 8);
  const declaredWidths = table.columns.map((w) => (typeof w === "number" && w > 0 ? w : 0));
  const totalDeclared = declaredWidths.reduce((sum, w) => sum + w, 0) || width;
  // 单元格实际渲染宽度 ≈ 声明列宽 ×（内容宽 / 声明列宽总和）：浏览器按该比例缩放列。
  // 按等分列宽（baseCellWidth）测量会让宽列（如 176px 明细描述列）被当成 ~60px，
  // 高估换行行数，导致行高虚高、表格下方留白。
  const renderedCellWidth = (cellIndex: number, colSpan: number) => {
    const spanWidth = declaredWidths.slice(cellIndex, cellIndex + colSpan).reduce((sum, w) => sum + w, 0);
    return (spanWidth / totalDeclared) * width;
  };
  const contentHeight = row.cells.reduce((maxHeight, cell, cellIndex) => {
    // 文本可用宽度 = 列宽 - 左右内边距（浏览器 td padding 占用列宽）
    const cellWidth = Math.max(1, renderedCellWidth(cellIndex, Math.max(1, cell.colSpan ?? 1)) - cellPadding * 2);
    return Math.max(maxHeight, measurePageCellBlocks(view, cell.content, cellWidth, options));
  }, 0);
  const contentMinHeight = contentHeight + cellPadding * 2;

  // The declared row height is a minimum: the browser grows the row whenever
  // content + cell padding exceeds it. Mirror that here so the allocated page
  // height never clips the last row's bottom border.
  return row.height == null
    ? Math.max(DEFAULT_TABLE_ROW_HEIGHT, contentMinHeight)
    : Math.max(row.height, contentMinHeight);
}

function measureTableBorderBottom(block: TableBlockDefinition, options: ResolvedPageLayoutOptions): number {
  const tableStyle = options.styleResolver?.resolveTableStyle(block.style, options.data) ?? {};
  const border = block.border ?? {};
  if (border.style === "none") {
    return 0;
  }

  return border.style === "thick" ? 3 : border.style === "medium" ? 2 : Number(tableStyle.borderWidth ?? 1);
}

function measureTableHeight(
  view: PageViewDefinition,
  block: TableBlockDefinition,
  width: number,
  options: ResolvedPageLayoutOptions,
): number {
  const hintedHeight = readNumericRenderHint(block, "height");
  if (hintedHeight != null) {
    return hintedHeight;
  }

  // With border-collapse the outer border is included in the table's rendered
  // box; reserve it so the foreignObject never clips the bottom border.
  return (
    block.rows.reduce((height, row) => height + measureTableRowHeight(view, block, row, width, options), 0) +
    measureTableBorderBottom(block, options)
  );
}

function splitTable(
  view: PageViewDefinition,
  block: TableBlockDefinition,
  width: number,
  availableHeight: number,
  options: ResolvedPageLayoutOptions,
) {
  let accumulatedHeight = 0;
  let rowCount = 0;

  for (const row of block.rows) {
    const rowHeight = measureTableRowHeight(view, block, row, width, options);
    if (accumulatedHeight + rowHeight > availableHeight && rowCount > 0) {
      break;
    }
    if (accumulatedHeight + rowHeight > availableHeight) {
      return undefined;
    }
    accumulatedHeight += rowHeight;
    rowCount += 1;
  }

  if (rowCount === 0 || rowCount >= block.rows.length) {
    return undefined;
  }

  const head = { ...block, rows: block.rows.slice(0, rowCount) as TableBlockDefinition["rows"] };
  const tail = { ...block, rows: block.rows.slice(rowCount) as TableBlockDefinition["rows"] };
  return {
    head,
    tail,
    // Include the outer bottom border so the head block's foreignObject does
    // not clip the last rendered row's bottom border.
    height: accumulatedHeight + measureTableBorderBottom(head, options),
  };
}

function measureListItemHeight(
  view: PageViewDefinition,
  item: ListBlockDefinition["items"][number],
  width: number,
  options: ResolvedPageLayoutOptions,
) {
  return Math.max(DEFAULT_LIST_ITEM_HEIGHT, measurePageCellBlocks(view, item, width, options));
}

function measureListHeight(
  view: PageViewDefinition,
  block: ListBlockDefinition,
  width: number,
  options: ResolvedPageLayoutOptions,
): number {
  const hintedHeight = readNumericRenderHint(block, "height");
  if (hintedHeight != null) {
    return hintedHeight;
  }

  const listStyle = resolveListStyle(block, options);
  const indent = readNumericStyleValue(listStyle.indent, 0);
  const spaceBefore = readNumericStyleValue(listStyle.spaceBefore, 0);
  const spaceAfter = readNumericStyleValue(listStyle.spaceAfter, 0);
  return (
    block.items.reduce((height, item) => height + measureListItemHeight(view, item, width - indent, options), 0) +
    8 +
    spaceBefore +
    spaceAfter
  );
}

function splitList(
  view: PageViewDefinition,
  block: ListBlockDefinition,
  width: number,
  availableHeight: number,
  options: ResolvedPageLayoutOptions,
) {
  const listStyle = resolveListStyle(block, options);
  const indent = readNumericStyleValue(listStyle.indent, 0);
  const spaceBefore = readNumericStyleValue(listStyle.spaceBefore, 0);
  const spaceAfter = readNumericStyleValue(listStyle.spaceAfter, 0);
  let accumulatedHeight = 8 + spaceBefore + spaceAfter;
  let itemCount = 0;

  for (const item of block.items) {
    const itemHeight = measureListItemHeight(view, item, width - indent, options);
    if (accumulatedHeight + itemHeight > availableHeight && itemCount > 0) {
      break;
    }
    if (accumulatedHeight + itemHeight > availableHeight) {
      return undefined;
    }
    accumulatedHeight += itemHeight;
    itemCount += 1;
  }

  if (itemCount === 0 || itemCount >= block.items.length) {
    return undefined;
  }

  return {
    head: { ...block, items: block.items.slice(0, itemCount) as ListBlockDefinition["items"] },
    tail: { ...block, items: block.items.slice(itemCount) as ListBlockDefinition["items"] },
    height: accumulatedHeight,
  };
}

export function measurePageBlockHeight(
  view: PageViewDefinition,
  block: FlowBlockDefinition,
  width: number,
  options: PageLayoutOptions = {},
): number {
  const resolvedOptions = resolveOptions(options);

  switch (block.type) {
    case "paragraph":
      return measureParagraphHeight(view, block, width, resolvedOptions);
    case "table":
      return measureTableHeight(view, block, width, resolvedOptions);
    case "image":
      return block.height ?? readNumericRenderHint(block, "height") ?? 160;
    case "list":
      return measureListHeight(view, block, width, resolvedOptions);
    case "spreadsheet":
      return readNumericRenderHint(block, "height") ?? 220;
    default:
      return 0;
  }
}

function splitBlockToFit(
  view: PageViewDefinition,
  block: FlowBlockDefinition,
  width: number,
  availableHeight: number,
  options: ResolvedPageLayoutOptions,
) {
  switch (block.type) {
    case "paragraph":
      return splitParagraph(view, block, width, availableHeight, options);
    case "table":
      return splitTable(view, block, width, availableHeight, options);
    case "list":
      return splitList(view, block, width, availableHeight, options);
    default:
      return undefined;
  }
}

function shouldRenderHeaderFooter(
  block: Extract<PageBlockDefinition, { type: "header" | "footer" }>,
  pageIndex: number,
) {
  const pageNumber = pageIndex + 1;
  const isFirstPage = pageNumber === 1;
  const isOddPage = pageNumber % 2 === 1;
  const isEvenPage = !isOddPage;

  if (block.showOnFirstPage != null && block.showOnFirstPage !== isFirstPage) {
    return false;
  }

  if (block.showOnOddPages != null && block.showOnOddPages !== isOddPage) {
    return false;
  }

  if (block.showOnEvenPages != null && block.showOnEvenPages !== isEvenPage) {
    return false;
  }

  return true;
}

function dedupeBlocks<TBlock extends PageBlockDefinition>(blocks: TBlock[]): TBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = JSON.stringify(block);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countOverlayBlocks<TBlock extends PageBlockDefinition>(
  view: PageViewDefinition,
  type: TBlock["type"],
): number {
  return dedupeBlocks(view.content.filter((block): block is TBlock => block.type === type)).length;
}

function createPage(view: PageViewDefinition, pageIndex: number): PageLayoutPage {
  const width = view.pageSettings.width;
  const height = view.pageSettings.height;
  const contentLeft = view.pageSettings.marginLeft ?? 90;
  const headerCount = countOverlayBlocks<Extract<PageBlockDefinition, { type: "header" }>>(view, "header");
  const footerCount = countOverlayBlocks<Extract<PageBlockDefinition, { type: "footer" }>>(view, "footer");
  const reservedHeaderBottom = headerCount === 0 ? 0 : HEADER_Y + headerCount * HEADER_BLOCK_HEIGHT + OVERLAY_GAP;
  const reservedFooterTop = footerCount === 0 ? height : height - FOOTER_Y_FROM_BOTTOM - OVERLAY_GAP;
  const contentTop = Math.max(view.pageSettings.marginTop ?? 72, reservedHeaderBottom);
  const contentBottom = Math.min(height - (view.pageSettings.marginBottom ?? 72), reservedFooterTop);
  const contentWidth = width - contentLeft - (view.pageSettings.marginRight ?? 90);

  return {
    pageIndex,
    pageNumber: pageIndex + 1,
    width,
    height,
    contentLeft,
    contentTop,
    contentBottom,
    contentWidth,
    flowBlocks: [],
    headerBlocks: [],
    footerBlocks: [],
    watermarkBlocks: [],
    floatingBlocks: [],
  };
}

function attachOverlayBlocks(view: PageViewDefinition, pages: PageLayoutPage[]) {
  const headerBlocks = dedupeBlocks(
    view.content.filter((block): block is Extract<PageBlockDefinition, { type: "header" }> => block.type === "header"),
  );
  const footerBlocks = dedupeBlocks(
    view.content.filter((block): block is Extract<PageBlockDefinition, { type: "footer" }> => block.type === "footer"),
  );
  const watermarkBlocks = dedupeBlocks(
    view.content.filter(
      (block): block is Extract<PageBlockDefinition, { type: "watermark" }> => block.type === "watermark",
    ),
  );
  const floatingBlocks = dedupeBlocks(
    view.content.filter(
      (block): block is Extract<PageBlockDefinition, { type: "floating" }> => block.type === "floating",
    ),
  );

  for (const page of pages) {
    page.headerBlocks = headerBlocks
      .filter((block) => shouldRenderHeaderFooter(block, page.pageIndex))
      .map((block, index) => ({
        block,
        x: page.contentLeft,
        y: 24 + index * 24,
        width: page.contentWidth,
        height: 24,
      }));
    page.footerBlocks = footerBlocks
      .filter((block) => shouldRenderHeaderFooter(block, page.pageIndex))
      .map((block, index) => ({
        block,
        x: page.contentLeft,
        y: page.height - 56 + index * 20,
        width: page.contentWidth,
        height: 20,
      }));
    page.watermarkBlocks = watermarkBlocks.map((block) => ({
      block,
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    }));
    page.floatingBlocks = floatingBlocks.map((block) => ({
      block,
      x: 0,
      y: 0,
      width: page.contentWidth,
      height: page.height,
    }));
  }
}

function isFlowBlock(block: PageBlockDefinition): block is FlowBlockDefinition {
  return !["header", "footer", "watermark", "floating", "page-break"].includes(block.type);
}

export function layoutPageView(view: PageViewDefinition, options: PageLayoutOptions = {}): PageLayoutResult {
  const resolvedOptions = resolveOptions(options);
  const pages: PageLayoutPage[] = [createPage(view, 0)];
  let currentPage = pages[0];
  let cursorY = currentPage.contentTop;

  function pushPage() {
    currentPage = createPage(view, pages.length);
    pages.push(currentPage);
    cursorY = currentPage.contentTop;
  }

  function placeBlock(block: FlowBlockDefinition, height: number) {
    currentPage.flowBlocks.push({
      block,
      x: currentPage.contentLeft,
      y: cursorY,
      width: currentPage.contentWidth,
      height,
    });
    cursorY += height + BLOCK_GAP;
  }

  for (const originalBlock of view.content) {
    if (originalBlock.type === "page-break") {
      if (currentPage.flowBlocks.length > 0) {
        pushPage();
      }
      continue;
    }

    if (!isFlowBlock(originalBlock)) {
      continue;
    }

    if (
      !evaluateBooleanLike(
        "visible" in originalBlock ? originalBlock.visible : undefined,
        resolvedOptions.data,
        resolvedOptions.registry,
        true,
      )
    ) {
      continue;
    }

    let block: FlowBlockDefinition | undefined = originalBlock;
    while (block != null) {
      const availableHeight = currentPage.contentBottom - cursorY;
      const blockHeight = measurePageBlockHeight(view, block, currentPage.contentWidth, resolvedOptions);

      if (blockHeight <= availableHeight) {
        placeBlock(block, blockHeight);
        block = undefined;
        continue;
      }

      const split = splitBlockToFit(view, block, currentPage.contentWidth, availableHeight, resolvedOptions);
      if (split != null) {
        placeBlock(split.head as FlowBlockDefinition, split.height);
        pushPage();
        block = split.tail as FlowBlockDefinition;
        continue;
      }

      if (cursorY === currentPage.contentTop) {
        placeBlock(block, Math.min(blockHeight, currentPage.contentBottom - cursorY));
        block = undefined;
        continue;
      }

      pushPage();
    }
  }

  attachOverlayBlocks(view, pages);
  return { pages };
}
