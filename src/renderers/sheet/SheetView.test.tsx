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

function createEmbeddedSheetWorkbook(pageWidth: number, blockHeight = 130): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "page",
        pageSettings: { width: pageWidth, height: 320, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 },
        content: [
          {
            type: "spreadsheet",
            renderHints: { height: blockHeight },
            sheet: {
              name: "验收台账摘要",
              frozenRows: 1,
              frozenCols: 1,
              columns: [{ width: 180 }, { width: 92 }, { width: 82 }, { width: 82 }],
              rows: [
                {
                  height: 30,
                  cells: [
                    { column: 0, value: "任务" },
                    { column: 1, value: "进度" },
                    { column: 2, value: "风险" },
                    { column: 3, value: "状态" },
                  ],
                },
                {
                  height: 28,
                  cells: [
                    { column: 0, value: "打印模板验收" },
                    { column: 1, value: 82 },
                    { column: 2, value: "中" },
                    { column: 3, value: "复核中" },
                  ],
                },
                {
                  height: 28,
                  cells: [
                    { column: 0, value: "PDF 二进制导出" },
                    { column: 1, value: 68 },
                    { column: 2, value: "高" },
                    { column: 3, value: "待确认" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

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

  it("fits embedded sheet viewports to the host block and drops the horizontal scrollbar", () => {
    render(<DocumentRenderer workbook={createEmbeddedSheetWorkbook(650)} />);

    const viewport = screen.getByTestId("bf-sheet-viewport");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");

    // 宿主块宽 650 ≥ 内容宽 436：按内容尺寸渲染，不产生多余横向滚动条
    expect(viewport.style.width).toBe("436px");
    expect(viewport.style.height).toBe("86px");
    expect(bodyPane.style.overflowX).toBe("hidden");
    // 无纵向溢出时不保留滚动条槽位，避免最后一列被幽灵宽度裁掉
    expect(bodyPane.style.scrollbarGutter).toBe("");
  });

  it("reserves viewport height for the horizontal scrollbar of a narrow embedded sheet", () => {
    render(<DocumentRenderer workbook={createEmbeddedSheetWorkbook(300)} />);

    const viewport = screen.getByTestId("bf-sheet-viewport");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");

    // 宿主仅 300 宽：视口约束为 300，横向滚动条出现
    expect(viewport.style.width).toBe("300px");
    expect(bodyPane.style.overflowX).toBe("auto");
    expect(bodyPane.style.scrollbarGutter).toBe("");
    // 视口高度 = 内容 86 + 横向滚动条预留 15，最后一行不会被滚动条裁掉
    expect(viewport.style.height).toBe("101px");
    expect(bodyPane.style.height).toBe("71px");
  });

  it("caps the embedded viewport at the host block height and scrolls vertically", () => {
    render(<DocumentRenderer workbook={createEmbeddedSheetWorkbook(650, 80)} />);

    const viewport = screen.getByTestId("bf-sheet-viewport");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");

    // 块高 80 < 内容 86：视口以块高为上限，出现纵向滚动
    expect(viewport.style.height).toBe("80px");
    expect(bodyPane.style.overflowY).toBe("auto");
    expect(bodyPane.style.scrollbarGutter).toBe("stable");
    // 纵向滚动条占宽 15，在视口宽度中预留，最后一列不被裁掉
    expect(viewport.style.width).toBe("451px");
  });
});
