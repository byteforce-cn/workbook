import { useMemo } from "react";
import type { WorkbookData } from "../../core/types";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookPluginRegistry } from "../../react/registry";
import type { WorkbookDefinition } from "../../schema/generated-types";

export interface SheetRendererColumnDef {
  /** Column width in points (optional) */
  width?: number;
  /** Minimum column width */
  minWidth?: number;
  /** Maximum column width */
  maxWidth?: number;
  /** Whether column is hidden */
  hidden?: boolean;
  /** Cell style reference */
  style?: string;
}

export interface SheetRendererRowDef {
  /** Row height in points (optional) */
  height?: number;
  /** Whether row is hidden */
  hidden?: boolean;
  /** Cell style reference */
  style?: string;
  /** Cell definitions for this row */
  cells: SheetCellDef[];
}

export interface SheetCellDef {
  /** Static value */
  value?: unknown;
  /** Bind to a data path */
  bind?: string;
  /** Formula (e.g., "=A1+B1") */
  formula?: string;
  /** Display format */
  format?: string;
  /** Cell style reference */
  style?: string;
  /** Column span */
  colspan?: number;
  /** Row span */
  rowspan?: number;
  /** Comment text */
  comment?: string;
}

export interface SheetRendererRowBind {
  /** Data path for array binding */
  path: string;
  /** Optional row template */
  rowTemplate?: {
    height?: number;
    hidden?: boolean;
    style?: string;
  };
}

export interface SheetRendererProps {
  /** Column definitions (position-based, no names needed) */
  columns: SheetRendererColumnDef[];
  /** Static row definitions */
  rows?: SheetRendererRowDef[];
  /** Dynamic row bind */
  rowBind?: SheetRendererRowBind;
  /** Bind data */
  data?: WorkbookData;
  /** Number of frozen rows */
  frozenRows?: number;
  /** Number of frozen columns */
  frozenCols?: number;
  /**
   * Width adaptation mode: "fixed" keeps natural column widths (wide
   * containers leave empty space, sheet centered); "stretch" distributes
   * the extra container width to stretchable columns so the sheet fills
   * the container.
   */
  widthMode?: "fixed" | "stretch";
  /** Plugin registry */
  plugins?: WorkbookPluginRegistry;
  /** Locale */
  locale?: string;
  /** Fallback locale */
  fallbackLocale?: string;
  /** Additional CSS class */
  className?: string;
}

/** Map our simple cell def to schema SheetCellDefinition */
function mapCell(cell: SheetCellDef, colIndex: number): Record<string, unknown> {
  const result: Record<string, unknown> = { column: colIndex };
  if (cell.value !== undefined) result.value = cell.value;
  if (cell.bind) result.bind = { path: cell.bind };
  if (cell.formula) result.formula = cell.formula;
  if (cell.format) result.format = cell.format;
  if (cell.style) result.style = cell.style;
  if (cell.colspan) result.colspan = cell.colspan;
  if (cell.rowspan) result.rowspan = cell.rowspan;
  if (cell.comment) result.comment = cell.comment;
  return result;
}

/**
 * SheetRenderer — standalone spreadsheet rendering without DocumentRenderer.
 *
 * Creates its own runtime context internally. Renders a read-only spreadsheet
 * with frozen panes, formulas, and optional dynamic rows via rowBind.
 */
export function SheetRenderer({
  columns,
  rows = [],
  rowBind,
  data = {},
  frozenRows = 0,
  frozenCols = 0,
  widthMode = "fixed",
  plugins,
  locale = "zh-CN",
  fallbackLocale = "en-US",
  className,
}: SheetRendererProps) {
  const workbook = useMemo<WorkbookDefinition>(() => {
    const sheetRows =
      rows.length > 0
        ? rows.map((row) => ({
            ...(row.height !== undefined ? { height: row.height } : {}),
            ...(row.hidden !== undefined ? { hidden: row.hidden } : {}),
            ...(row.style ? { style: row.style } : {}),
            cells: row.cells.map((cell, ci) => mapCell(cell, ci)),
          }))
        : undefined;

    const sheetView: Record<string, unknown> = {
      type: "sheet",
      name: "sheet-renderer",
      columns: columns.length > 0 ? columns : [{}],
      ...(widthMode !== "fixed" ? { widthMode } : {}),
      ...(frozenRows > 0 ? { frozenRows } : {}),
      ...(frozenCols > 0 ? { frozenCols } : {}),
      ...(sheetRows ? { rows: sheetRows } : {}),
      ...(rowBind
        ? { rowBind: { path: rowBind.path, ...(rowBind.rowTemplate ? { rowTemplate: rowBind.rowTemplate } : {}) } }
        : {}),
    };

    return {
      kind: "workbook",
      schemaVersion: "4.1.1",
      locale,
      data,
      views: [sheetView],
    } as unknown as WorkbookDefinition;
  }, [columns, rows, rowBind, frozenRows, frozenCols, widthMode, locale, data]);

  return (
    <div className={className}>
      <DocumentRenderer
        workbook={workbook}
        registry={plugins}
        locale={locale}
        fallbackLocale={fallbackLocale}
        initialData={data}
      />
    </div>
  );
}
