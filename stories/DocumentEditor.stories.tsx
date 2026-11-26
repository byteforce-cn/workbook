import type { Meta, StoryObj } from "@storybook/react";
import { useRef, useState } from "react";
import { DocumentEditor, type DocumentEditorHandle } from "../src/editor";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { StoryShell } from "./StoryShell";
import { docsLink, sourceLink, storyNote } from "./storyDocs";

const componentDocs = `### 适用场景
在浏览器里直接编辑 \`page\` 视图（正文、表格、页眉页脚、水印、浮动块）时使用。
只需要只读输出用 \`DocumentRenderer\`，只需要表单录入用 \`Workbook\`，三者共享同一份 schema。

### 最小可运行示例
\`\`\`tsx
import { DocumentEditor } from "@byteforce/workbook/editor";

<DocumentEditor
  workbook={workbook}                 // 至少含一个 page 视图
  data={data}                         // 供 {{path}} 绑定与条件块使用
  onDataChange={setData}
  onSave={(next) => persist(next)}    // 工具栏「保存」
  initialZoom={1}
/>
\`\`\`

### API
props 见下方表格；命令式操作通过 ref（\`DocumentEditorHandle\`）：

| 方法 | 语义 | 调用时机 |
|---|---|---|
| \`save()\` | 序列化、校验、合并面板后返回新 workbook；失败返回 \`undefined\` | 点工具栏「保存」或自行提交前 |
| \`getView()\` | 最近一次合法的 page 视图，含未保存编辑 | 需要草稿/快照时 |
| \`isDirty()\` | 是否有未保存修改 | 离开页面前确认 |

### 边界与错误
- 序列化或 schema 校验失败时 \`save()\` 返回 \`undefined\`，界面显示错误文案，且不调用 \`onSave\`。
- \`workbook\` 里没有 page 视图时渲染空态，不抛异常。
- 受控（传 \`data\`）与非受控（只传 \`initialData\`）不能混用：有 \`data\` 时 \`initialData\` 被忽略，且必须有 \`onDataChange\`，否则编辑会被丢弃并打印警告。
- 切换 \`workbook\` / \`viewId\` 会重建编辑器状态；卸载时销毁 tiptap 实例。

### 源码
${sourceLink("src/editor/DocumentEditor.tsx")} · ${docsLink("guides/document-editor", "guides/document-editor")}`;

const meta = {
  title: "Workbook/DocumentEditor",
  component: DocumentEditor,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: { description: { component: componentDocs } },
  },
  argTypes: {
    workbook: {
      control: false,
      description: "要编辑的 `BFDocumentSchema v4.1.1`，至少含一个 `page` 视图；其余视图原样保留。",
    },
    viewId: { control: false, description: "指定编辑哪个 page 视图；缺省取第一个 page 视图。" },
    data: { control: false, description: "受控数据树。传入即由父组件持有数据，编辑通过 `onDataChange` 回到父组件。" },
    initialData: { control: false, description: "非受控初始数据，仅首次挂载时读取；与 `data` 同时传入时被忽略。" },
    previewData: { control: false, description: "只读预览数据，只影响条件块显隐，不写回、不会让 `isDirty()` 变真。" },
    onDataChange: { control: false, description: "数据变更回调。受控模式下必须提供，否则编辑会被丢弃并打印警告。" },
    onSave: {
      control: false,
      description: "`save()` 成功（序列化 + 校验通过）后回调，参数是合并了面板与正文的新 workbook。",
    },
    onChange: { control: false, description: "每次 page 视图内容变化时回调，包含尚未保存的编辑。" },
    registry: { control: false, description: "插件注册表，用于自定义节点/字段的渲染与解析。" },
    locale: { control: false, description: "编辑器 UI 语言，如 `zh-CN`。" },
    fallbackLocale: { control: false, description: "`locale` 缺少对应文案时的回落语言。" },
    conditionContext: { control: false, description: "条件块求值上下文；未提供时使用数据树。" },
    readOnly: { control: false, description: "只读模式：正文不可编辑、保存按钮禁用，仍可切换打印预览与缩放。" },
    className: { control: false, description: "附加到编辑器根节点的 class。" },
    initialZoom: { control: false, description: "编辑/预览画布的初始缩放比例，`1` 表示 100%。" },
  },
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

interface Snapshot {
  id: number;
  savedAt: string;
  workbook: WorkbookDefinition;
}

/** Swaps the edited page view into the story's base workbook. */
function withPageView(workbook: WorkbookDefinition, next: WorkbookDefinition): WorkbookDefinition {
  return {
    ...workbook,
    views: next.views,
  } as WorkbookDefinition;
}

function EditorDemo({
  workbook,
  testId,
  title,
  caption,
  capabilities,
  code,
  panels = true,
}: {
  workbook: WorkbookDefinition;
  testId: string;
  title: string;
  caption: string;
  capabilities: string[];
  code: string;
  /** Render the out-of-flow editor panels next to the document. */
  panels?: boolean;
}) {
  const editorRef = useRef<DocumentEditorHandle>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [saved, setSaved] = useState<WorkbookDefinition | null>(null);
  const [generation, setGeneration] = useState(0);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("复制 JSON");

  const capture = () => {
    const next = editorRef.current?.save();
    if (next == null) {
      return;
    }
    const savedAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setSnapshots((list) => [...list, { id: list.length + 1, savedAt, workbook: next }]);
    setSaved(next);
    setRestoredAt(null);
  };

  const reload = () => {
    const latest = snapshots.at(-1);
    if (latest != null) {
      setSaved(withPageView(workbook, latest.workbook));
      setRestoredAt(latest.savedAt);
    }
    setGeneration((value) => value + 1);
  };

  const copyJson = async () => {
    const text = JSON.stringify(panelWorkbook?.views[0] ?? null, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("已复制");
    } catch {
      console.warn("[storybook] clipboard unavailable, JSON stays in the panel");
      setCopyLabel("复制失败");
    }
  };

  const latest = snapshots.at(-1);
  // 工具栏「保存」和「快照」都会更新面板：前者只存最近一次保存，后者留档可回滚。
  const panelWorkbook = latest?.workbook ?? saved;

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
            <button type="button" onClick={capture} data-testid={`${testId}-snapshot`}>
              快照
            </button>
            <button type="button" onClick={reload} data-testid={`${testId}-restore`}>
              重新加载
            </button>
            <button type="button" onClick={copyJson} data-testid={`${testId}-copy`}>
              {copyLabel}
            </button>
          </div>
          <p data-testid={`${testId}-snapshot-count`} style={{ margin: 0, fontSize: 12, color: "#526173" }}>
            已快照 {snapshots.length} 次{latest == null ? "" : ` · 最近 ${latest.savedAt}`}
          </p>
          {restoredAt == null ? null : (
            <p data-testid={`${testId}-restored`} style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
              已从 {restoredAt} 的快照恢复
            </p>
          )}
          <pre
            data-testid={`${testId}-saved`}
            style={{
              maxHeight: 220,
              overflow: "auto",
              background: "#0f172a",
              color: "#dbeafe",
              padding: 10,
              fontSize: 11,
              margin: 0,
            }}
          >
            {panelWorkbook == null ? "尚未保存" : JSON.stringify(panelWorkbook.views[0], null, 2)}
          </pre>
        </div>
      }
    >
      <div className={panels ? undefined : "bf-story-body-only"}>
        <DocumentEditor
          key={generation}
          ref={editorRef}
          workbook={saved ?? workbook}
          data={workbook.data as Record<string, unknown>}
          onSave={(next) => setSaved(next)}
        />
      </div>
    </StoryShell>
  );
}

export const Basic: Story = {
  parameters: storyNote(
    "先看正文的命名样式，再用工具栏改字号——改的是直接格式覆盖，结构仍是命名样式 id。点右上「保存」会走 save()，右侧「保存与重载」面板记录快照。页眉页脚、水印与浮动块在「出流层」story 里。",
  ),
  render: () => (
    <EditorDemo
      testId="workbook-story-document-editor-basic"
      title="文档编辑器 · 正文与命名样式"
      caption="富文本编辑保留命名样式 id；工具栏修改字号只写入直接格式覆盖。页眉页脚等出流层内容见「出流层」story。"
      capabilities={["富文本", "命名样式", "保存与快照"]}
      panels={false}
      code={"<DocumentEditor workbook={workbook} onSave={(next) => persist(next)} />"}
      workbook={basicWorkbook}
    />
  ),
};

export const Table: Story = {
  parameters: storyNote(
    "拖列边界调整百分比列宽、合并单元格，再切到打印预览：边框与内边距应与编辑态一致（两者共用同一套解析）。",
  ),
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
  parameters: storyNote(
    "正文里的 {{customer.name}} 是绑定 chip，改预览数据会立即改变渲染值，但保存下来的仍是模板而不是插值结果。",
  ),
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
  parameters: storyNote("依次切到页眉、页脚、水印、浮动块面板：它们不进入正文流，也不会改变正文的分页结果。"),
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
