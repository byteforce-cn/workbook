import type { PageViewDefinition, SheetViewDefinition } from "../src/core/types";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { basicWorkbookFixture } from "../tests/fixtures/integration/basicWorkbook";

type PageTableRows = Extract<PageViewDefinition["content"][number], { type: "table" }>["rows"];
type SheetRows = NonNullable<SheetViewDefinition["rows"]>;

const productionLedgerRows = [
  {
    task: "需求基线冻结",
    owner: "产品负责人",
    due: "2026-06-03",
    progress: 100,
    amount: 120000,
    risk: "低",
    status: "已完成",
  },
  {
    task: "打印模板验收",
    owner: "文档工程",
    due: "2026-06-08",
    progress: 82,
    amount: 168000,
    risk: "中",
    status: "复核中",
  },
  {
    task: "Sheet 台账联调",
    owner: "前端平台",
    due: "2026-06-12",
    progress: 74,
    amount: 136000,
    risk: "中",
    status: "复核中",
  },
  {
    task: "PDF 二进制导出",
    owner: "运行时",
    due: "2026-06-16",
    progress: 68,
    amount: 186000,
    risk: "高",
    status: "待确认",
  },
  {
    task: "审计日志回放",
    owner: "质量保障",
    due: "2026-06-20",
    progress: 58,
    amount: 94000,
    risk: "高",
    status: "待确认",
  },
  {
    task: "生产发布检查",
    owner: "交付经理",
    due: "2026-06-26",
    progress: 41,
    amount: 76000,
    risk: "中",
    status: "计划中",
  },
  {
    task: "权限矩阵复核",
    owner: "安全负责人",
    due: "2026-06-27",
    progress: 52,
    amount: 68000,
    risk: "中",
    status: "计划中",
  },
  {
    task: "打印机联调",
    owner: "现场工程",
    due: "2026-06-29",
    progress: 37,
    amount: 42000,
    risk: "高",
    status: "待确认",
  },
  {
    task: "归档目录生成",
    owner: "文档工程",
    due: "2026-07-01",
    progress: 63,
    amount: 56000,
    risk: "低",
    status: "复核中",
  },
  {
    task: "接口回归",
    owner: "后端平台",
    due: "2026-07-03",
    progress: 71,
    amount: 104000,
    risk: "中",
    status: "复核中",
  },
  { task: "异常恢复演练", owner: "SRE", due: "2026-07-05", progress: 46, amount: 88000, risk: "高", status: "待确认" },
  {
    task: "用户验收会议",
    owner: "客户成功",
    due: "2026-07-08",
    progress: 34,
    amount: 36000,
    risk: "中",
    status: "计划中",
  },
  {
    task: "知识库发布",
    owner: "运营支持",
    due: "2026-07-10",
    progress: 29,
    amount: 24000,
    risk: "低",
    status: "计划中",
  },
  {
    task: "发布窗口确认",
    owner: "交付经理",
    due: "2026-07-12",
    progress: 22,
    amount: 18000,
    risk: "中",
    status: "计划中",
  },
  { task: "回滚脚本验收", owner: "SRE", due: "2026-07-14", progress: 18, amount: 52000, risk: "高", status: "待确认" },
  {
    task: "最终签署",
    owner: "项目负责人",
    due: "2026-07-16",
    progress: 12,
    amount: 16000,
    risk: "低",
    status: "计划中",
  },
] as const;

function createReportTableRows(): PageTableRows {
  return [
    {
      height: 36,
      cells: [
        { style: "summaryLabel", content: [{ type: "paragraph", runs: [{ type: "text", text: "项目编号" }] }] },
        {
          style: "summaryValue",
          content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "project.code", mode: "oneWay" } }] }],
        },
        { style: "summaryLabel", content: [{ type: "paragraph", runs: [{ type: "text", text: "负责人" }] }] },
        {
          style: "summaryValue",
          content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "project.owner", mode: "oneWay" } }] }],
        },
      ],
    },
    {
      height: 36,
      cells: [
        { style: "summaryLabel", content: [{ type: "paragraph", runs: [{ type: "text", text: "当前状态" }] }] },
        {
          style: "statusReviewing",
          content: [
            { type: "paragraph", runs: [{ type: "text", bind: { path: "project.statusLabel", mode: "oneWay" } }] },
          ],
        },
        { style: "summaryLabel", content: [{ type: "paragraph", runs: [{ type: "text", text: "风险等级" }] }] },
        {
          style: "statusWarning",
          content: [
            { type: "paragraph", runs: [{ type: "text", bind: { path: "project.riskLabel", mode: "oneWay" } }] },
          ],
        },
      ],
    },
    {
      height: 52,
      cells: [
        { style: "summaryLabel", content: [{ type: "paragraph", runs: [{ type: "text", text: "范围说明" }] }] },
        {
          colSpan: 3,
          style: "summaryValue",
          content: [
            { type: "paragraph", runs: [{ type: "text", bind: { path: "project.description", mode: "oneWay" } }] },
          ],
        },
      ],
    },
  ] as PageTableRows;
}

function createLedgerTableRows(): PageTableRows {
  return [
    {
      height: 34,
      cells: ["任务", "负责人", "截止", "进度", "风险"].map((text) => ({
        style: "tableHeader",
        content: [{ type: "paragraph", runs: [{ type: "text", text }] }],
      })),
    },
    ...productionLedgerRows.map((row, index) => ({
      height: 34,
      cells: [
        {
          style: "summaryValue",
          content: [
            {
              type: "paragraph",
              runs: [{ type: "text", bind: { path: `ledgerRows[${index}].task`, mode: "oneWay" } }],
            },
          ],
        },
        {
          style: "summaryValue",
          content: [
            {
              type: "paragraph",
              runs: [{ type: "text", bind: { path: `ledgerRows[${index}].owner`, mode: "oneWay" } }],
            },
          ],
        },
        {
          style: "summaryValue",
          content: [
            { type: "paragraph", runs: [{ type: "text", bind: { path: `ledgerRows[${index}].due`, mode: "oneWay" } }] },
          ],
        },
        {
          style: "summaryValue",
          content: [
            {
              type: "paragraph",
              runs: [
                { type: "text", bind: { path: `ledgerRows[${index}].progress`, mode: "oneWay" } },
                { type: "text", text: "%" },
              ],
            },
          ],
        },
        {
          style: row.risk === "高" ? "statusBlocked" : row.risk === "中" ? "statusWarning" : "statusApproved",
          content: [
            {
              type: "paragraph",
              runs: [{ type: "text", bind: { path: `ledgerRows[${index}].risk`, mode: "oneWay" } }],
            },
          ],
        },
      ],
    })),
  ] as unknown as PageTableRows;
}

function createLedgerSheetRows(): SheetRows {
  const rows = [
    {
      height: 34,
      cells: [
        { column: 0, value: "任务", style: "sheetHeader" },
        { column: 1, value: "负责人", style: "sheetHeader" },
        { column: 2, value: "截止", style: "sheetHeader" },
        { column: 3, value: "进度", style: "sheetHeader" },
        { column: 4, value: "预算", style: "sheetHeader" },
        { column: 5, value: "风险", style: "sheetHeader" },
        { column: 6, value: "状态", style: "sheetHeader" },
      ],
    },
    ...productionLedgerRows.map((row, index) => ({
      height: 32,
      cells: [
        { column: 0, bind: { path: `ledgerRows[${index}].task`, mode: "oneWay" }, style: "sheetText" },
        { column: 1, bind: { path: `ledgerRows[${index}].owner`, mode: "oneWay" }, style: "sheetText" },
        { column: 2, bind: { path: `ledgerRows[${index}].due`, mode: "oneWay" }, style: "sheetText" },
        {
          column: 3,
          bind: { path: `ledgerRows[${index}].progress`, mode: "oneWay" },
          style: index >= 3 ? "sheetWarning" : "sheetDone",
          format: "0%",
        },
        {
          column: 4,
          bind: { path: `ledgerRows[${index}].amount`, mode: "oneWay" },
          style: "sheetCurrency",
          format: "currency",
        },
        {
          column: 5,
          bind: { path: `ledgerRows[${index}].risk`, mode: "oneWay" },
          style: row.risk === "高" ? "sheetCritical" : row.risk === "中" ? "sheetWarning" : "sheetDone",
        },
        {
          column: 6,
          bind: { path: `ledgerRows[${index}].status`, mode: "oneWay" },
          style: "sheetText",
          comment: row.risk === "高" ? "需要管理层复核" : undefined,
        },
      ],
    })),
    {
      height: 36,
      cells: [
        { column: 0, value: "合计", colspan: 4, style: "sheetHeader" },
        {
          column: 4,
          formula: `=SUM(E2:E${productionLedgerRows.length + 1})`,
          style: "sheetCurrency",
          format: "currency",
        },
        { column: 5, value: "2 项高风险", colspan: 2, style: "sheetCritical" },
      ],
    },
  ];
  return rows as unknown as SheetRows;
}

function cloneWorkbook(): WorkbookDefinition {
  return structuredClone(basicWorkbookFixture);
}

function createSingleViewWorkbook(viewId: string): WorkbookDefinition {
  const workbook = cloneWorkbook();
  const selectedView = workbook.views.find((view) => view.id === viewId);

  if (selectedView == null) {
    throw new Error(`Workbook story fixture is missing view: ${viewId}`);
  }

  workbook.views = [selectedView];
  return workbook;
}

export function createAllViewsWorkbook(): WorkbookDefinition {
  return cloneWorkbook();
}

export function createFormWorkbook(): WorkbookDefinition {
  return createSingleViewWorkbook("editor");
}

export function createPageWorkbook(): WorkbookDefinition {
  return createSingleViewWorkbook("preview");
}

export function createSheetWorkbook(): WorkbookDefinition {
  return createSingleViewWorkbook("sheet");
}

export function createPagedPrintWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {
      projectName: "北区交付台账",
    },
    printConfig: {
      copies: 2,
      collate: true,
      orientation: "portrait",
      scale: "fitToPage",
    },
    views: [
      {
        type: "page",
        id: "paged-print-export",
        label: "自动分页与 PDF 输出",
        pageSettings: {
          width: 560,
          height: 760,
          marginTop: 72,
          marginRight: 52,
          marginBottom: 70,
          marginLeft: 52,
          defaultFontSize: 11,
          defaultLineHeight: 1.35,
        },
        content: [
          {
            type: "header",
            alignment: "center",
            content: [{ type: "paragraph", runs: [{ type: "text", text: "Byteforce Workbook Print" }] }],
          },
          {
            type: "paragraph",
            style: "bodyText",
            lineHeight: 1.45,
            runs: [
              {
                type: "text",
                text: Array.from({ length: 90 }, (_, index) => `自动分页段落${index + 1}`).join(" "),
              },
            ],
          },
          {
            type: "table",
            style: "reportTable",
            columns: [220, 220],
            border: { style: "thin", color: "#334155" },
            rows: Array.from({ length: 18 }, (_, index) => ({
              height: 32,
              cells: [
                { content: [{ type: "paragraph", runs: [{ type: "text", text: `任务 ${index + 1}` }] }] },
                {
                  content: [
                    { type: "paragraph", runs: [{ type: "text", text: index % 2 === 0 ? "已确认" : "待复核" }] },
                  ],
                },
              ],
            })) as unknown as Extract<PageViewDefinition["content"][number], { type: "table" }>["rows"],
          },
          {
            type: "footer",
            alignment: "right",
            content: [{ type: "paragraph", runs: [{ type: "text", text: "打印输出样张" }] }],
          },
        ],
      },
    ],
  };
}

export function createProductionShowcaseWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {
      project: {
        code: "BF-WB-2026-0529",
        name: "华东交付平台二期",
        owner: "Alice Chen",
        status: "reviewing",
        statusLabel: "复核中",
        priority: "high",
        risk: "medium",
        riskLabel: "中风险",
        region: "east",
        startDate: "2026-05-30",
        deliveryDate: "2026-06-28",
        budget: 780000,
        description: "本次交付覆盖协议校验、自动分页、浏览器外 PDF 生成、Sheet 台账、审计回放与生产发布检查。",
      },
      includeAppendix: true,
      tags: ["验收", "打印", "台账"],
      metadata: {
        department: "解决方案中心",
        approver: "李四",
        contractNo: "HT-2026-0601",
      },
      ledgerRows: productionLedgerRows.map((row) => ({ ...row })),
    },
    printConfig: {
      copies: 1,
      collate: true,
      orientation: "portrait",
      scale: "fitToPage",
    },
    styles: {
      paragraphStyles: {
        reportTitle: {
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          color: "#111827",
          fontWeight: "bold",
          alignment: "center",
          spaceAfter: 10,
          lineHeight: 1.16,
        },
        sectionTitle: {
          fontFamily: "Inter, sans-serif",
          fontSize: 16,
          color: "#1d4ed8",
          fontWeight: "bold",
          spaceBefore: 12,
          spaceAfter: 8,
          lineHeight: 1.3,
        },
        bodyText: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "#334155", lineHeight: 1.55, spaceAfter: 8 },
        mutedText: { fontFamily: "Inter, sans-serif", fontSize: 10, color: "#64748b", lineHeight: 1.35 },
        headerFooter: { fontFamily: "Inter, sans-serif", fontSize: 10, color: "#475569", lineHeight: 1.2 },
      },
      characterStyles: {
        accent: { color: "#1d4ed8", fontWeight: "bold" },
        danger: { color: "#b42318", fontWeight: "bold" },
        quiet: { color: "#64748b" },
      },
      tableStyles: {
        reportTable: {
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          color: "#172033",
          borderWidth: 1,
          borderColor: "#cbd5e1",
          cellPadding: 8,
          hAlign: "left",
          vAlign: "middle",
        },
        compactTable: {
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          color: "#172033",
          borderWidth: 1,
          borderColor: "#dbe4f0",
          cellPadding: 6,
          hAlign: "left",
          vAlign: "middle",
        },
      },
      cellStyles: {
        tableHeader: {
          backgroundColor: "#1f2937",
          color: "#ffffff",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
          borderBottom: { style: "medium", color: "#111827" },
        },
        summaryLabel: {
          backgroundColor: "#f1f5f9",
          color: "#475569",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        summaryValue: {
          backgroundColor: "#ffffff",
          color: "#172033",
          hAlign: "left",
          vAlign: "middle",
          wrapText: true,
        },
        statusApproved: {
          backgroundColor: "#dcfce7",
          color: "#166534",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        statusReviewing: {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        statusWarning: {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        statusBlocked: {
          backgroundColor: "#fee2e2",
          color: "#b42318",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        sheetHeader: {
          backgroundColor: "#243145",
          color: "#ffffff",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
          borderBottom: { style: "medium", color: "#111827" },
        },
        sheetText: { backgroundColor: "#ffffff", color: "#172033", hAlign: "left", vAlign: "middle" },
        sheetCurrency: {
          backgroundColor: "#f8fafc",
          color: "#0f766e",
          fontWeight: "bold",
          hAlign: "right",
          vAlign: "middle",
          format: "currency",
        },
        sheetDone: {
          backgroundColor: "#dcfce7",
          color: "#166534",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        sheetWarning: {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
        },
        sheetCritical: {
          backgroundColor: "#fee2e2",
          color: "#b42318",
          fontWeight: "bold",
          hAlign: "center",
          vAlign: "middle",
          borderLeft: { style: "thick", color: "#b42318" },
        },
      },
      listStyles: {
        acceptanceList: {
          listType: "ordered",
          numberFormat: "decimal",
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: "#334155",
          indent: 24,
          spaceAfter: 8,
        },
      },
    },
    views: [
      {
        type: "form",
        id: "production-form",
        label: "交付验收录入",
        config: {
          validateMode: "onBlur",
          submitLabel: "保存验收单",
          resetLabel: "恢复初始值",
        },
        fields: [
          {
            name: "projectName",
            type: "string",
            label: "项目名称",
            bind: { path: "project.name", mode: "twoWay" },
            validations: [{ type: "required", message: "项目名称不能为空" }],
          },
          {
            name: "projectOwner",
            type: "string",
            label: "项目负责人",
            bind: { path: "project.owner", mode: "twoWay" },
            validations: [{ type: "required", message: "项目负责人不能为空" }],
          },
          {
            name: "projectStatus",
            type: "custom",
            label: "交付状态",
            component: "shadcn/status-segmented",
            bind: { path: "project.status", mode: "twoWay" },
            props: {
              options: [
                { label: "草稿", value: "draft" },
                { label: "复核中", value: "reviewing" },
                { label: "已批准", value: "approved" },
              ],
            },
          },
          {
            name: "priority",
            type: "select",
            label: "优先级",
            bind: { path: "project.priority", mode: "twoWay" },
            options: [
              { label: "高", value: "high" },
              { label: "中", value: "medium" },
              { label: "低", value: "low" },
            ],
          },
          {
            name: "risk",
            type: "select",
            label: "风险等级",
            bind: { path: "project.risk", mode: "twoWay" },
            options: [
              { label: "高风险", value: "high" },
              { label: "中风险", value: "medium" },
              { label: "低风险", value: "low" },
            ],
          },
          {
            name: "budget",
            type: "number",
            label: "预算金额",
            bind: { path: "project.budget", mode: "twoWay" },
            validations: [{ type: "min", params: 1, message: "预算金额必须大于 0" }],
          },
          { name: "startDate", type: "date", label: "启动日期", bind: { path: "project.startDate", mode: "twoWay" } },
          {
            name: "deliveryDate",
            type: "date",
            label: "交付日期",
            bind: { path: "project.deliveryDate", mode: "twoWay" },
          },
          {
            name: "description",
            type: "textarea",
            label: "交付范围",
            bind: { path: "project.description", mode: "twoWay" },
          },
          {
            name: "includeAppendix",
            type: "boolean",
            label: "包含验收附录",
            bind: { path: "includeAppendix", mode: "twoWay" },
          },
          {
            name: "tags",
            type: "array",
            label: "交付标签",
            bind: { path: "tags", mode: "twoWay" },
            props: { widget: "tags", suggestions: ["验收", "打印", "台账", "审计", "PDF", "生产发布"] },
          },
          { name: "metadata", type: "object", label: "审计元数据", bind: { path: "metadata", mode: "twoWay" } },
        ],
        layout: [
          {
            type: "group",
            title: "项目基础",
            children: [
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "projectName" },
                  { type: "field", name: "projectOwner" },
                ],
              },
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "projectStatus" },
                  { type: "field", name: "priority" },
                  { type: "field", name: "risk" },
                ],
              },
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "budget" },
                  { type: "field", name: "startDate" },
                  { type: "field", name: "deliveryDate" },
                ],
              },
            ],
          },
          {
            type: "group",
            title: "范围与附录",
            children: [
              { type: "field", name: "description" },
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "includeAppendix" },
                  { type: "field", name: "tags" },
                ],
              },
              { type: "field", name: "metadata" },
            ],
          },
        ],
      },
      {
        type: "page",
        id: "production-report",
        label: "交付验收报告",
        pageSettings: {
          width: 794,
          height: 1123,
          marginTop: 92,
          marginRight: 72,
          marginBottom: 88,
          marginLeft: 72,
          defaultFontFamily: "Inter, sans-serif",
          defaultFontSize: 12,
          defaultLineHeight: 1.45,
          defaultColor: "#172033",
        },
        content: [
          {
            type: "watermark",
            text: "BYTEFORCE",
            fontSize: 52,
            color: "#dbe4f0",
            opacity: 0.24,
            rotation: -28,
            repeat: true,
          },
          {
            type: "header",
            alignment: "center",
            content: [
              {
                type: "paragraph",
                style: "headerFooter",
                runs: [{ type: "text", text: "Byteforce Workbook · 交付验收报告" }],
              },
            ],
          },
          {
            type: "footer",
            alignment: "right",
            content: [
              {
                type: "paragraph",
                style: "headerFooter",
                runs: [
                  { type: "text", bind: { path: "project.code", mode: "oneWay" } },
                  { type: "text", text: " · Confidential" },
                ],
              },
            ],
          },
          {
            type: "floating",
            layout: { x: 626, y: 70, width: 104, height: 34 },
            content: {
              type: "paragraph",
              style: "mutedText",
              alignment: "center",
              runs: [{ type: "text", text: "受控样张" }],
            },
          },
          { type: "paragraph", style: "reportTitle", runs: [{ type: "text", text: "交付验收报告" }] },
          {
            type: "paragraph",
            style: "bodyText",
            alignment: "center",
            runs: [
              { type: "text", bind: { path: "project.name", mode: "oneWay" } },
              { type: "text", text: " / " },
              { type: "text", bind: { path: "project.code", mode: "oneWay" } },
            ],
          },
          { type: "paragraph", style: "sectionTitle", runs: [{ type: "text", text: "一、项目摘要" }] },
          {
            type: "table",
            style: "reportTable",
            width: "100%",
            columns: [120, 210, 120, 200],
            border: { style: "thin", color: "#cbd5e1" },
            rows: createReportTableRows(),
          },
          { type: "paragraph", style: "sectionTitle", runs: [{ type: "text", text: "二、验收关注项" }] },
          {
            type: "list",
            style: "acceptanceList",
            listType: "ordered",
            items: [
              [
                {
                  type: "paragraph",
                  runs: [{ type: "text", text: "自动分页结果需覆盖正文、表格、页眉页脚、水印与浮动标识。" }],
                },
              ],
              [
                {
                  type: "paragraph",
                  runs: [{ type: "text", text: "PDF 导出必须直接产出二进制字节，不依赖浏览器打印对话框。" }],
                },
              ],
              [
                {
                  type: "paragraph",
                  runs: [{ type: "text", text: "Sheet 台账需保留冻结窗格、条件样式、公式与批注提示。" }],
                },
              ],
            ],
          },
          { type: "paragraph", style: "sectionTitle", runs: [{ type: "text", text: "三、交付台账" }] },
          {
            type: "table",
            style: "compactTable",
            width: "100%",
            columns: [210, 116, 92, 70, 88],
            border: { style: "thin", color: "#dbe4f0" },
            rows: createLedgerTableRows(),
          },
          { type: "paragraph", style: "sectionTitle", runs: [{ type: "text", text: "四、Sheet 摘要" }] },
          {
            type: "spreadsheet",
            sheet: {
              name: "验收台账摘要",
              frozenRows: 1,
              frozenCols: 1,
              columns: [{ width: 180 }, { width: 92 }, { width: 82 }, { width: 82 }],
              rows: [
                {
                  height: 30,
                  cells: [
                    { column: 0, value: "任务", style: "sheetHeader" },
                    { column: 1, value: "进度", style: "sheetHeader" },
                    { column: 2, value: "风险", style: "sheetHeader" },
                    { column: 3, value: "状态", style: "sheetHeader" },
                  ],
                },
                {
                  height: 28,
                  cells: [
                    { column: 0, value: "打印模板验收", style: "sheetText" },
                    { column: 1, value: 82, style: "sheetWarning" },
                    { column: 2, value: "中", style: "sheetWarning" },
                    { column: 3, value: "复核中", style: "sheetText" },
                  ],
                },
                {
                  height: 28,
                  cells: [
                    { column: 0, value: "PDF 二进制导出", style: "sheetText" },
                    { column: 1, value: 68, style: "sheetCritical" },
                    { column: 2, value: "高", style: "sheetCritical" },
                    { column: 3, value: "待确认", style: "sheetText" },
                  ],
                },
              ],
            },
            renderHints: { height: 130 },
          },
        ],
      },
      {
        type: "sheet",
        id: "production-ledger",
        label: "交付台账",
        name: "生产验收台账",
        frozenRows: 1,
        frozenCols: 1,
        defaultColumnWidth: 120,
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
        rows: createLedgerSheetRows(),
        forms: [
          {
            type: "form",
            fields: [
              {
                name: "projectOwner",
                type: "string",
                label: "台账负责人",
                bind: { path: "project.owner", mode: "twoWay" },
              },
              {
                name: "risk",
                type: "select",
                label: "风险等级",
                bind: { path: "project.risk", mode: "twoWay" },
                options: [
                  { label: "高风险", value: "high" },
                  { label: "中风险", value: "medium" },
                  { label: "低风险", value: "low" },
                ],
              },
            ],
            layout: [
              {
                type: "row",
                gutter: 12,
                children: [
                  { type: "field", name: "projectOwner" },
                  { type: "field", name: "risk" },
                ],
              },
            ],
            config: { submitLabel: "保存台账", resetLabel: "重置" },
          },
        ],
      },
    ],
  };
}
