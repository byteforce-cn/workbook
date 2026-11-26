import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DocumentEditor } from "../src/editor";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { CodeBlock, StoryShell } from "./StoryShell";

const meta = {
  title: "Workbook/DocumentEditor",
  component: DocumentEditor,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof DocumentEditor>;

export default meta;

type Story = StoryObj;

function makeWorkbook(content: unknown[]): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {
      customer: { name: "北区供应链有限公司" },
      total: 128000,
      status: "open",
    },
    styles: {
      paragraphStyles: {
        Body: { fontFamily: "Noto Sans SC", fontSize: 13, lineHeight: 1.6, spaceAfter: 8 },
        Heading: { fontSize: 18, fontWeight: "bold", spaceBefore: 12, spaceAfter: 10 },
        Conditional: {
          fontSize: 13,
          conditional: [{ condition: { op: "eq", path: "status", value: "open" }, style: { color: "#b91c1c" } }],
        },
      },
      characterStyles: {
        Emphasis: { fontWeight: "bold", color: "#1d4ed8" },
      },
      tableStyles: { Grid: { borderWidth: 1, borderColor: "#cbd5e1", cellPadding: 6 } },
      cellStyles: { Total: { backgroundColor: "#f1f5f9", fontWeight: "bold" } },
    },
    views: [
      {
        type: "page",
        id: "contract",
        label: "采购合同",
        pageSettings: {
          width: 595,
          height: 842,
          marginTop: 72,
          marginBottom: 72,
          marginLeft: 72,
          marginRight: 72,
          defaultFontSize: 13,
          defaultLineHeight: 1.6,
        },
        content,
      },
    ],
  } as WorkbookDefinition;
}

const basicWorkbook = makeWorkbook([
  {
    type: "header",
    content: [{ type: "paragraph", runs: [{ type: "text", text: "北区供应链有限公司 · 采购合同" }] }],
    alignment: "center",
  },
  { type: "paragraph", style: "Heading", runs: [{ type: "text", text: "第一条 合同标的" }] },
  {
    type: "paragraph",
    style: "Body",
    runs: [
      { type: "text", text: "甲方向乙方采购 " },
      { type: "text", text: "服务器与网络设备", style: "Emphasis" },
      { type: "text", text: "，具体交付清单见附件。" },
    ],
  },
  { type: "paragraph", style: "Conditional", runs: [{ type: "text", text: "当前状态：待审核。" }] },
  {
    type: "footer",
    content: [{ type: "paragraph", runs: [{ type: "text", text: "第 1 页 / 共 1 页" }] }],
    alignment: "right",
  },
]);

const tableWorkbook = makeWorkbook([
  { type: "paragraph", style: "Heading", runs: [{ type: "text", text: "报价明细" }] },
  {
    type: "table",
    style: "Grid",
    columns: ["40%", "20%", "20%", "20%"],
    rows: [
      {
        cells: [
          { colSpan: 2, content: [{ type: "paragraph", runs: [{ type: "text", text: "设备" }] }] },
          { content: [{ type: "paragraph", alignment: "right", runs: [{ type: "text", text: "数量" }] }] },
          { content: [{ type: "paragraph", alignment: "right", runs: [{ type: "text", text: "金额" }] }] },
        ],
      },
      {
        cells: [
          { content: [{ type: "paragraph", runs: [{ type: "text", text: "机架服务器" }] }] },
          { content: [{ type: "paragraph", runs: [{ type: "text", text: "型号 A" }] }] },
          { content: [{ type: "paragraph", alignment: "right", runs: [{ type: "text", text: "8" }] }] },
          { content: [{ type: "paragraph", alignment: "right", runs: [{ type: "text", text: "96,000" }] }] },
        ],
      },
      {
        cells: [
          { colSpan: 3, style: "Total", content: [{ type: "paragraph", runs: [{ type: "text", text: "合计" }] }] },
          {
            style: "Total",
            content: [{ type: "paragraph", alignment: "right", runs: [{ type: "text", text: "128,000" }] }],
          },
        ],
      },
    ],
  },
]);

const bindWorkbook = makeWorkbook([
  { type: "paragraph", style: "Heading", runs: [{ type: "text", text: "乙方信息" }] },
  {
    type: "paragraph",
    style: "Body",
    runs: [
      { type: "text", text: "乙方名称：" },
      { type: "text", bind: { path: "customer.name" }, style: "Emphasis" },
    ],
  },
  {
    type: "paragraph",
    visible: { op: "eq", path: "status", value: "open" },
    runs: [{ type: "text", text: "当前状态下该条款生效。" }],
  },
  {
    type: "paragraph",
    visible: { op: "gt", path: "total", value: 100000 },
    runs: [{ type: "text", text: "大额合同：需法务复核。" }],
  },
]);

const outOfFlowWorkbook = makeWorkbook([
  {
    type: "header",
    content: [{ type: "paragraph", runs: [{ type: "text", text: "内部资料 · 请勿外传" }] }],
    alignment: "center",
  },
  { type: "watermark", text: "DRAFT", fontSize: 56, color: "#dc2626", opacity: 0.12, rotation: -30 },
  { type: "paragraph", style: "Heading", runs: [{ type: "text", text: "签署页" }] },
  { type: "paragraph", style: "Body", runs: [{ type: "text", text: "甲方（盖章）：____________" }] },
  {
    type: "floating",
    layout: { x: "60%", y: 120, width: "28%", height: 80 },
    content: { type: "paragraph", runs: [{ type: "text", text: "骑缝章占位" }] },
  },
  {
    type: "floating",
    layout: { x: 48, y: "70%", width: 160, height: 48 },
    content: { type: "paragraph", runs: [{ type: "text", text: "审批签章" }] },
  },
  { type: "footer", content: [{ type: "paragraph", runs: [{ type: "text", text: "合同编号：BF-2026-001" }] }] },
]);

function EditorDemo({
  workbook,
  testId,
  title,
  caption,
  capabilities,
  code,
  withSave,
}: {
  workbook: WorkbookDefinition;
  testId: string;
  title: string;
  caption: string;
  capabilities: string[];
  code: string;
  withSave?: boolean;
}) {
  const [saved, setSaved] = useState<WorkbookDefinition | null>(null);
  const [generation, setGeneration] = useState(0);

  return (
    <StoryShell
      testId={testId}
      title={title}
      caption={caption}
      capabilities={capabilities}
      code={code}
      inspector={
        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>保存与重载</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setSaved(saved)} data-testid={`${testId}-snapshot`}>
              快照
            </button>
            <button type="button" onClick={() => setGeneration((value) => value + 1)}>
              重新加载
            </button>
          </div>
          <pre
            data-testid={`${testId}-saved`}
            style={{
              maxHeight: 220,
              overflow: "auto",
              background: "#0f172a",
              color: "#dbeafe",
              padding: 10,
              fontSize: 11,
            }}
          >
            {saved == null ? "尚未保存" : JSON.stringify(saved.views[0])}
          </pre>
        </div>
      }
    >
      <DocumentEditor
        key={generation}
        workbook={saved ?? workbook}
        data={workbook.data as Record<string, unknown>}
        onSave={(next) => setSaved(next)}
      />
      {withSave ? <CodeBlock code={code} /> : null}
    </StoryShell>
  );
}

export const Basic: Story = {
  render: () => (
    <EditorDemo
      withSave
      testId="workbook-story-document-editor-basic"
      title="文档编辑器 · 正文与命名样式"
      caption="富文本编辑保留命名样式 id；工具栏修改字号只写入直接格式覆盖。"
      capabilities={["富文本", "命名样式", "页眉页脚"]}
      code={"<DocumentEditor workbook={workbook} onSave={(next) => persist(next)} />"}
      workbook={basicWorkbook}
    />
  ),
};

export const Table: Story = {
  render: () => (
    <EditorDemo
      testId="workbook-story-document-editor-table"
      title="文档编辑器 · 表格"
      caption="百分比列宽、合并单元格、行高与单元格样式往返保真；边框与内边距和 TableSvg 共用解析，e2e 断言计算样式一致。"
      capabilities={["百分比列宽", "合并单元格", "行高"]}
      code={'columns: ["40%", "20%", "20%", "20%"]'}
      workbook={tableWorkbook}
    />
  ),
};

export const Bindings: Story = {
  render: () => (
    <EditorDemo
      testId="workbook-story-document-editor-bindings"
      title="文档编辑器 · 数据绑定与条件块"
      caption="绑定以 {{path}} chip 编辑；条件块可按预览数据模拟显隐，写回的仍是模板。"
      capabilities={["bind chip", "条件显隐", "预览数据"]}
      code={'{ type: "text", bind: { path: "customer.name" } }'}
      workbook={bindWorkbook}
    />
  ),
};

export const OutOfFlow: Story = {
  render: () => (
    <EditorDemo
      testId="workbook-story-document-editor-out-of-flow"
      title="文档编辑器 · 出流层"
      caption="页眉、页脚、水印与浮动块在独立面板编辑，不进入正文流。"
      capabilities={["页眉页脚", "水印", "浮动块拖拽"]}
      code={'{ type: "floating", layout: { x: "60%", y: 120, width: "28%", height: 80 } }'}
      workbook={outOfFlowWorkbook}
    />
  ),
};
