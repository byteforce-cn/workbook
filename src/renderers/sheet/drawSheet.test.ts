import { describe, expect, it } from "vitest";

import { pluginRegistry } from "../../react/registry";
import { createStyleCatalogResolver } from "../../styles/catalog";
import { drawSheet, measureSheetLayout } from "./drawSheet";

function createRecordingCanvas() {
  const operations: Array<{ name: string; args: unknown[] }> = [];
  const context = {
    set fillStyle(value: string) {
      operations.push({ name: "fillStyle", args: [value] });
    },
    set strokeStyle(value: string) {
      operations.push({ name: "strokeStyle", args: [value] });
    },
    set lineWidth(value: number) {
      operations.push({ name: "lineWidth", args: [value] });
    },
    set font(value: string) {
      operations.push({ name: "font", args: [value] });
    },
    set textAlign(value: CanvasTextAlign) {
      operations.push({ name: "textAlign", args: [value] });
    },
    set textBaseline(value: CanvasTextBaseline) {
      operations.push({ name: "textBaseline", args: [value] });
    },
    clearRect(...args: unknown[]) {
      operations.push({ name: "clearRect", args });
    },
    fillRect(...args: unknown[]) {
      operations.push({ name: "fillRect", args });
    },
    strokeRect(...args: unknown[]) {
      operations.push({ name: "strokeRect", args });
    },
    fillText(...args: unknown[]) {
      operations.push({ name: "fillText", args });
    },
    beginPath(...args: unknown[]) {
      operations.push({ name: "beginPath", args });
    },
    moveTo(...args: unknown[]) {
      operations.push({ name: "moveTo", args });
    },
    lineTo(...args: unknown[]) {
      operations.push({ name: "lineTo", args });
    },
    closePath(...args: unknown[]) {
      operations.push({ name: "closePath", args });
    },
    fill(...args: unknown[]) {
      operations.push({ name: "fill", args });
    },
    stroke(...args: unknown[]) {
      operations.push({ name: "stroke", args });
    },
    save(...args: unknown[]) {
      operations.push({ name: "save", args });
    },
    restore(...args: unknown[]) {
      operations.push({ name: "restore", args });
    },
    translate(...args: unknown[]) {
      operations.push({ name: "translate", args });
    },
    rotate(...args: unknown[]) {
      operations.push({ name: "rotate", args });
    },
    setTransform(...args: unknown[]) {
      operations.push({ name: "setTransform", args });
    },
    measureText() {
      return { width: 40 };
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => context,
  } as unknown as HTMLCanvasElement;

  return { canvas, operations };
}

describe("measureSheetLayout", () => {
  it("applies column min/max constraints and hidden columns before computing totals", () => {
    const layout = measureSheetLayout({
      columns: [{ width: 40, minWidth: 80 }, { width: 220, maxWidth: 160 }, { width: 120, hidden: true }, {}],
      rows: [{ row: { height: 30 } }, { row: { height: 30, hidden: true } }],
      defaultColumnWidth: 96,
      defaultRowHeight: 24,
      frozenRows: 1,
      frozenCols: 2,
    });

    expect(layout.columnWidths).toEqual([80, 160, 0, 96]);
    expect(layout.rowHeights).toEqual([30, 0]);
    expect(layout.totalWidth).toBe(336);
    expect(layout.totalHeight).toBe(30);
    expect(layout.frozenWidth).toBe(240);
  });

  it("stretches columns to fill a wider container, respecting maxWidth caps", () => {
    const layout = measureSheetLayout({
      columns: [{ width: 100 }, { width: 200, maxWidth: 220 }, { width: 100 }],
      rows: [{ row: { height: 30 } }],
      defaultColumnWidth: 80,
      defaultRowHeight: 24,
      fitWidth: 600,
    });

    // 自然宽度 400 → 目标 600；多余 200 按比例分配，第二列受 maxWidth=220 约束后退出分配
    expect(layout.totalWidth).toBe(600);
    expect(layout.columnWidths[1]).toBe(220);
    expect(layout.columnWidths.reduce((sum, width) => sum + width, 0)).toBe(600);
    // 其余两列吸收被 maxWidth 挡下的宽度
    expect(layout.columnWidths[0]).toBeGreaterThan(100);
    expect(layout.columnWidths[2]).toBeGreaterThan(100);
  });

  it("keeps natural widths when fitWidth is not wider than the sheet", () => {
    const layout = measureSheetLayout({
      columns: [{ width: 100 }, { width: 200 }],
      rows: [{ row: { height: 30 } }],
      defaultColumnWidth: 80,
      defaultRowHeight: 24,
      fitWidth: 250,
    });

    expect(layout.columnWidths).toEqual([100, 200]);
    expect(layout.totalWidth).toBe(300);
  });

  it("caps the canvas backing store on HiDPI so large sheets stay within the safe area", () => {
    const { canvas } = createRecordingCanvas();
    const previousDpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    try {
      drawSheet({
        canvas,
        columns: Array.from({ length: 50 }, () => ({ width: 200 })),
        rows: Array.from({ length: 50 }, () => ({ row: { height: 100 } })),
        data: {},
      });

      // 自然尺寸 10000×5000；dpr=2 全量约 2 亿像素超上限 → 有效 DPR 被压到面积上限内
      expect(canvas.width * canvas.height).toBeLessThanOrEqual(16 * 1024 * 1024);
      // CSS 尺寸仍保持逻辑像素，不随有效 DPR 变化
      expect(canvas.style.width).toBe("10000px");
      expect(canvas.style.height).toBe("5000px");
    } finally {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: previousDpr });
    }
  });

  it("draws merged column row and cell styles with spans and formatted display values", () => {
    const { canvas, operations } = createRecordingCanvas();
    const styleResolver = createStyleCatalogResolver(
      {
        cellStyles: {
          columnStyle: {
            backgroundColor: "#e0f2fe",
            hAlign: "center",
          },
          rowStyle: {
            color: "#854d0e",
            vAlign: "middle",
          },
          alertCell: {
            fontFamily: "Courier New",
            fontSize: 14,
            color: "#991b1b",
            fontWeight: "bold",
            fontStyle: "italic",
            backgroundColor: "#fee2e2",
            hAlign: "right",
            vAlign: "bottom",
            borderTop: { style: "thick", color: "#ef4444" },
            borderRight: { style: "dashed", color: "#f59e0b" },
            borderBottom: { style: "dotted", color: "#10b981" },
            borderLeft: { style: "medium", color: "#7c3aed" },
            wrapText: false,
            textRotation: 15,
            format: "upper",
          },
        },
      },
      pluginRegistry,
    );

    drawSheet({
      canvas,
      columns: [{ width: 80, style: "columnStyle" }, { width: 100 }],
      rows: [
        {
          row: {
            height: 30,
            style: "rowStyle",
            cells: [{ column: 0, colspan: 2, rowspan: 1, value: "alert", style: "alertCell", comment: "需要复核" }],
          },
        },
        {
          row: {
            height: 30,
            hidden: true,
            cells: [{ column: 0, value: "hidden" }],
          },
        },
      ],
      data: {},
      defaultColumnWidth: 90,
      defaultRowHeight: 24,
      styleResolver,
    } as Parameters<typeof drawSheet>[0] & { styleResolver: typeof styleResolver });

    expect(canvas.width).toBe(180);
    expect(canvas.height).toBe(30);
    expect(operations).toContainEqual({ name: "fillStyle", args: ["#fee2e2"] });
    expect(operations).toContainEqual({ name: "fillRect", args: [0, 0, 180, 30] });
    expect(operations).toContainEqual({ name: "font", args: ["italic bold 14px Courier New"] });
    expect(operations).toContainEqual({ name: "textAlign", args: ["right"] });
    expect(operations).toContainEqual({ name: "textBaseline", args: ["bottom"] });
    expect(operations).toContainEqual({ name: "translate", args: [172, 22] });
    expect(operations).toContainEqual({ name: "fillText", args: ["ALERT", 0, 0, 164] });
    expect(operations).toContainEqual({ name: "rotate", args: [Math.PI / 12] });
    expect(operations).toContainEqual({ name: "lineWidth", args: [3] });
    expect(operations).toContainEqual({ name: "strokeStyle", args: ["#ef4444"] });
    expect(operations).toContainEqual({ name: "fill", args: [] });
  });

  it("resolves formulas against rendered sheet cell addresses", () => {
    const { canvas, operations } = createRecordingCanvas();

    drawSheet({
      canvas,
      columns: [{ width: 80 }, { width: 80 }, { width: 80 }],
      rows: [
        {
          row: {
            height: 24,
            cells: [
              { column: 0, value: 2 },
              { column: 1, value: 3 },
              { column: 2, formula: "=SUM(A1:B1)" },
            ],
          },
        },
      ],
      data: {},
    });

    expect(operations).toContainEqual({ name: "fillText", args: ["5", 168, 8, 64] });
  });
});
