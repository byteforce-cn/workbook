/**
 * RN 文档渲染器 —— 嵌入式台账（spreadsheet block）→ table block 转换纯函数
 *
 * 移动端 page 视图中的 spreadsheet 块以「只读简化台账」渲染：
 *  - 复用 RNTable 的网格布局（列宽 / colspan / rowspan / 边框），不重写渲染器；
 *  - 行源：rowBind（数据数组，rowTemplate.cellMapping）优先，其次静态 rows，与 Web sheet 语义一致；
 *  - 单元格文本：value / bind / formula 解析（formula 原样显示，公式计算明确留 Web 端）；
 *  - 隐藏列剔除并把原列号重映射为可见列位置，列空隙补 blank 占位单元格。
 *
 * 纯函数、零 React Native 依赖，可在 Node.js 环境直接单测。
 */

import { getValueAtPath } from "../core/data/pathUtils";
import type { PageBlockDefinition, SheetCellDefinition, WorkbookData, WorkbookRowContext } from "../core/types";

type SpreadsheetBlockDefinition = Extract<PageBlockDefinition, { type: "spreadsheet" }>;
type TableBlockDefinition = Extract<PageBlockDefinition, { type: "table" }>;
type TableCellDefinition = TableBlockDefinition["rows"][number]["cells"][number];

/** 嵌入式台账列宽缺省值（spreadsheet 块 schema 无 defaultColumnWidth） */
const DEFAULT_SHEET_COLUMN_WIDTH = 80;

export interface SpreadsheetRowSource {
  row: { height?: number; hidden?: boolean; style?: string; cells: SheetCellDefinition[] };
  rowContext?: WorkbookRowContext;
}

export function materializeSpreadsheetRows(
  sheet: SpreadsheetBlockDefinition["sheet"],
  data: WorkbookData,
): SpreadsheetRowSource[] {
  if (sheet.rowBind == null) {
    return (sheet.rows ?? []).map((row) => ({
      row: { height: row.height, hidden: row.hidden, style: row.style, cells: row.cells ?? [] },
    }));
  }

  const source = getValueAtPath(data, sheet.rowBind.path);
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item, index) => {
    const rowContext: WorkbookRowContext = { index, path: sheet.rowBind?.path, item };
    const template = sheet.rowBind?.rowTemplate;
    const row: SpreadsheetRowSource["row"] =
      template == null
        ? { cells: [] }
        : {
            height: template.height,
            hidden: template.hidden,
            style: template.style,
            cells: Object.entries(template.cellMapping ?? {}).map(([column, cell]) => ({
              column: Number(column),
              ...(cell as Omit<SheetCellDefinition, "column">),
            })),
          };
    return { row, rowContext };
  });
}

export function resolveSpreadsheetCellText(
  cell: SheetCellDefinition,
  data: WorkbookData,
  rowContext?: WorkbookRowContext,
): string {
  if (cell.value != null) {
    return String(cell.value);
  }
  if (cell.formula != null) {
    return `=${cell.formula}`;
  }
  if (cell.bind != null) {
    const raw = getValueAtPath(data, cell.bind.path, rowContext);
    return raw == null ? "" : String(raw);
  }
  return "";
}

/** 将 spreadsheet 块转换为 RNTable 可消费的 table block（隐藏列剔除、列号重映射、空隙补 blank）。 */
export function buildSpreadsheetTableBlock(
  sheet: SpreadsheetBlockDefinition["sheet"],
  data: WorkbookData,
): TableBlockDefinition {
  const visibleColumns = sheet.columns
    .map((column, originalIndex) => ({
      originalIndex,
      width: column.hidden ? null : (column.width ?? DEFAULT_SHEET_COLUMN_WIDTH),
    }))
    .filter((column): column is { originalIndex: number; width: number } => column.width != null);
  const originalToVisible = new Map<number, number>();
  visibleColumns.forEach((column, visibleIndex) => {
    originalToVisible.set(column.originalIndex, visibleIndex);
  });

  const tableRows = materializeSpreadsheetRows(sheet, data).map(({ row, rowContext }) => {
    const sourceCells = (row.cells ?? []).slice().sort((a, b) => a.column - b.column);
    const positioned: Array<{ column: number; colSpan: number; blank: boolean; cell?: SheetCellDefinition }> = [];
    let cursor = 0;

    for (const cell of sourceCells) {
      const startColumn = originalToVisible.get(cell.column);
      if (startColumn == null) {
        continue; // 单元格位于隐藏列
      }
      const colSpan = Math.min(Math.max(1, cell.colspan ?? 1), visibleColumns.length - startColumn);

      if (startColumn > cursor) {
        positioned.push({ column: cursor, colSpan: startColumn - cursor, blank: true });
      }
      positioned.push({ column: startColumn, colSpan, blank: false, cell });
      cursor = startColumn + colSpan;
    }

    const cells: TableCellDefinition[] = positioned.map((entry) => ({
      colSpan: entry.colSpan,
      content: [
        {
          type: "paragraph",
          runs: [
            { type: "text", text: entry.cell == null ? "" : resolveSpreadsheetCellText(entry.cell, data, rowContext) },
          ],
        },
      ],
    }));

    return { height: row.height, cells };
  });

  return {
    type: "table",
    columns: visibleColumns.map((column) => column.width) as TableBlockDefinition["columns"],
    rows: tableRows as TableBlockDefinition["rows"],
  };
}
