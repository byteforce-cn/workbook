/**
 * Commands for the custom table nodes.
 *
 * `prosemirror-tables` is intentionally not used: its schema and commands
 * assume px `colwidth`, while workbook columns are pt-or-percent measurements.
 */

import type { Editor } from "@tiptap/core";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { normalizeColumnWidths, readTableWidths, type TableWidth } from "./grid";

export interface TableLocation {
  table: PMNode;
  tablePos: number;
  rowIndex: number;
  cellIndex: number;
}

export function locateTable(editor: Editor): TableLocation | null {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "wbTable") {
      continue;
    }

    const firstChild = node.childCount > 0 ? node.child(0) : null;
    const rowOffset = firstChild?.type.name === "wbTableColgroup" ? 1 : 0;

    return {
      table: node,
      tablePos: $from.before(depth),
      rowIndex: $from.index(depth) - rowOffset,
      cellIndex: $from.index(depth + 1),
    };
  }

  return null;
}

function emptyParagraph(schema: Schema): PMNode {
  return schema.nodes.wbParagraph.create(null, []);
}

function emptyCell(schema: Schema): PMNode {
  return schema.nodes.wbTableCell.create(null, [emptyParagraph(schema)]);
}

interface TableParts {
  colgroup: PMNode | null;
  widths: TableWidth[];
  rows: PMNode[];
}

function splitTable(table: PMNode): TableParts {
  let colgroup: PMNode | null = null;
  const widths = readTableWidths(table);
  const rows: PMNode[] = [];
  table.forEach((child) => {
    if (child.type.name === "wbTableColgroup") {
      colgroup = child;
    } else if (child.type.name === "wbTableRow") {
      rows.push(child);
    }
  });
  return { colgroup, widths, rows };
}

function rebuildTable(table: PMNode, parts: TableParts): PMNode {
  const children: PMNode[] = [];
  if (parts.colgroup != null) {
    children.push(parts.colgroup.type.create({ ...parts.colgroup.attrs, widths: parts.widths }));
  } else if (parts.widths.length > 0) {
    children.push(table.type.schema.nodes.wbTableColgroup.create({ widths: parts.widths }));
  }
  children.push(...parts.rows);
  return table.type.create(table.attrs, children);
}

function replaceTable(editor: Editor, location: TableLocation, nextTable: PMNode): boolean {
  const { state, view } = editor;
  const transaction = state.tr.replaceWith(location.tablePos, location.tablePos + location.table.nodeSize, nextTable);
  // Replacing the table maps the old selection to the end of the new node.
  // Anchor it in the first cell so follow-up commands have a valid target.
  const anchor = transaction.doc.resolve(Math.min(location.tablePos + 2, transaction.doc.content.size - 2));
  transaction.setSelection(TextSelection.near(anchor, 1));
  view.dispatch(transaction);
  return true;
}

function withTable(editor: Editor, mutate: (parts: TableParts, table: PMNode) => boolean): boolean {
  const location = locateTable(editor);
  if (location == null) {
    return false;
  }

  const parts = splitTable(location.table);
  if (!mutate(parts, location.table)) {
    return false;
  }

  return replaceTable(editor, location, rebuildTable(location.table, parts));
}

export function addRowAfter(editor: Editor): boolean {
  return withTable(editor, (parts, table) => {
    const location = locateTable(editor);
    if (location == null) {
      return false;
    }
    const row = parts.rows[location.rowIndex];
    if (row == null) {
      return false;
    }

    const cellCount = Math.max(1, parts.widths.length || 1);
    const cells = Array.from({ length: cellCount }, () => emptyCell(table.type.schema));
    const nextRow = row.type.create({ ...row.attrs, height: null }, cells);
    parts.rows.splice(location.rowIndex + 1, 0, nextRow);
    return true;
  });
}

export function deleteRow(editor: Editor): boolean {
  return withTable(editor, (parts) => {
    const location = locateTable(editor);
    if (location == null || parts.rows.length <= 1) {
      return false;
    }
    parts.rows.splice(location.rowIndex, 1);
    return true;
  });
}

function appendWidth(widths: TableWidth[]): TableWidth[] {
  if (widths.length === 0) {
    return ["100%"];
  }

  const allPercent = widths.every((width) => typeof width === "string");
  if (!allPercent) {
    const last = widths[widths.length - 1];
    return [...widths, typeof last === "number" ? last : 100];
  }

  const normalized = normalizeColumnWidths([...widths, "0%"]);
  return normalized;
}

export function addColumn(editor: Editor): boolean {
  return withTable(editor, (parts, table) => {
    parts.widths = appendWidth(parts.widths);
    parts.rows = parts.rows.map((row) => {
      const children: PMNode[] = [];
      row.forEach((cell) => {
        children.push(cell);
      });
      children.push(emptyCell(table.type.schema));
      return row.type.create(row.attrs, children);
    });
    return true;
  });
}

export function deleteColumn(editor: Editor): boolean {
  return withTable(editor, (parts) => {
    const location = locateTable(editor);
    if (location == null) {
      return false;
    }
    if (parts.widths.length <= 1) {
      return false;
    }

    let removed = false;
    parts.rows = parts.rows.map((row) => {
      const children: PMNode[] = [];
      let index = 0;
      let rowRemoved = false;
      row.forEach((cell) => {
        if (index !== location.cellIndex || rowRemoved) {
          children.push(cell);
        } else {
          rowRemoved = true;
        }
        index += 1;
      });
      removed = removed || rowRemoved;
      return row.type.create(row.attrs, children);
    });

    if (!removed) {
      return false;
    }

    parts.widths.splice(location.cellIndex, 1);
    return true;
  });
}

function cellContent(cell: PMNode): PMNode[] {
  const children: PMNode[] = [];
  cell.forEach((child) => {
    children.push(child);
  });
  return children;
}

/** Merge the current cell with its right neighbour in the same row. */
export function mergeWithNextCell(editor: Editor): boolean {
  return withTable(editor, (parts) => {
    const location = locateTable(editor);
    if (location == null) {
      return false;
    }

    const row = parts.rows[location.rowIndex];
    if (row == null) {
      return false;
    }

    const cells: PMNode[] = [];
    row.forEach((cell) => {
      cells.push(cell);
    });
    const left = cells[location.cellIndex];
    const right = cells[location.cellIndex + 1];
    if (left == null || right == null) {
      return false;
    }

    const leftRowSpan = left.attrs.rowSpan ?? 1;
    const rightRowSpan = right.attrs.rowSpan ?? 1;
    if (leftRowSpan !== rightRowSpan) {
      return false;
    }

    const merged = left.type.create(
      {
        ...left.attrs,
        colSpan: (left.attrs.colSpan ?? 1) + (right.attrs.colSpan ?? 1),
        rowSpan: leftRowSpan > 1 ? leftRowSpan : null,
      },
      [...cellContent(left), ...cellContent(right)],
    );

    cells.splice(location.cellIndex, 2, merged);
    parts.rows[location.rowIndex] = row.type.create(row.attrs, cells);
    return true;
  });
}

/** Split the current cell's colspan into separate cells, keeping content in the first. */
export function splitCurrentCell(editor: Editor): boolean {
  return withTable(editor, (parts, table) => {
    const location = locateTable(editor);
    if (location == null) {
      return false;
    }

    const row = parts.rows[location.rowIndex];
    if (row == null) {
      return false;
    }

    const cells: PMNode[] = [];
    row.forEach((cell) => {
      cells.push(cell);
    });
    const cell = cells[location.cellIndex];
    if (cell == null) {
      return false;
    }

    const colSpan = Math.max(1, Number(cell.attrs.colSpan ?? 1));
    if (colSpan <= 1) {
      return false;
    }

    const replacement: PMNode[] = [cell.type.create({ ...cell.attrs, colSpan: null }, cellContent(cell))];
    for (let index = 1; index < colSpan; index += 1) {
      replacement.push(emptyCell(table.type.schema));
    }

    cells.splice(location.cellIndex, 1, ...replacement);
    parts.rows[location.rowIndex] = row.type.create(row.attrs, cells);
    return true;
  });
}
