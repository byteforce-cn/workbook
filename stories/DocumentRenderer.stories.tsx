import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useMemo, useState } from "react";
import type { PageViewDefinition, WorkbookData } from "../src/core/types";
import { DocumentRenderer } from "../src/DocumentRenderer";
import { createWorkbookPdfFromPageView } from "../src/export/pdf";
import { layoutPageView } from "../src/renderers/page/pageLayout";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import {
  createAllViewsWorkbook,
  createFormWorkbook,
  createPagedPrintWorkbook,
  createPageWorkbook,
  createProductionShowcaseWorkbook,
  createSheetWorkbook,
} from "./workbookStoryFixtures";
import { createProductionStoryRegistry } from "./workbookStoryRegistry";

const componentDocs = `### 适用场景
把一份 \`BFDocumentSchema\` 渲染成表单、分页文档或 Sheet（可多视图切换），需要只读展示、受控数据、导出 PDF 时使用。
需要就地编辑正文时用 \`DocumentEditor\`，需要按设备适配时用 \`ResponsiveRenderer\`。

### 最小可运行示例
\`\`\`tsx
import { DocumentRenderer } from "@byteforce/workbook";

<DocumentRenderer
  workbook={workbook}          // 含 form / page / sheet 视图
  data={data}                  // 受控数据
  onDataChange={setData}
  onSubmit={(next) => save(next)}
  activeViewId="production-form"
/>
\`\`\`

### API
- \`workbook\`：schema；\`activeViewId\` 指定初始视图，其余视图仍可按 id 切换。
- \`data\`（受控）/ \`initialData\`（非受控）与 \`onDataChange\`：受控时 \`initialData\` 被忽略。
- \`onSubmit\`：原生校验通过后调用；\`validator\` 可替换默认 AJV 校验器（严格 CSP 下预编译）。
- \`registry\` / \`locale\` / \`fallbackLocale\` / \`conditionContext\` 与 \`Workbook\` 一致。

### 边界与错误
- 默认校验器在运行时编译 schema，需要 CSP 允许 \`unsafe-eval\`；否则请传预编译的 \`validator\`。
- schema 校验失败时渲染错误面板而不是空白页。
- 受控模式下数据变更完全由父组件决定：不更新 \`data\` 则界面不变化。

### 源码
${sourceLink("src/DocumentRenderer.tsx")} · ${docsLink("api/document-renderer", "api/document-renderer")}
`;

const meta = {
  title: "Workbook/DocumentRenderer",
  component: DocumentRenderer,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof DocumentRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

function StoryShell({ testId, children, width = "100%" }: { testId: string; children: ReactNode; width?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        width,
        boxSizing: "border-box",
        margin: "0 auto",
        background: "#ffffff",
        border: "1px solid #d9e1ec",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
      }}
    >
      {children}
    </div>
  );
}

function ProductionShowcasePanel({ workbook }: { workbook: ReturnType<typeof createProductionShowcaseWorkbook> }) {
  const [activeViewId, setActiveViewId] = useState("production-form");
  const [data, setData] = useState<WorkbookData>(() => structuredClone(workbook.data as WorkbookData));
  const registry = useMemo(() => createProductionStoryRegistry(), []);
  const pageView = workbook.views.find(
    (view): view is PageViewDefinition => view.type === "page" && view.id === "production-report",
  );
  const layout = pageView == null ? undefined : layoutPageView(pageView, { data, registry });
  const pdf =
    pageView == null
      ? undefined
      : createWorkbookPdfFromPageView(pageView, { data, registry, config: workbook.printConfig });
  const projectData = data.project as Record<string, unknown> | undefined;
  const ledgerRows = Array.isArray(data.ledgerRows) ? data.ledgerRows : [];
  const navItems = [
    { id: "production-form", label: "表单录入" },
    { id: "production-report", label: "文档输出" },
    { id: "production-ledger", label: "Sheet 台账" },
  ];

  return (
    <section
      data-testid="workbook-story-production-showcase"
      style={{
        width: "100%",
        boxSizing: "border-box",
        margin: "0 auto",
        display: "grid",
        gap: "18px",
        color: "#172033",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "grid",
          gap: "12px",
          border: "1px solid #d7e0ea",
          borderRadius: "8px",
          background: "#ffffff",
          padding: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", lineHeight: 1.25 }}>生产交付样张</h2>
            <p style={{ margin: "6px 0 0", color: "#526173", lineHeight: 1.55 }}>
              同一份 schema 同时驱动表单、分页文档、Sheet 台账与 PDF 二进制输出。
            </p>
          </div>
          <div
            data-testid="production-showcase-pdf-bytes"
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: "8px",
              background: "#f8fafc",
              padding: "10px 12px",
              lineHeight: 1.6,
              minWidth: "160px",
            }}
          >
            <strong>输出状态</strong>
            <div>Pages: {layout?.pages.length ?? 0}</div>
            <div>PDF bytes: {pdf?.bytes.byteLength ?? 0}</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={activeViewId === item.id}
              onClick={() => setActiveViewId(item.id)}
              style={{
                minHeight: "36px",
                border: activeViewId === item.id ? "1px solid #2563eb" : "1px solid #cbd5e1",
                borderRadius: "6px",
                background: activeViewId === item.id ? "#eff6ff" : "#ffffff",
                color: activeViewId === item.id ? "#1d4ed8" : "#172033",
                cursor: "pointer",
                fontWeight: 700,
                padding: "8px 12px",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: activeViewId === "production-report" ? "minmax(0, 1fr)" : "minmax(0, 1fr) 260px",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid #d7e0ea",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "18px",
            overflow: "auto",
          }}
        >
          <DocumentRenderer
            workbook={workbook}
            registry={registry}
            activeViewId={activeViewId}
            initialData={data}
            onDataChange={setData}
          />
        </section>
        {activeViewId !== "production-report" ? (
          <aside style={{ border: "1px solid #d7e0ea", borderRadius: "8px", background: "#ffffff", padding: "14px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>实时数据</h3>
            <dl
              style={{ display: "grid", gap: "10px", margin: 0, color: "#344054", fontSize: "13px", lineHeight: 1.45 }}
            >
              <div>
                <dt style={{ color: "#64748b", fontWeight: 700 }}>项目</dt>
                <dd style={{ margin: "2px 0 0", fontWeight: 700 }}>{String(projectData?.name ?? "")}</dd>
              </div>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 700 }}>状态 / 风险</dt>
                <dd style={{ margin: "2px 0 0" }}>
                  {String(projectData?.statusLabel ?? projectData?.status ?? "")} /{" "}
                  {String(projectData?.riskLabel ?? projectData?.risk ?? "")}
                </dd>
              </div>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 700 }}>台账行数</dt>
                <dd style={{ margin: "2px 0 0" }}>{ledgerRows.length}</dd>
              </div>
            </dl>
            <details style={{ marginTop: "14px" }}>
              <summary style={{ cursor: "pointer", color: "#1d4ed8", fontSize: "13px", fontWeight: 700 }}>
                查看完整数据树
              </summary>
              <pre
                style={{
                  maxHeight: "360px",
                  overflow: "auto",
                  margin: "10px 0 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "11px",
                  lineHeight: 1.5,
                  color: "#344054",
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </aside>
        ) : null}
      </main>
    </section>
  );
}

export const AllViews: Story = {
  parameters: storyNote("顶部切换 form / page / sheet 三个视图：同一份 data 在三处保持一致，切换视图不会丢输入。"),
  args: {
    workbook: createAllViewsWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-all-views">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const FormEditable: Story = {
  parameters: storyNote("只渲染 form 视图：改字段看右侧数据树路径变化，提交时会先跑 schema 校验再回调 onSubmit。"),
  args: {
    workbook: createFormWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-form-editable" width="min(720px, 100%)">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const PagePreview: Story = {
  parameters: storyNote("分页文档预览：调整缩放看文字是否仍是可选文本（不是截图），并确认页眉页脚与正文不重叠。"),
  args: {
    workbook: createPageWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-page-preview" width="min(720px, 100%)">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const SheetPreview: Story = {
  parameters: storyNote(
    "Sheet 视图：滚到右边界看冻结列是否跟随，单元格内容是 Canvas 绘制，但选中文本仍可被辅助技术读取。",
  ),
  args: {
    workbook: createSheetWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-sheet-preview" width="min(720px, 100%)">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const PagedPrintExport: Story = {
  parameters: storyNote(
    "点「导出 PDF」：输出的是纯字节 PDF-1.7，不需要浏览器打印对话框。对照右侧分页信息检查页数与纸张尺寸。",
  ),
  args: {
    workbook: createPagedPrintWorkbook(),
  },
  render: (args) => {
    const pageView = args.workbook.views.find((view): view is PageViewDefinition => view.type === "page");
    const layout = pageView == null ? undefined : layoutPageView(pageView, { data: args.workbook.data });
    const pdf =
      pageView == null
        ? undefined
        : createWorkbookPdfFromPageView(pageView, { data: args.workbook.data, config: args.workbook.printConfig });

    return (
      <StoryShell testId="workbook-story-paged-print-export" width="min(920px, 100%)">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: "20px", alignItems: "start" }}>
          <DocumentRenderer {...args} />
          <aside
            data-testid="workbook-story-paged-print-export-stats"
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: "12px",
              padding: "14px",
              background: "#f8fafc",
              color: "#0f172a",
              lineHeight: 1.6,
            }}
          >
            <strong>分页输出</strong>
            <div>Pages: {layout?.pages.length ?? 0}</div>
            <div>PDF bytes: {pdf?.bytes.byteLength ?? 0}</div>
            <div>Copies: {args.workbook.printConfig?.copies ?? 1}</div>
          </aside>
        </div>
      </StoryShell>
    );
  },
};

export const ProductionShowcase: Story = {
  parameters: storyNote(
    "生产样张：一份 schema 串起表单录入、文档输出、Sheet 台账三段流程，右侧可切换视图并导出 PDF——这是评估整体可用性的入口。",
  ),
  args: {
    workbook: createProductionShowcaseWorkbook(),
  },
  render: (args) => <ProductionShowcasePanel workbook={args.workbook} />,
};
