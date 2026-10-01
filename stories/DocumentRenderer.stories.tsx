import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useMemo, useState } from "react";
import type { PageViewDefinition, WorkbookData } from "../src/core/types";
import { DocumentRenderer } from "../src/DocumentRenderer";
import { createWorkbookPdfFromPageView } from "../src/export/pdf";
import { layoutPageView } from "../src/renderers/page/pageLayout";
import {
  createAllViewsWorkbook,
  createFormWorkbook,
  createPagedPrintWorkbook,
  createPageWorkbook,
  createProductionShowcaseWorkbook,
  createSheetWorkbook,
} from "./workbookStoryFixtures";
import { createProductionStoryRegistry } from "./workbookStoryRegistry";

const meta = {
  title: "Workbook/DocumentRenderer",
  component: DocumentRenderer,
  tags: ["autodocs"],
} satisfies Meta<typeof DocumentRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

function StoryShell({ testId, children, width = "100%" }: { testId: string; children: ReactNode; width?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        width,
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
        width: "min(1280px, calc(100vw - 48px))",
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
  args: {
    workbook: createFormWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-form-editable" width="720px">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const PagePreview: Story = {
  args: {
    workbook: createPageWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-page-preview" width="720px">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const SheetPreview: Story = {
  args: {
    workbook: createSheetWorkbook(),
  },
  render: (args) => (
    <StoryShell testId="workbook-story-sheet-preview" width="720px">
      <DocumentRenderer {...args} />
    </StoryShell>
  ),
};

export const PagedPrintExport: Story = {
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
      <StoryShell testId="workbook-story-paged-print-export" width="920px">
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
  args: {
    workbook: createProductionShowcaseWorkbook(),
  },
  render: (args) => <ProductionShowcasePanel workbook={args.workbook} />,
};
