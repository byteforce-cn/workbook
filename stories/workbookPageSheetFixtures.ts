import type { PageViewDefinition, SheetCellDefinition, SheetViewDefinition } from "../src/core/types";
import type { WorkbookDefinition } from "../src/schema/generated-types";

/**
 * Inline SVG data URI used as a local, dependency-free asset for the image
 * watermark / floating block demos. Keeps stories self-contained (no network).
 */
export const SEAL_SVG_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='14' fill='#1e40af'/><circle cx='60' cy='60' r='44' fill='none' stroke='#bfdbfe' stroke-width='4'/><text x='60' y='74' font-size='34' text-anchor='middle' fill='#ffffff' font-weight='bold'>BF</text></svg>`,
  );

type WatermarkBlock = Extract<PageViewDefinition["content"][number], { type: "watermark" }>;
type PageTableRows = Extract<PageViewDefinition["content"][number], { type: "table" }>["rows"];
type SheetCells = [SheetCellDefinition, ...SheetCellDefinition[]];
type SheetRows = NonNullable<SheetViewDefinition["rows"]>;

/* ------------------------------------------------------------------ */
/* Page: Watermarks                                                    */
/* ------------------------------------------------------------------ */

export type WatermarkMode = "text-single" | "text-tiled" | "image-tiled";

function createWatermarkBlock(mode: WatermarkMode): WatermarkBlock {
  switch (mode) {
    case "text-single":
      return { type: "watermark", text: "机密", fontSize: 56, color: "#dc2626", opacity: 0.14, rotation: -30 };
    case "text-tiled":
      return {
        type: "watermark",
        text: "BYTEFORCE",
        fontSize: 40,
        color: "#cbd5e1",
        opacity: 0.55,
        rotation: -28,
        repeat: true,
      };
    case "image-tiled":
      return { type: "watermark", text: "", image: "seal", repeat: true, opacity: 0.16, rotation: -18 };
  }
}

export function createWatermarkWorkbook(mode: WatermarkMode): WorkbookDefinition {
  const label =
    mode === "text-single" ? "文本水印 · 居中" : mode === "text-tiled" ? "文本水印 · 平铺" : "图片水印 · 平铺";

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    assets: mode === "image-tiled" ? { seal: { src: SEAL_SVG_DATA_URI, type: "image/svg+xml" } } : undefined,
    views: [
      {
        type: "page",
        id: "watermark-demo",
        label,
        pageSettings: { width: 595, height: 842, marginTop: 72, marginLeft: 72, marginRight: 72, marginBottom: 72 },
        content: [
          createWatermarkBlock(mode),
          { type: "paragraph", runs: [{ type: "text", text: "这是一份受水印保护的交付文档，水印层叠加于正文之上。" }] },
          {
            type: "paragraph",
            runs: [{ type: "text", text: "支持文本水印与图片水印，可配置旋转角度、透明度与平铺方式。" }],
          },
          { type: "paragraph", runs: [{ type: "text", text: "水印不参与文档流排版，不阻塞正文阅读。" }] },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Page: Headers & Footers                                             */
/* ------------------------------------------------------------------ */

export function createHeadersFootersWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "page",
        id: "headers-footers-demo",
        label: "页眉页脚分页规则",
        pageSettings: { width: 595, height: 842, marginTop: 72, marginLeft: 72, marginRight: 72, marginBottom: 72 },
        content: [
          {
            type: "header",
            alignment: "right",
            showOnFirstPage: true,
            content: [{ type: "paragraph", runs: [{ type: "text", text: "首页页眉 · 北区交付台账" }] }],
          },
          {
            type: "header",
            alignment: "left",
            showOnEvenPages: true,
            content: [{ type: "paragraph", runs: [{ type: "text", text: "偶数页页眉 · 内部资料" }] }],
          },
          {
            type: "footer",
            alignment: "center",
            showOnOddPages: true,
            content: [{ type: "paragraph", runs: [{ type: "text", text: "奇数页页脚 · 请勿外传" }] }],
          },
          {
            type: "footer",
            alignment: "right",
            showOnEvenPages: true,
            content: [{ type: "paragraph", runs: [{ type: "text", text: "偶数页页脚" }] }],
          },
          { type: "paragraph", runs: [{ type: "text", text: "第一页正文：首页页眉右对齐显示，奇数页页脚居中显示。" }] },
          { type: "page-break" },
          {
            type: "paragraph",
            runs: [
              { type: "text", text: "第二页正文：偶数页页眉左对齐显示、偶数页页脚右对齐显示，首页页眉不再出现。" },
            ],
          },
          { type: "page-break" },
          { type: "paragraph", runs: [{ type: "text", text: "第三页正文：奇数页页脚居中再次出现，偶数页规则隐藏。" }] },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Page: Floating blocks                                               */
/* ------------------------------------------------------------------ */

export function createFloatingBlocksWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    assets: { badge: { src: SEAL_SVG_DATA_URI, type: "image/svg+xml" } },
    views: [
      {
        type: "page",
        id: "floating-blocks-demo",
        label: "浮动块定位",
        pageSettings: { width: 600, height: 800, marginTop: 72, marginLeft: 72, marginRight: 72, marginBottom: 72 },
        content: [
          {
            type: "floating",
            layout: { x: 36, y: 48, width: 220, height: 64 },
            content: { type: "paragraph", runs: [{ type: "text", text: "绝对定位（x=36, y=48）" }] },
          },
          {
            type: "floating",
            layout: { x: "50%", y: "25%", width: "24%", height: "12%" },
            content: { type: "image", src: "badge", alt: "浮动图章", width: 90, height: 90 },
          },
          { type: "paragraph", runs: [{ type: "text", text: "正文流不受浮动块影响，浮动块悬浮于页面之上。" }] },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Page: Complex tables                                                */
/* ------------------------------------------------------------------ */

export function createComplexTablesWorkbook(): WorkbookDefinition {
  const mergedRows: PageTableRows = [
    {
      height: 40,
      cells: [
        {
          colSpan: 2,
          content: [{ type: "paragraph", alignment: "center", runs: [{ type: "text", text: "合并标题 A" }] }],
        },
        {
          colSpan: 2,
          content: [{ type: "paragraph", alignment: "center", runs: [{ type: "text", text: "合并标题 B" }] }],
        },
      ],
    },
    {
      height: 44,
      cells: [
        { rowSpan: 2, content: [{ type: "paragraph", runs: [{ type: "text", text: "垂直合并" }] }] },
        { content: [{ type: "paragraph", runs: [{ type: "text", text: "C1" }] }] },
        { content: [{ type: "paragraph", runs: [{ type: "text", text: "C2" }] }] },
        { content: [{ type: "paragraph", runs: [{ type: "text", text: "C3" }] }] },
      ],
    },
    {
      height: 44,
      cells: [
        // 第 0 列已被上一行 rowSpan=2 的「垂直合并」占用，因此本行只有
        // 3 个可用列：C4（第 1 列）+ 水平合并（第 2-3 列）。4 列表格中
        // 已无第 5 列可容纳额外的 C6，若保留会挤压/错位渲染。
        { content: [{ type: "paragraph", runs: [{ type: "text", text: "C4" }] }] },
        { colSpan: 2, content: [{ type: "paragraph", runs: [{ type: "text", text: "水平合并" }] }] },
      ],
    },
  ];

  const crossPageRows = Array.from({ length: 40 }, (_, index) => ({
    height: 32,
    cells: [
      { content: [{ type: "paragraph", runs: [{ type: "text", text: `条目 ${index + 1}` }] }] },
      { content: [{ type: "paragraph", runs: [{ type: "text", text: index % 2 === 0 ? "已确认" : "待复核" }] }] },
      {
        content: [
          { type: "paragraph", runs: [{ type: "text", text: `￥${((index + 1) * 1200).toLocaleString("zh-CN")}` }] },
        ],
      },
    ],
  })) as unknown as PageTableRows;

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "page",
        id: "complex-tables-demo",
        label: "复杂表格",
        pageSettings: { width: 600, height: 720, marginTop: 72, marginLeft: 72, marginRight: 72, marginBottom: 72 },
        content: [
          { type: "paragraph", runs: [{ type: "text", text: "合并单元格：colSpan / rowSpan", fontWeight: "bold" }] },
          {
            type: "table",
            columns: [150, 150, 150, 150],
            border: { style: "thin", color: "#334155" },
            rows: mergedRows,
          },
          { type: "paragraph", runs: [{ type: "text", text: "跨页拆分：40 行明细表自动跨页", fontWeight: "bold" }] },
          { type: "table", columns: [200, 180, 180], border: { style: "thin", color: "#334155" }, rows: crossPageRows },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Sheet: Frozen panes                                                 */
/* ------------------------------------------------------------------ */

export function createFrozenPanesWorkbook(): WorkbookDefinition {
  const headerCells: SheetCells = [
    { column: 0, value: "任务编号", style: "sheetHeader" },
    { column: 1, value: "任务名称", style: "sheetHeader" },
    { column: 2, value: "负责人", style: "sheetHeader" },
    { column: 3, value: "截止日期", style: "sheetHeader" },
    { column: 4, value: "状态", style: "sheetHeader" },
  ];

  const rows: SheetRows = [
    { height: 36, cells: headerCells },
    ...Array.from({ length: 14 }, (_, rowIndex) => ({
      height: 32,
      cells: Array.from({ length: 5 }, (_, column) => ({
        column,
        value: `R${rowIndex + 1}C${column + 1}`,
      })) as unknown as SheetCells,
    })),
  ];

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    styles: {
      cellStyles: {
        sheetHeader: { fontWeight: "bold", backgroundColor: "#eef2f7", hAlign: "center", vAlign: "middle" },
      },
    },
    views: [
      {
        type: "sheet",
        id: "frozen-panes-demo",
        label: "冻结窗格",
        name: "冻结窗格",
        frozenRows: 1,
        frozenCols: 1,
        columns: [{ width: 120 }, { width: 180 }, { width: 160 }, { width: 160 }, { width: 160 }],
        rows,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Sheet: Adaptive width (widthMode)                                   */
/* ------------------------------------------------------------------ */

/**
 * 自适应宽度台账：同一份列定义在 fixed / stretch 两种宽度模式下切换。
 * 自然列宽合计 610px（90+120+100+80+90+70+60），第二列带 maxWidth 上限，
 * stretch 时多余宽度按比例分配给各列（受 maxWidth 约束）铺满容器。
 * 12 行（36 + 11×32 = 388 < 420）无纵向溢出，便于 e2e 精确断言宽度。
 */
export function createStretchWorkbook(widthMode: "fixed" | "stretch"): WorkbookDefinition {
  const headerCells: SheetCells = [
    { column: 0, value: "任务编号", style: "sheetHeader" },
    { column: 1, value: "任务名称", style: "sheetHeader" },
    { column: 2, value: "负责人", style: "sheetHeader" },
    { column: 3, value: "截止日期", style: "sheetHeader" },
    { column: 4, value: "预算", style: "sheetHeader" },
    { column: 5, value: "风险", style: "sheetHeader" },
    { column: 6, value: "状态", style: "sheetHeader" },
  ];

  const rows: SheetRows = [
    { height: 36, cells: headerCells },
    ...Array.from({ length: 11 }, (_, rowIndex) => ({
      height: 32,
      cells: Array.from({ length: 7 }, (_, column) => ({
        column,
        value: `R${rowIndex + 1}C${column + 1}`,
      })) as unknown as SheetCells,
    })),
  ];

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    styles: {
      cellStyles: {
        sheetHeader: { fontWeight: "bold", backgroundColor: "#eef2f7", hAlign: "center", vAlign: "middle" },
      },
    },
    views: [
      {
        type: "sheet",
        id: "stretch-width-demo",
        label: "自适应宽度台账",
        name: "自适应宽度台账",
        widthMode,
        frozenRows: 1,
        frozenCols: 1,
        defaultColumnWidth: 100,
        defaultRowHeight: 32,
        columns: [
          { width: 90, minWidth: 60 },
          { width: 120, maxWidth: 180 },
          { width: 100 },
          { width: 80 },
          { width: 90 },
          { width: 70 },
          { width: 60 },
        ],
        rows,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Sheet: Formulas                                                     */
/* ------------------------------------------------------------------ */

export function createFormulasWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    styles: {
      cellStyles: {
        sheetHeader: { fontWeight: "bold", backgroundColor: "#eef2f7", hAlign: "center", vAlign: "middle" },
        sheetTotal: { fontWeight: "bold", backgroundColor: "#f1f5f9" },
      },
    },
    views: [
      {
        type: "sheet",
        id: "formulas-demo",
        label: "公式计算",
        name: "工程预算",
        columns: [{ width: 160 }, { width: 90 }, { width: 110 }, { width: 130 }],
        rows: [
          {
            height: 36,
            cells: [
              { column: 0, value: "名称", style: "sheetHeader" },
              { column: 1, value: "数量", style: "sheetHeader" },
              { column: 2, value: "单价", style: "sheetHeader" },
              { column: 3, value: "小计", style: "sheetHeader" },
            ],
          },
          {
            height: 32,
            cells: [
              { column: 0, value: "服务器" },
              { column: 1, value: 2 },
              { column: 2, value: 12000, format: "currency" },
              { column: 3, formula: "=B2*C2", format: "currency" },
            ],
          },
          {
            height: 32,
            cells: [
              { column: 0, value: "交换机" },
              { column: 1, value: 4 },
              { column: 2, value: 3500, format: "currency" },
              { column: 3, formula: "=B3*C3", format: "currency" },
            ],
          },
          {
            height: 32,
            cells: [
              { column: 0, value: "机柜" },
              { column: 1, value: 2 },
              { column: 2, value: 6800, format: "currency" },
              { column: 3, formula: "=B4*C4", format: "currency" },
            ],
          },
          {
            height: 32,
            cells: [
              { column: 0, value: "UPS" },
              { column: 1, value: 1 },
              { column: 2, value: 15000, format: "currency" },
              { column: 3, formula: "=B5*C5", format: "currency" },
            ],
          },
          {
            height: 36,
            style: "sheetTotal",
            cells: [
              { column: 0, value: "合计" },
              { column: 1, formula: "=SUM(B2:B5)" },
              { column: 3, formula: "=SUM(D2:D5)", format: "currency" },
            ],
          },
          {
            height: 36,
            cells: [
              { column: 0, value: "统计" },
              { column: 1, formula: "=AVG(B2:B5)" },
              { column: 2, value: "最高单价" },
              { column: 3, formula: "=MAX(C2:C5)", format: "currency" },
            ],
          },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Sheet: Virtual scroll                                               */
/* ------------------------------------------------------------------ */

export function createVirtualScrollWorkbook(): WorkbookDefinition {
  const ledger = Array.from({ length: 300 }, (_, index) => ({
    id: index + 1,
    name: `交付任务 ${index + 1}`,
    owner: ["Alice", "Bob", "Carol", "Dave"][index % 4],
    status: index % 3 === 0 ? "已完成" : index % 3 === 1 ? "进行中" : "待开始",
    amount: 1000 + ((index * 137) % 9000),
    progress: index % 101,
  }));

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { ledger },
    views: [
      {
        type: "sheet",
        id: "virtual-scroll-demo",
        label: "虚拟滚动",
        name: "大规模台账（300 行）",
        columns: [{ width: 90 }, { width: 240 }, { width: 140 }, { width: 130 }, { width: 140 }, { width: 120 }],
        rowBind: {
          path: "ledger",
          rowTemplate: {
            height: 30,
            cellMapping: {
              "0": { bind: { path: "id", mode: "oneWay" } },
              "1": { bind: { path: "name", mode: "oneWay" } },
              "2": { bind: { path: "owner", mode: "oneWay" } },
              "3": { bind: { path: "status", mode: "oneWay" } },
              "4": { bind: { path: "amount", mode: "oneWay" }, format: "currency" },
              "5": { bind: { path: "progress", mode: "oneWay" }, format: "0%" },
            },
          },
        },
      },
    ],
  };
}
