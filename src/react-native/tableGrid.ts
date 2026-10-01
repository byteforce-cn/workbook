/**
 * RN 文档渲染器 —— 表格网格纯函数
 *
 * 计算 table / sheet 单元格在网格中的绝对位置（x/y/width/height），供 RNTable
 * 与嵌入式台账（spreadsheet block）使用，语义与 Web 的 HTML 表格布局对齐：
 *  - 普通单元格按行内位置序号放置，起始列被上方 rowSpan 覆盖时向右顺延（HTML 行为）；
 *  - blank 占位单元格（sheet 转换产生的列空隙）起始列被上方 rowSpan 覆盖时整格跳过。
 *
 * 纯函数、零 React Native 依赖，可在 Node.js 环境直接单测。
 */

export interface TableGridCellInput {
  /** 起始列（普通单元格为行内位置序号；blank 占位为自身列号，用于排序） */
  column: number;
  colSpan: number;
  rowSpan: number;
  /** 占位空白单元格：被上方 rowSpan 覆盖时跳过而非右移 */
  blank?: boolean;
}

export interface TableGridPlacement {
  rowIndex: number;
  cellIndex: number;
  column: number;
  colSpan: number;
  rowSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableGridOptions {
  colWidths: number[];
  rowHeights: number[];
  rows: TableGridCellInput[][];
}

function prefixSum(values: number[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const value of values) {
    offsets.push(acc);
    acc += value;
  }
  return offsets;
}

export function computeTableGrid({ colWidths, rowHeights, rows }: TableGridOptions): TableGridPlacement[] {
  const colOffsets = prefixSum(colWidths);
  const rowOffsets = prefixSum(rowHeights);
  const occupied = new Set<string>();
  const placements: TableGridPlacement[] = [];

  rows.forEach((cells, rowIndex) => {
    // 按起始列升序处理（table 位置序号天然有序；sheet 显式列号需排序）
    const sortedCells = [...cells].sort((a, b) => a.column - b.column);
    let cursor = 0;

    sortedCells.forEach((cell, cellIndex) => {
      const colSpan = Math.max(1, cell.colSpan);
      const rowSpan = Math.max(1, cell.rowSpan);

      if (cell.blank === true) {
        // 占位空白：起始列被上方 rowSpan 覆盖 → 整格跳过（不占位、不右移）
        if (occupied.has(`${rowIndex},${cursor}`)) {
          cursor += colSpan;
          return;
        }
      } else {
        // 普通单元格：跳过已被上方 rowSpan 覆盖的列，向右顺延（HTML 行为）
        while (occupied.has(`${rowIndex},${cursor}`)) {
          cursor += 1;
        }
      }

      const column = cursor;
      const width = colWidths.slice(column, column + colSpan).reduce((sum, w) => sum + w, 0);
      const height = rowHeights.slice(rowIndex, rowIndex + rowSpan).reduce((sum, h) => sum + h, 0);

      for (let dr = 0; dr < rowSpan; dr += 1) {
        for (let dc = 0; dc < colSpan; dc += 1) {
          occupied.add(`${rowIndex + dr},${column + dc}`);
        }
      }

      placements.push({
        rowIndex,
        cellIndex,
        column,
        colSpan,
        rowSpan,
        x: colOffsets[column] ?? 0,
        y: rowOffsets[rowIndex] ?? 0,
        width,
        height,
      });
      cursor += colSpan;
    });
  });

  return placements;
}
