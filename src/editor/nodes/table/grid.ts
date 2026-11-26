/**
 * Grid math for the custom workbook table nodes.
 *
 * `colwidth` from `prosemirror-tables` is px-only and would silently turn
 * `"30%"` into a pixel value. The editor therefore stores the authored
 * `MeasurementOrPercent[]` on `wbTableColgroup` and validates spans separately.
 */

import type { Node as PMNode } from "@tiptap/pm/model";

export type TableWidth = number | string;

export interface TableCellLike {
  colSpan?: number;
  rowSpan?: number;
}

export interface TableRowLike {
  cells: TableCellLike[];
}

export interface GridCellPlacement {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface TableGridIssue {
  code: "overlap" | "overflow" | "hole" | "invalid-span";
  message: string;
  row: number;
  col: number;
}

export interface TableGridResult {
  columns: number;
  cells: GridCellPlacement[];
  issues: TableGridIssue[];
}

const PERCENT_PATTERN = /^([0-9]+(?:\.[0-9]+)?)%$/;

export function isPercentWidth(width: TableWidth): width is string {
  return typeof width === "string" && PERCENT_PATTERN.test(width);
}

function percentValue(width: TableWidth): number | undefined {
  if (typeof width !== "string") {
    return undefined;
  }
  const match = PERCENT_PATTERN.exec(width);
  return match == null ? undefined : Number(match[1]);
}

/**
 * Normalize percentage columns so they add up to exactly 100%.
 *
 * Each width except the last is rounded to 0.1%; the last column absorbs the
 * rounding error so the total is always 100. Numeric (pt) columns are left
 * untouched — mixing units is legal in the schema, so there is nothing to
 * normalize.
 */
export function normalizeColumnWidths(widths: readonly TableWidth[]): TableWidth[] {
  const values = widths.map(percentValue);
  if (values.some((value) => value === undefined) || values.length === 0) {
    return [...widths];
  }

  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (total <= 0) {
    return [...widths];
  }

  const normalized = values.map((value) => Math.round(((value ?? 0) / total) * 1000) / 10);
  const lastIndex = normalized.length - 1;
  const headTotal = normalized.slice(0, lastIndex).reduce((sum, value) => sum + value, 0);
  normalized[lastIndex] = Math.round((100 - headTotal) * 10) / 10;

  return normalized.map((value) => `${value}%`);
}

/** Validate that spans form a rectangular grid without overlaps or holes. */
export function validateTableGrid(rows: readonly TableRowLike[], columnCount?: number): TableGridResult {
  const occupied: Array<Array<boolean>> = [];
  const cells: GridCellPlacement[] = [];
  const issues: TableGridIssue[] = [];
  let columns = columnCount ?? 0;

  rows.forEach((row, rowIndex) => {
    occupied[rowIndex] ??= [];
    let col = 0;

    row.cells.forEach((cell) => {
      const colSpan = Math.max(1, Math.floor(cell.colSpan ?? 1));
      const rowSpan = Math.max(1, Math.floor(cell.rowSpan ?? 1));

      if ((cell.colSpan != null && colSpan !== cell.colSpan) || (cell.rowSpan != null && rowSpan !== cell.rowSpan)) {
        issues.push({
          code: "invalid-span",
          message: `Span values must be positive integers (colSpan=${String(cell.colSpan)}, rowSpan=${String(cell.rowSpan)}).`,
          row: rowIndex,
          col,
        });
      }

      while (occupied[rowIndex][col]) {
        col += 1;
      }

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        const targetRow = rowIndex + rowOffset;
        occupied[targetRow] ??= [];
        for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
          const targetCol = col + colOffset;
          if (occupied[targetRow][targetCol]) {
            issues.push({
              code: "overlap",
              message: `Cell at row ${rowIndex}, column ${col} overlaps row ${targetRow}, column ${targetCol}.`,
              row: rowIndex,
              col,
            });
          }
          occupied[targetRow][targetCol] = true;
        }
      }

      cells.push({ row: rowIndex, col, rowSpan, colSpan });
      columns = Math.max(columns, col + colSpan);
      col += colSpan;
    });
  });

  if (columnCount != null && columns > columnCount) {
    issues.push({
      code: "overflow",
      message: `Table spans ${columns} columns but declares ${columnCount}.`,
      row: rows.length - 1,
      col: columnCount,
    });
  }

  occupied.forEach((rowOccupancy, rowIndex) => {
    for (let col = 0; col < columns; col += 1) {
      if (!rowOccupancy[col]) {
        issues.push({
          code: "hole",
          message: `No cell covers row ${rowIndex}, column ${col}.`,
          row: rowIndex,
          col,
        });
      }
    }
  });

  return { columns, cells, issues };
}

/** Extract the authored widths from a `wbTable` node. */
export function readTableWidths(table: PMNode): TableWidth[] {
  let widths: TableWidth[] = [];
  table.forEach((child) => {
    if (child.type.name === "wbTableColgroup" && Array.isArray(child.attrs.widths)) {
      widths = child.attrs.widths as TableWidth[];
    }
  });
  return widths;
}

/** Read row/cell span shapes for validation and command tests. */
export function readTableRows(table: PMNode): Array<{ height?: number; cells: TableCellLike[] }> {
  const rows: Array<{ height?: number; cells: TableCellLike[] }> = [];

  table.forEach((row) => {
    if (row.type.name !== "wbTableRow") {
      return;
    }
    const cells: TableCellLike[] = [];
    row.forEach((cell) => {
      if (cell.type.name === "wbTableCell") {
        cells.push({
          colSpan: typeof cell.attrs.colSpan === "number" ? cell.attrs.colSpan : undefined,
          rowSpan: typeof cell.attrs.rowSpan === "number" ? cell.attrs.rowSpan : undefined,
        });
      }
    });
    rows.push({
      height: typeof row.attrs.height === "number" ? row.attrs.height : undefined,
      cells,
    });
  });

  return rows;
}
