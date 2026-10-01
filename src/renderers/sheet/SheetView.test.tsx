import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookDefinition } from "../../schema/generated-types";

const frozenSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "frozen-sheet",
      name: "冻结窗格",
      label: "冻结窗格",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 120,
      defaultRowHeight: 36,
      columns: [{ width: 120 }, { width: 120 }, { width: 120 }, { width: 120 }],
      rows: [
        {
          cells: [
            { column: 0, value: "R0C0" },
            { column: 1, value: "R0C1" },
            { column: 2, value: "R0C2" },
            { column: 3, value: "R0C3" },
          ],
        },
        {
          cells: [
            { column: 0, value: "R1C0" },
            { column: 1, value: "R1C1" },
            { column: 2, value: "R1C2" },
            { column: 3, value: "R1C3" },
          ],
        },
        {
          cells: [
            { column: 0, value: "R2C0" },
            { column: 1, value: "R2C1" },
            { column: 2, value: "R2C2" },
            { column: 3, value: "R2C3" },
          ],
        },
        {
          cells: [
            { column: 0, value: "R3C0" },
            { column: 1, value: "R3C1" },
            { column: 2, value: "R3C2" },
            { column: 3, value: "R3C3" },
          ],
        },
      ],
    },
  ],
};

const frozenSheetWithOverlaysFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {
    owner: "王五",
  },
  assets: {
    logo: {
      type: "image",
      src: "https://assets.example/sheet-logo.png",
    },
  },
  views: [
    {
      type: "sheet",
      id: "frozen-sheet-overlays",
      name: "冻结覆盖层",
      label: "冻结覆盖层",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
      rows: [
        {
          cells: [
            { column: 0, value: "H0" },
            { column: 1, value: "H1" },
            { column: 2, value: "H2" },
          ],
        },
        {
          cells: [
            { column: 0, value: "R1C0" },
            { column: 1, value: "R1C1" },
            { column: 2, value: "R1C2" },
          ],
        },
        {
          cells: [
            { column: 0, value: "R2C0" },
            { column: 1, value: "R2C1" },
            { column: 2, value: "R2C2" },
          ],
        },
      ],
      images: [
        { src: "logo", column: 0, row: 0, colOffset: 8, rowOffset: 6, width: 24, height: 18 },
        { src: "logo", column: 2, row: 2, colOffset: 5, rowOffset: 4, width: 30, height: 20 },
      ],
      forms: [
        {
          type: "form",
          fields: [
            {
              name: "owner",
              type: "string",
              label: "负责人",
              bind: { path: "owner", mode: "twoWay" },
            },
          ],
          config: {
            submitLabel: "保存",
            resetLabel: "重置",
          },
        },
      ],
    },
  ],
};

const largeSheetColumns = Array.from({ length: 20 }, () => ({ width: 100 })) as [
  { width: number },
  ...{ width: number }[],
];
const largeSheetRows = Array.from({ length: 50 }, (_, rowIndex) => ({
  cells: Array.from({ length: 20 }, (_cell, columnIndex) => ({
    column: columnIndex,
    value: `R${rowIndex}C${columnIndex}`,
  })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
})) as [
  { cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] },
  ...{ cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] }[],
];

const largeSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "large-sheet",
      name: "大表格",
      label: "大表格",
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: largeSheetColumns,
      rows: largeSheetRows,
    },
  ],
};

const mediumFrozenSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "medium-frozen-sheet",
      name: "中等宽度冻结表",
      label: "中等宽度冻结表",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: [
        { width: 180 },
        { width: 110 },
        { width: 96 },
        { width: 82 },
        { width: 110 },
        { width: 78 },
        { width: 96 },
      ],
      rows: Array.from({ length: 12 }, (_, rowIndex) => ({
        height: 32,
        cells: Array.from({ length: 7 }, (_cell, columnIndex) => ({
          column: columnIndex,
          value: `R${rowIndex}C${columnIndex}`,
        })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
      })) as [
        { height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] },
        ...{ height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] }[],
      ],
      forms: [
        {
          type: "form",
          fields: [{ name: "owner", type: "string", label: "台账负责人" }],
        },
      ],
    },
  ],
};

const wideFrozenSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "wide-frozen-sheet",
      name: "宽台账",
      label: "宽台账",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 140,
      defaultRowHeight: 32,
      columns: Array.from({ length: 8 }, () => ({ width: 140 })) as [{ width: number }, ...{ width: number }[]],
      rows: [
        {
          cells: Array.from({ length: 8 }, (_cell, columnIndex) => ({
            column: columnIndex,
            value: `H${columnIndex}`,
          })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
        },
        {
          cells: Array.from({ length: 8 }, (_cell, columnIndex) => ({
            column: columnIndex,
            value: `R${columnIndex}`,
          })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
        },
      ],
    },
  ],
};

const tallFrozenSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "tall-frozen-sheet",
      name: "高冻结表",
      label: "高冻结表",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: [
        { width: 180 },
        { width: 110 },
        { width: 96 },
        { width: 82 },
        { width: 110 },
        { width: 78 },
        { width: 96 },
      ],
      rows: Array.from({ length: 20 }, (_, rowIndex) => ({
        height: 32,
        cells: Array.from({ length: 7 }, (_cell, columnIndex) => ({
          column: columnIndex,
          value: `R${rowIndex}C${columnIndex}`,
        })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
      })) as [
        { height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] },
        ...{ height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] }[],
      ],
    },
  ],
};

const tallNonFrozenSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "tall-non-frozen-sheet",
      name: "高非冻结表",
      label: "高非冻结表",
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: [
        { width: 180 },
        { width: 110 },
        { width: 96 },
        { width: 82 },
        { width: 110 },
        { width: 78 },
        { width: 96 },
      ],
      rows: Array.from({ length: 20 }, (_, rowIndex) => ({
        height: 32,
        cells: Array.from({ length: 7 }, (_cell, columnIndex) => ({
          column: columnIndex,
          value: `R${rowIndex}C${columnIndex}`,
        })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
      })) as [
        { height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] },
        ...{ height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] }[],
      ],
    },
  ],
};

const stretchSheetFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "sheet",
      id: "stretch-sheet",
      name: "自适应台账",
      label: "自适应台账",
      widthMode: "stretch",
      frozenRows: 1,
      frozenCols: 1,
      defaultColumnWidth: 100,
      defaultRowHeight: 32,
      columns: [
        { width: 180 },
        { width: 110 },
        { width: 96 },
        { width: 82 },
        { width: 110 },
        { width: 78 },
        { width: 96 },
      ],
      rows: Array.from({ length: 12 }, (_, rowIndex) => ({
        height: 32,
        cells: Array.from({ length: 7 }, (_cell, columnIndex) => ({
          column: columnIndex,
          value: `R${rowIndex}C${columnIndex}`,
        })) as [{ column: number; value: string }, ...{ column: number; value: string }[]],
      })) as [
        { height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] },
        ...{ height: number; cells: [{ column: number; value: string }, ...{ column: number; value: string }[]] }[],
      ],
    },
  ],
};

function installImmediateResizeObserver(width: number) {
  const originalResizeObserver = window.ResizeObserver;
  class ImmediateResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      this.callback([{ target, contentRect: { width } as DOMRectReadOnly } as ResizeObserverEntry], this);
    }

    unobserve() {}

    disconnect() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ImmediateResizeObserver,
  });
  return () => {
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: originalResizeObserver,
    });
  };
}

describe("SheetView", () => {
  it("renders frozen panes and keeps top/left panes aligned during body scrolling", () => {
    render(<DocumentRenderer workbook={frozenSheetFixture} />);

    const cornerPane = screen.getByTestId("bf-sheet-pane-corner");
    const topPane = screen.getByTestId("bf-sheet-pane-top");
    const leftPane = screen.getByTestId("bf-sheet-pane-left");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");
    const topCanvas = screen.getByTestId("bf-sheet-pane-top-canvas");
    const leftCanvas = screen.getByTestId("bf-sheet-pane-left-canvas");

    expect(cornerPane.querySelector("canvas")).not.toBeNull();
    expect(topPane.querySelector("canvas")).not.toBeNull();
    expect(leftPane.querySelector("canvas")).not.toBeNull();
    expect(bodyPane.querySelector("canvas")).not.toBeNull();

    Object.defineProperty(bodyPane, "scrollLeft", { configurable: true, value: 140 });
    Object.defineProperty(bodyPane, "scrollTop", { configurable: true, value: 72 });

    fireEvent.scroll(bodyPane);

    expect(topCanvas.parentElement?.style.transform).toBe("translateX(-140px)");
    expect(leftCanvas.parentElement?.style.transform).toBe("translateY(-72px)");
  });

  it("renders frozen-pane image overlays and embedded sheet forms", () => {
    render(<DocumentRenderer workbook={frozenSheetWithOverlaysFixture} />);

    const cornerPane = screen.getByTestId("bf-sheet-pane-corner");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");
    const cornerImage = within(cornerPane).getByTestId("bf-sheet-image-0") as HTMLImageElement;
    const bodyImage = within(bodyPane).getByTestId("bf-sheet-image-1") as HTMLImageElement;

    expect(cornerImage.getAttribute("src")).toBe("https://assets.example/sheet-logo.png");
    expect(cornerImage.style.left).toBe("8px");
    expect(cornerImage.style.top).toBe("6px");
    expect(cornerImage.style.width).toBe("24px");
    expect(cornerImage.style.height).toBe("18px");

    expect(bodyImage.style.left).toBe("105px");
    expect(bodyImage.style.top).toBe("36px");
    expect(bodyImage.style.width).toBe("30px");
    expect(bodyImage.style.height).toBe("20px");

    expect((screen.getByRole("textbox", { name: "负责人" }) as HTMLInputElement).value).toBe("王五");
  });

  it("virtualizes large non-frozen sheets inside a scrollable viewport", () => {
    render(<DocumentRenderer workbook={largeSheetFixture} />);

    const viewport = screen.getByTestId("bf-sheet-scroll-viewport");
    const canvas = screen.getByTestId("bf-sheet-virtual-canvas") as HTMLCanvasElement;
    const layer = screen.getByTestId("bf-sheet-layer");

    expect(layer.style.width).toBe("2000px");
    expect(layer.style.height).toBe("1600px");
    expect(canvas.width).toBeLessThan(2000);
    expect(canvas.height).toBeLessThan(1600);

    Object.defineProperty(viewport, "scrollLeft", { configurable: true, value: 250 });
    Object.defineProperty(viewport, "scrollTop", { configurable: true, value: 96 });

    fireEvent.scroll(viewport);

    expect(canvas.style.left).toBe("100px");
    expect(canvas.style.top).toBe("64px");
  });

  it("uses available width for medium frozen sheets and keeps forms separated from the viewport", () => {
    render(<DocumentRenderer workbook={mediumFrozenSheetFixture} />);

    const viewport = screen.getByTestId("bf-sheet-viewport");
    const bodyLayer = screen.getByTestId("bf-sheet-pane-body-layer");
    const forms = screen.getByTestId("bf-sheet-forms");

    expect(viewport.style.width).toBe("752px");
    expect(bodyLayer.style.width).toBe("572px");
    expect(forms.classList.contains("bf-workbook-sheet-forms")).toBe(true);
  });

  it("expands non-embedded sheet viewport to the observed container width", async () => {
    const restoreResizeObserver = installImmediateResizeObserver(1200);
    try {
      render(<DocumentRenderer workbook={wideFrozenSheetFixture} />);

      await waitFor(() => {
        expect(screen.getByTestId("bf-sheet-viewport").style.width).toBe("1120px");
      });
    } finally {
      restoreResizeObserver();
    }
  });

  it("reserves vertical scrollbar space in frozen viewport so the last column is not clipped", () => {
    render(<DocumentRenderer workbook={tallFrozenSheetFixture} />);

    const viewport = screen.getByTestId("bf-sheet-viewport");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");
    const bodyLayer = screen.getByTestId("bf-sheet-pane-body-layer");

    // 内容宽度 752 + 滚动条预留 15，视口不再刚好等于内容宽度
    expect(viewport.style.width).toBe("767px");
    // body pane（去掉冻结列 180）与 body layer 对齐，最后一列可见
    expect(bodyPane.style.width).toBe("587px");
    expect(bodyPane.style.overflowX).toBe("hidden");
    expect(bodyLayer.style.width).toBe("572px");
  });

  it("reserves vertical scrollbar space in non-frozen virtualized viewport", () => {
    render(<DocumentRenderer workbook={tallNonFrozenSheetFixture} />);

    const viewport = screen.getByTestId("bf-sheet-scroll-viewport");

    expect(viewport.style.width).toBe("767px");
    expect(viewport.style.overflowX).toBe("hidden");
  });

  it("keeps horizontal overflow when the container is narrower than the sheet content", async () => {
    const restoreResizeObserver = installImmediateResizeObserver(500);
    try {
      render(<DocumentRenderer workbook={tallFrozenSheetFixture} />);

      await waitFor(() => {
        const bodyPane = screen.getByTestId("bf-sheet-pane-body");
        // 视口被容器限制为 500，body pane 保留横向滚动
        expect(bodyPane.style.width).toBe("320px");
        expect(bodyPane.style.overflowX).toBe("auto");
      });
    } finally {
      restoreResizeObserver();
    }
  });

  it("stretches sheet columns to fill a wider container in widthMode stretch", async () => {
    const restoreResizeObserver = installImmediateResizeObserver(1200);
    try {
      render(<DocumentRenderer workbook={stretchSheetFixture} />);

      await waitFor(() => {
        // 自然宽度 752，容器 1200 → 铺满可用宽度（12 行无纵向溢出，无需滚动条预留）
        expect(screen.getByTestId("bf-sheet-viewport").style.width).toBe("1200px");
      });

      const bodyPane = screen.getByTestId("bf-sheet-pane-body");
      expect(bodyPane.style.overflowX).toBe("hidden");
      // 冻结列也参与拉伸：corner canvas 宽度大于自然列宽 180
      const cornerCanvas = screen.getByTestId("bf-sheet-pane-corner").querySelector("canvas") as HTMLCanvasElement;
      expect(cornerCanvas.width).toBeGreaterThan(180);
    } finally {
      restoreResizeObserver();
    }
  });

  it("keeps natural width and centers the sheet in fixed mode", async () => {
    const restoreResizeObserver = installImmediateResizeObserver(1200);
    try {
      render(<DocumentRenderer workbook={mediumFrozenSheetFixture} />);

      await waitFor(() => {
        const viewport = screen.getByTestId("bf-sheet-viewport");
        // fixed 不拉伸：保持自然列宽 752，并在宽容器中居中
        expect(viewport.style.width).toBe("752px");
        expect(viewport.style.margin).toBe("0px auto");
      });
    } finally {
      restoreResizeObserver();
    }
  });
});
