/**
 * tableGrid 纯函数单测：验证 colSpan / rowSpan / blank 占位的网格布局语义。
 */

import { describe, expect, it } from "vitest";

import { computeTableGrid, type TableGridCellInput } from "./tableGrid";

const colWidths = [100, 200, 100];
const rowHeights = [40, 40];

describe("computeTableGrid", () => {
  it("等宽常规表格：单元格按位置顺序放置", () => {
    const rows: TableGridCellInput[][] = [
      [
        { column: 0, colSpan: 1, rowSpan: 1 },
        { column: 1, colSpan: 1, rowSpan: 1 },
        { column: 2, colSpan: 1, rowSpan: 1 },
      ],
    ];
    const placements = computeTableGrid({ colWidths, rowHeights: [40], rows });

    expect(placements).toHaveLength(3);
    expect(placements[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 40 });
    expect(placements[1]).toMatchObject({ x: 100, y: 0, width: 200, height: 40 });
    expect(placements[2]).toMatchObject({ x: 300, y: 0, width: 100, height: 40 });
  });

  it("colSpan 跨列：宽度为多列之和", () => {
    const rows: TableGridCellInput[][] = [[{ column: 0, colSpan: 2, rowSpan: 1 }]];
    const placements = computeTableGrid({ colWidths, rowHeights: [40], rows });

    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({ x: 0, y: 0, width: 300, height: 40 });
  });

  it("rowSpan 跨行：高度为多行之和，且下方行单元格向右顺延", () => {
    const rows: TableGridCellInput[][] = [
      [
        { column: 0, colSpan: 1, rowSpan: 2 },
        { column: 1, colSpan: 1, rowSpan: 1 },
      ],
      [{ column: 1, colSpan: 1, rowSpan: 1 }],
    ];
    const placements = computeTableGrid({ colWidths, rowHeights, rows });

    const spanning = placements.find((p) => p.colSpan === 1 && p.rowSpan === 2);
    expect(spanning).toMatchObject({ x: 0, y: 0, width: 100, height: 80 });

    // 下方行只有一列数据，但第 0 列被 rowSpan 占用 → 顺延到第 1 列
    const secondRow = placements.filter((p) => p.rowIndex === 1);
    expect(secondRow).toHaveLength(1);
    expect(secondRow[0]).toMatchObject({ x: 100, y: 40, width: 200, height: 40 });
  });

  it("blank 占位被上方 rowSpan 覆盖时整格跳过（sheet 语义）", () => {
    const rows: TableGridCellInput[][] = [
      [
        { column: 0, colSpan: 1, rowSpan: 2 },
        { column: 1, colSpan: 1, rowSpan: 1 },
      ],
      [
        { column: 0, colSpan: 1, rowSpan: 1, blank: true },
        { column: 1, colSpan: 1, rowSpan: 1 },
      ],
    ];
    const placements = computeTableGrid({ colWidths, rowHeights, rows });

    const secondRow = placements.filter((p) => p.rowIndex === 1);
    // blank 被跳过，仅剩第 1 列的单元格
    expect(secondRow).toHaveLength(1);
    expect(secondRow[0]).toMatchObject({ x: 100, y: 40, width: 200, height: 40 });
  });

  it("blank 占位未被覆盖时占用空隙（列空隙补位）", () => {
    const rows: TableGridCellInput[][] = [
      [
        { column: 0, colSpan: 2, rowSpan: 1, blank: true },
        { column: 2, colSpan: 1, rowSpan: 1 },
      ],
    ];
    const placements = computeTableGrid({ colWidths, rowHeights: [40], rows });

    expect(placements).toHaveLength(2);
    expect(placements[0]).toMatchObject({ x: 0, y: 0, width: 300, height: 40 });
    expect(placements[1]).toMatchObject({ x: 300, y: 0, width: 100, height: 40 });
  });
});
