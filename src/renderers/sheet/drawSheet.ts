import type { SheetCellDefinition, SheetColumnDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import type { Border } from "../../schema/generated-types";
import { resolveSheetCellDisplayValue, type SheetFormulaContext } from "./cellRenderer";

export interface DrawSheetRow {
  row: {
    height?: number;
    hidden?: boolean;
    style?: string;
    cells?: SheetCellDefinition[];
  };
  rowContext?: WorkbookRowContext;
}

export interface DrawSheetOptions {
  canvas: HTMLCanvasElement;
  columns: SheetColumnDefinition[];
  rows: DrawSheetRow[];
  data: WorkbookData;
  defaultColumnWidth?: number;
  defaultRowHeight?: number;
  frozenRows?: number;
  frozenCols?: number;
  rowStart?: number;
  rowEnd?: number;
  columnStart?: number;
  columnEnd?: number;
  backgroundColor?: string;
  /**
   * Stretch-to-fit target width (CSS px). When set and larger than the natural
   * total column width, the extra space is distributed to stretchable columns
   * (respecting per-column maxWidth) so the sheet fills the container. When the
   * sheet is already wider, natural widths are kept. See sheetView.widthMode.
   */
  fitWidth?: number;
  styleResolver?: {
    resolveCellStyle(
      styleName: string | undefined,
      data: WorkbookData,
      rowContext?: WorkbookRowContext,
    ): Record<string, unknown>;
  };
}

/**
 * 浏览器 Canvas backing store 面积安全上限（约 4096×4096 像素）。
 * HiDPI（Retina/4K）下若整表按完整 devicePixelRatio 分配 backing store，
 * 大表可能超过浏览器单边/面积上限导致 canvas 整块空白或内存暴涨，
 * 因此超出时降低有效 DPR（画面略糊但保证非空且内存可控）。
 */
const MAX_CANVAS_BACKING_AREA = 16 * 1024 * 1024;

export interface SheetLayoutMetrics {
  columnWidths: number[];
  rowHeights: number[];
  totalWidth: number;
  totalHeight: number;
  frozenWidth: number;
  frozenHeight: number;
}

/**
 * 把多余宽度按比例分配给可拉伸列（水填算法）：
 * 尊重每列的 maxWidth 上限，被 maxWidth 顶满的列退出分配，
 * 剩余宽度继续分给其他列，最终各列宽度之和精确等于目标宽度。
 * 隐藏列不参与拉伸。
 */
function stretchColumnWidths(columns: SheetColumnDefinition[], naturalWidths: number[], extra: number): number[] {
  const widths = [...naturalWidths];
  const active = new Set<number>();
  columns.forEach((column, index) => {
    if (!column.hidden && (column.maxWidth == null || widths[index] < column.maxWidth)) {
      active.add(index);
    }
  });

  let remaining = extra;
  while (active.size > 0 && remaining > 0.5) {
    const activeIndices = [...active];
    const totalActiveWidth = activeIndices.reduce((sum, index) => sum + widths[index], 0);
    if (totalActiveWidth <= 0) {
      break;
    }

    let added = 0;
    const deltas = new Map<number, number>();
    for (const index of activeIndices) {
      let delta = (remaining * widths[index]) / totalActiveWidth;
      const maxWidth = columns[index].maxWidth;
      if (maxWidth != null) {
        delta = Math.min(delta, Math.max(0, maxWidth - widths[index]));
        if (widths[index] + delta >= maxWidth - 0.5) {
          active.delete(index);
        }
      }
      deltas.set(index, delta);
      added += delta;
    }

    if (added <= 0.5) {
      break;
    }
    for (const [index, delta] of deltas) {
      widths[index] += delta;
    }
    remaining -= added;
  }

  return widths;
}

export function measureSheetLayout(
  options: Pick<
    DrawSheetOptions,
    "columns" | "rows" | "defaultColumnWidth" | "defaultRowHeight" | "frozenRows" | "frozenCols" | "fitWidth"
  >,
): SheetLayoutMetrics {
  const columnWidths = options.columns.map((column) => {
    if (column.hidden) {
      return 0;
    }

    const baseWidth = column.width ?? options.defaultColumnWidth ?? 80;
    const minBoundedWidth = column.minWidth == null ? baseWidth : Math.max(baseWidth, column.minWidth);
    return column.maxWidth == null ? minBoundedWidth : Math.min(minBoundedWidth, column.maxWidth);
  });
  const rowHeights = options.rows.map((entry) =>
    entry.row.hidden ? 0 : (entry.row.height ?? options.defaultRowHeight ?? 25),
  );
  const naturalTotalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);

  // widthMode: "stretch"：目标宽度大于自然宽度时把多余宽度分给各列，铺满容器。
  const resolvedColumnWidths =
    options.fitWidth != null && options.fitWidth > naturalTotalWidth
      ? stretchColumnWidths(options.columns, columnWidths, options.fitWidth - naturalTotalWidth)
      : columnWidths;
  const totalWidth = resolvedColumnWidths.reduce((sum, width) => sum + width, 0);
  const frozenWidth = resolvedColumnWidths.slice(0, options.frozenCols ?? 0).reduce((sum, width) => sum + width, 0);
  const frozenHeight = rowHeights.slice(0, options.frozenRows ?? 0).reduce((sum, height) => sum + height, 0);

  return {
    columnWidths: resolvedColumnWidths,
    rowHeights,
    totalWidth,
    totalHeight,
    frozenWidth,
    frozenHeight,
  };
}

function resolveBorderParts(border: Border | undefined) {
  const color = border?.color ?? "#d1d5db";

  if (border?.style === "none") {
    return { width: 0, style: "none", color };
  }

  const width = border?.style === "thick" ? 3 : border?.style === "medium" ? 2 : 1;
  const style = border?.style === "dashed" || border?.style === "dotted" ? border.style : "solid";
  return { width, style, color };
}

function resolveFont(style: Record<string, unknown>) {
  const fontStyle = style.fontStyle === "italic" ? "italic" : "normal";
  const fontWeight = style.fontWeight === "bold" ? "bold" : "normal";
  const fontSize = Number(style.fontSize ?? 12);
  const fontFamily = String(style.fontFamily ?? "sans-serif");
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}

function resolveTextAnchor(style: Record<string, unknown>, x: number, y: number, width: number, height: number) {
  const hAlign = style.hAlign === "center" || style.hAlign === "right" ? style.hAlign : "left";
  const vAlign = style.vAlign === "middle" || style.vAlign === "bottom" ? style.vAlign : "top";
  const textX = hAlign === "right" ? x + width - 8 : hAlign === "center" ? x + width / 2 : x + 8;
  const textY = vAlign === "bottom" ? y + height - 8 : vAlign === "middle" ? y + height / 2 : y + 8;
  const baseline = vAlign === "bottom" ? "bottom" : vAlign === "middle" ? "middle" : "top";

  return { hAlign, baseline, textX, textY } as const;
}

function drawBorderSide(
  context: CanvasRenderingContext2D,
  border: Border | undefined,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const borderParts = resolveBorderParts(border);
  if (borderParts.style === "none" || borderParts.width === 0) {
    return;
  }

  context.strokeStyle = borderParts.color;
  context.lineWidth = borderParts.width;
  (context as Partial<CanvasRenderingContext2D>).setLineDash?.(
    borderParts.style === "dashed" ? [4, 4] : borderParts.style === "dotted" ? [1, 3] : [],
  );
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  (context as Partial<CanvasRenderingContext2D>).setLineDash?.([]);
}

function drawCommentIndicator(context: CanvasRenderingContext2D, x: number, y: number, width: number) {
  context.fillStyle = "#f59e0b";
  context.beginPath();
  context.moveTo(x + width - 8, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + 8);
  context.closePath();
  context.fill();
}

function drawCell(
  context: CanvasRenderingContext2D,
  cell: SheetCellDefinition,
  x: number,
  y: number,
  width: number,
  height: number,
  data: WorkbookData,
  style: Record<string, unknown>,
  formulaContext: SheetFormulaContext,
  rowContext?: WorkbookRowContext,
) {
  if (style.backgroundColor != null) {
    context.fillStyle = String(style.backgroundColor);
    context.fillRect(x, y, width, height);
  }

  drawBorderSide(context, style.borderTop as Border | undefined, x, y, x + width, y);
  drawBorderSide(context, style.borderRight as Border | undefined, x + width, y, x + width, y + height);
  drawBorderSide(context, style.borderBottom as Border | undefined, x, y + height, x + width, y + height);
  drawBorderSide(context, style.borderLeft as Border | undefined, x, y, x, y + height);

  context.fillStyle = String(style.color ?? "#111827");
  context.font = resolveFont(style);
  const anchor = resolveTextAnchor(style, x, y, width, height);
  context.textAlign = anchor.hAlign;
  context.textBaseline = anchor.baseline;
  const displayValue = resolveSheetCellDisplayValue(
    cell,
    data,
    rowContext,
    style.format as string | undefined,
    formulaContext,
  );
  const maxWidth = Math.max(width - 16, 0);

  if (typeof style.textRotation === "number" && style.textRotation !== 0) {
    context.save();
    context.translate(anchor.textX, anchor.textY);
    context.rotate((style.textRotation * Math.PI) / 180);
    context.fillText(displayValue, 0, 0, maxWidth);
    context.restore();
  } else {
    context.fillText(displayValue, anchor.textX, anchor.textY, maxWidth);
  }

  if (cell.comment != null) {
    drawCommentIndicator(context, x, y, width);
  }
}

function createCoveredKey(rowIndex: number, columnIndex: number) {
  return `${rowIndex}:${columnIndex}`;
}

function resolveCellStyle(
  options: DrawSheetOptions,
  rowIndex: number,
  columnIndex: number,
  cell: SheetCellDefinition,
  rowContext?: WorkbookRowContext,
) {
  const columnStyle =
    options.styleResolver?.resolveCellStyle(options.columns[columnIndex]?.style, options.data, rowContext) ?? {};
  const rowStyle =
    options.styleResolver?.resolveCellStyle(options.rows[rowIndex]?.row.style, options.data, rowContext) ?? {};
  const cellStyle = options.styleResolver?.resolveCellStyle(cell.style, options.data, rowContext) ?? {};

  return {
    borderTop: { style: "thin", color: "#d1d5db" },
    borderRight: { style: "thin", color: "#d1d5db" },
    borderBottom: { style: "thin", color: "#d1d5db" },
    borderLeft: { style: "thin", color: "#d1d5db" },
    ...columnStyle,
    ...rowStyle,
    ...cellStyle,
  };
}

function columnLabelToIndex(label: string) {
  return label.split("").reduce((index, character) => index * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function columnIndexToLabel(columnIndex: number) {
  let currentIndex = columnIndex + 1;
  let label = "";

  while (currentIndex > 0) {
    const remainder = (currentIndex - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    currentIndex = Math.floor((currentIndex - 1) / 26);
  }

  return label;
}

function parseCellAddress(address: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (match == null) {
    return null;
  }

  return {
    columnIndex: columnLabelToIndex(match[1].toUpperCase()),
    rowIndex: Number(match[2]) - 1,
  };
}

function createFormulaContext(options: DrawSheetOptions): SheetFormulaContext {
  const resolving = new Set<string>();

  const getCellValue = (address: string): unknown => {
    const parsedAddress = parseCellAddress(address);
    if (parsedAddress == null) {
      return 0;
    }

    const key = `${parsedAddress.rowIndex}:${parsedAddress.columnIndex}`;
    if (resolving.has(key)) {
      return 0;
    }

    const rowEntry = options.rows[parsedAddress.rowIndex];
    const cell = rowEntry?.row.cells?.find((entry) => entry.column === parsedAddress.columnIndex);
    if (rowEntry == null || cell == null) {
      return 0;
    }

    resolving.add(key);
    const value = resolveSheetCellDisplayValue(cell, options.data, rowEntry.rowContext, undefined, formulaContext);
    resolving.delete(key);
    return value;
  };

  const getRangeValues = (startAddress: string, endAddress: string) => {
    const start = parseCellAddress(startAddress);
    const end = parseCellAddress(endAddress);
    if (start == null || end == null) {
      return [];
    }

    const values: unknown[] = [];
    const rowStart = Math.min(start.rowIndex, end.rowIndex);
    const rowEnd = Math.max(start.rowIndex, end.rowIndex);
    const columnStart = Math.min(start.columnIndex, end.columnIndex);
    const columnEnd = Math.max(start.columnIndex, end.columnIndex);

    for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
      for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex += 1) {
        values.push(getCellValue(`${columnIndexToLabel(columnIndex)}${rowIndex + 1}`));
      }
    }

    return values;
  };

  const formulaContext: SheetFormulaContext = {
    getCellValue,
    getRangeValues,
  };

  return formulaContext;
}

export function drawSheet(options: DrawSheetOptions) {
  const context = options.canvas.getContext("2d");
  if (context == null) {
    return;
  }

  const metrics = measureSheetLayout(options);
  const widths = metrics.columnWidths;
  const heights = metrics.rowHeights;
  const rowStart = options.rowStart ?? 0;
  const rowEnd = options.rowEnd ?? options.rows.length;
  const columnStart = options.columnStart ?? 0;
  const columnEnd = options.columnEnd ?? options.columns.length;
  const totalWidth = widths.slice(columnStart, columnEnd).reduce((sum, width) => sum + width, 0);
  const totalHeight = heights.slice(rowStart, rowEnd).reduce((sum, height) => sum + height, 0);
  const formulaContext = createFormulaContext(options);

  // HiDPI-aware rendering: keep the CSS box at logical pixel size while the
  // backing store is allocated at devicePixelRatio resolution, so the sheet
  // stays crisp on Retina/2x displays instead of being upscaled by the
  // browser. The 2D context is scaled so all drawing coordinates below keep
  // working in logical (CSS) pixels.
  //
  // 超大表在 HiDPI 下按完整 dpr 分配 backing store 会超过浏览器安全上限，
  // 这里按面积阈值封顶有效 DPR：画面略糊但保证 canvas 非空且内存可控。
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const rawArea = Math.max(1, totalWidth * totalHeight);
  const effectiveDpr = Math.min(dpr, Math.sqrt(MAX_CANVAS_BACKING_AREA / rawArea));
  options.canvas.width = Math.max(1, Math.round(totalWidth * effectiveDpr));
  options.canvas.height = Math.max(1, Math.round(totalHeight * effectiveDpr));
  if (options.canvas.style != null) {
    options.canvas.style.width = `${totalWidth}px`;
    options.canvas.style.height = `${totalHeight}px`;
  }
  context.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);
  context.clearRect(0, 0, totalWidth, totalHeight);
  context.fillStyle = options.backgroundColor ?? "#ffffff";
  context.fillRect(0, 0, totalWidth, totalHeight);

  const coveredCells = new Set<string>();
  let cursorY = 0;
  options.rows.slice(rowStart, rowEnd).forEach(({ row, rowContext }, relativeRowIndex) => {
    const rowIndex = rowStart + relativeRowIndex;
    const rowHeight = heights[rowIndex] ?? options.defaultRowHeight ?? 25;
    if (rowHeight <= 0) {
      return;
    }

    let cursorX = 0;

    widths.slice(columnStart, columnEnd).forEach((columnWidth, relativeColumnIndex) => {
      const columnIndex = columnStart + relativeColumnIndex;
      if (columnWidth <= 0) {
        return;
      }

      if (coveredCells.has(createCoveredKey(rowIndex, columnIndex))) {
        cursorX += columnWidth;
        return;
      }

      const cell =
        row.cells?.find((entry) => entry.column === columnIndex) ??
        ({ column: columnIndex, value: "" } as SheetCellDefinition);
      const colSpan = Math.max(cell.colspan ?? 1, 1);
      const rowSpan = Math.max(cell.rowspan ?? 1, 1);
      const cellWidth = widths
        .slice(columnIndex, Math.min(columnIndex + colSpan, columnEnd))
        .reduce((sum, width) => sum + width, 0);
      const cellHeight = heights
        .slice(rowIndex, Math.min(rowIndex + rowSpan, rowEnd))
        .reduce((sum, height) => sum + height, 0);

      for (
        let coveredRowIndex = rowIndex;
        coveredRowIndex < Math.min(rowIndex + rowSpan, rowEnd);
        coveredRowIndex += 1
      ) {
        for (
          let coveredColumnIndex = columnIndex;
          coveredColumnIndex < Math.min(columnIndex + colSpan, columnEnd);
          coveredColumnIndex += 1
        ) {
          if (coveredRowIndex !== rowIndex || coveredColumnIndex !== columnIndex) {
            coveredCells.add(createCoveredKey(coveredRowIndex, coveredColumnIndex));
          }
        }
      }

      if (rowIndex < (options.frozenRows ?? 0) || columnIndex < (options.frozenCols ?? 0)) {
        context.fillStyle = "#f3f4f6";
        context.fillRect(cursorX, cursorY, cellWidth, cellHeight);
        context.fillStyle = options.backgroundColor ?? "#ffffff";
      }
      drawCell(
        context,
        cell,
        cursorX,
        cursorY,
        cellWidth,
        cellHeight,
        options.data,
        resolveCellStyle(options, rowIndex, columnIndex, cell, rowContext),
        formulaContext,
        rowContext,
      );
      cursorX += columnWidth;
    });

    cursorY += rowHeight;
  });
}
