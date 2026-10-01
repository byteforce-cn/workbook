import type { Meta, StoryObj } from "@storybook/react";
import { type ComponentType, useEffect, useState } from "react";
import type { WorkbookData, WorkbookFieldPluginProps } from "../src/core/types";
import { BlockErrorBoundary, FieldErrorBoundary, WorkbookErrorBoundary } from "../src/react";
import { DataProvider as SharedDataProvider, useWorkbookData } from "../src/react/DataProvider";
import {
  createPluginRegistry,
  PluginProvider as ScopePluginProvider,
  usePluginRegistry,
} from "../src/react/PluginProvider";
import { WorkbookRuntimeProvider } from "../src/react/RuntimeProvider";
import type { WorkbookConditionPlugin } from "../src/react/registry";
import { FormView as WorkbookFormView } from "../src/renderers/form/FormView";
import { PageView as WorkbookPageView } from "../src/renderers/page/PageView";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { CodeBlock, StoryShell } from "./StoryShell";

/** react-layer createPluginRegistry attaches register* helpers at runtime. */
type ScopedRegistry = ReturnType<typeof createPluginRegistry> & {
  registerField: (id: string, component: ComponentType<WorkbookFieldPluginProps>) => void;
  registerCondition: (id: string, plugin: WorkbookConditionPlugin) => void;
};

const meta = {
  title: "Workbook/React Integration",
  component: WorkbookRuntimeProvider,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookRuntimeProvider>;

export default meta;

// Render-only stories render custom demos, so keep args untyped.
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/* Shared workbook (form + page views)                                 */
/* ------------------------------------------------------------------ */

const sharedWorkbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {
    customer: { name: "Alice", amount: 1200 },
  },
  views: [
    {
      type: "form",
      id: "shared-form",
      label: "订单编辑",
      config: { validateMode: "onChange" },
      fields: [
        {
          name: "customerName",
          type: "string",
          label: "客户名称",
          bind: { path: "customer.name", mode: "twoWay" },
          validations: [{ type: "required", message: "客户名称不能为空" }],
        },
        {
          name: "amount",
          type: "number",
          label: "订单金额",
          bind: { path: "customer.amount", mode: "twoWay" },
        },
      ],
      layout: [
        { type: "field", name: "customerName" },
        { type: "field", name: "amount" },
      ],
    },
    {
      type: "page",
      id: "shared-page",
      label: "订单预览",
      pageSettings: {
        width: 560,
        height: 320,
        marginTop: 24,
        marginRight: 32,
        marginBottom: 24,
        marginLeft: 32,
        defaultFontSize: 13,
      },
      content: [
        {
          type: "paragraph",
          runs: [
            { type: "text", text: "客户：" },
            { type: "text", bind: { path: "customer.name", mode: "oneWay" } },
          ],
        },
        {
          type: "paragraph",
          runs: [
            { type: "text", text: "金额：" },
            { type: "text", bind: { path: "customer.amount", mode: "oneWay" } },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 1. DataProvider                                                     */
/* ------------------------------------------------------------------ */

function DataMirror({ onData }: { onData: (data: WorkbookData) => void }) {
  const { data } = useWorkbookData();
  useEffect(() => {
    onData(data);
  }, [data, onData]);
  return null;
}

function DataProviderDemo() {
  const [data, setData] = useState<WorkbookData>(() => structuredClone(sharedWorkbook.data as WorkbookData));
  const formView = sharedWorkbook.views.find((view) => view.type === "form");
  const pageView = sharedWorkbook.views.find((view) => view.type === "page");

  if (formView == null || pageView == null || formView.type !== "form" || pageView.type !== "page") {
    return null;
  }

  return (
    <StoryShell
      testId="workbook-story-react-data-provider"
      title="DataProvider 数据共享"
      caption="一个 DataProvider 同时驱动表单与页面预览 —— 修改表单，页面即时联动。数据与视图解耦，多视图天然同步。"
      capabilities={["单一数据源", "多视图联动", "Context"]}
      code={`import { WorkbookRuntimeProvider } from "@byteforce/workbook/react";
import { DataProvider, WorkbookFormView, WorkbookPageView } from "@byteforce/workbook";

<WorkbookRuntimeProvider workbook={workbook} registry={registry}>
  <DataProvider initialData={workbook.data}>
    <WorkbookFormView view={formView} />
    <WorkbookPageView view={pageView} />
  </DataProvider>
</WorkbookRuntimeProvider>`}
      inspector={
        <div style={{ display: "grid", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>共享数据树</h3>
          <p style={{ margin: 0, color: "#526173", fontSize: "12px", lineHeight: 1.6 }}>
            左侧表单通过 <code>useWorkbookData</code> 写入，右侧页面通过 <code>oneWay</code> bind 读取同一份数据。
          </p>
          <div data-testid="workbook-story-react-data-provider-state">
            <CodeBlock code={JSON.stringify(data, null, 2)} maxHeight="300px" />
          </div>
        </div>
      }
    >
      <WorkbookRuntimeProvider workbook={sharedWorkbook}>
        <SharedDataProvider initialData={data}>
          <DataMirror onData={setData} />
          <div style={{ display: "grid", gap: "16px" }}>
            <WorkbookFormView view={formView} />
            <WorkbookPageView view={pageView} />
          </div>
        </SharedDataProvider>
      </WorkbookRuntimeProvider>
    </StoryShell>
  );
}

export const DataProvider: Story = {
  render: () => <DataProviderDemo />,
};

/* ------------------------------------------------------------------ */
/* 2. PluginProvider                                                   */
/* ------------------------------------------------------------------ */

function ScopeProbe({ label }: { label: string }) {
  const registry = usePluginRegistry();
  const fieldIds = Array.from(registry.field.keys());
  const conditionIds = Array.from(registry.condition.keys());

  return (
    <div
      style={{
        border: "1px solid #d7e0ea",
        borderRadius: "8px",
        padding: "12px 14px",
        background: "#f8fafc",
      }}
    >
      <strong style={{ fontSize: "14px" }}>{label}</strong>
      <dl style={{ margin: "8px 0 0", display: "grid", gap: "4px", fontSize: "13px", lineHeight: 1.5 }}>
        <div>
          <dt style={{ color: "#64748b", display: "inline" }}>字段插件：</dt>
          <dd style={{ display: "inline", margin: 0, fontWeight: 700 }}>{fieldIds.join(", ") || "（空）"}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", display: "inline" }}>条件插件：</dt>
          <dd style={{ display: "inline", margin: 0, fontWeight: 700 }}>{conditionIds.join(", ") || "（空）"}</dd>
        </div>
      </dl>
    </div>
  );
}

function PluginProviderDemo() {
  const [registryA] = useState(() => {
    const registry = createPluginRegistry({ namespace: "scope-a" }) as ScopedRegistry;
    registry.registerField("status-segmented", () => <div>作用域 A 的字段实现</div>);
    return registry;
  });

  const [registryB] = useState(() => {
    const registry = createPluginRegistry({ namespace: "scope-b" }) as ScopedRegistry;
    registry.registerField("status-segmented", () => <div>作用域 B 的字段实现</div>);
    registry.registerCondition("is-workday", () => true);
    return registry;
  });

  return (
    <StoryShell
      testId="workbook-story-react-plugin-provider"
      title="PluginProvider 作用域隔离"
      caption="两个 PluginProvider 各自持有独立 registry（namespace 前缀隔离），同名插件 id 互不覆盖，作用域之间零泄漏。"
      capabilities={["作用域注册", "namespace 隔离", "无全局单例"]}
      code={`import { PluginProvider, createPluginRegistry } from "@byteforce/workbook/react";

const scopeA = createPluginRegistry({ namespace: "scope-a" });
scopeA.registerField("status-segmented", MyFieldA);

const scopeB = createPluginRegistry({ namespace: "scope-b" });
scopeB.registerField("status-segmented", MyFieldB);

<PluginProvider registry={scopeA}>
  <MyApp /> {/* 内部 usePluginRegistry() 只会看到 scope-a 的注册 */}
</PluginProvider>
<PluginProvider registry={scopeB}>
  <MyApp /> {/* 同名 "status-segmented" 在 scope-b 解析为不同实现 */}
</PluginProvider>`}
    >
      <div style={{ display: "grid", gap: "16px" }}>
        <ScopePluginProvider registry={registryA}>
          <ScopeProbe label="作用域 A（namespace: scope-a）" />
        </ScopePluginProvider>
        <ScopePluginProvider registry={registryB}>
          <ScopeProbe label="作用域 B（namespace: scope-b）" />
        </ScopePluginProvider>
      </div>
    </StoryShell>
  );
}

export const PluginProvider: Story = {
  render: () => <PluginProviderDemo />,
};

/* ------------------------------------------------------------------ */
/* 3. ErrorBoundary                                                    */
/* ------------------------------------------------------------------ */

const ExplodingField: ComponentType = () => {
  throw new Error("字段组件崩溃：数据格式异常");
};

const errorWorkbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {},
  views: [
    {
      type: "form",
      id: "error-form",
      label: "错误边界演示",
      fields: [
        {
          name: "safeField",
          type: "string",
          label: "安全字段",
          bind: { path: "safeField", mode: "twoWay" },
        },
        {
          name: "brokenField",
          type: "custom",
          label: "崩溃字段",
          component: "exploding-field",
          bind: { path: "brokenField", mode: "twoWay" },
        },
      ],
      layout: [
        { type: "field", name: "safeField" },
        { type: "field", name: "brokenField" },
      ],
    },
  ],
};

function ErrorBoundaryDemo() {
  const [fieldFailed, setFieldFailed] = useState(false);
  const [workbookFailed, setWorkbookFailed] = useState(false);
  const [blockFailed, setBlockFailed] = useState(false);
  const [registry] = useState(() => createPluginRegistry());
  const errorFormView = errorWorkbook.views.find((view) => view.type === "form");

  registry.field.set("exploding-field", ExplodingField as ComponentType<WorkbookFieldPluginProps>);

  return (
    <StoryShell
      testId="workbook-story-react-error-boundary"
      title="三级错误边界"
      caption="WorkbookErrorBoundary（全局兜底）→ FieldErrorBoundary（单字段降级）→ BlockErrorBoundary（单块降级）。一个坏字段不会拖垮整个表单。"
      capabilities={["错误隔离", "降级渲染", "retry"]}
      code={`import {
  WorkbookErrorBoundary,
  FieldErrorBoundary,
  BlockErrorBoundary,
} from "@byteforce/workbook/react";

<WorkbookErrorBoundary
  fallback={({ error, retry }) => (
    <div role="alert">渲染失败：{error.message}
      <button onClick={retry}>重试</button>
    </div>
  )}
  onError={(error, severity) => report(error)}
>
  <FieldErrorBoundary fieldPath="brokenField">
    <BrokenField /> {/* 单字段崩溃 → 仅该字段降级 */}
  </FieldErrorBoundary>
</WorkbookErrorBoundary>`}
      inspector={
        <div style={{ display: "grid", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>触发演示</h3>
          <button
            type="button"
            data-testid="workbook-story-react-error-boundary-trigger-field"
            onClick={() => setFieldFailed((value) => !value)}
            style={{
              minHeight: "36px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#172033",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {fieldFailed ? "恢复 FieldErrorBoundary" : "触发单字段崩溃"}
          </button>
          <button
            type="button"
            data-testid="workbook-story-react-error-boundary-trigger-block"
            onClick={() => setBlockFailed((value) => !value)}
            style={{
              minHeight: "36px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#172033",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {blockFailed ? "恢复 BlockErrorBoundary" : "触发单块崩溃"}
          </button>
          <button
            type="button"
            data-testid="workbook-story-react-error-boundary-trigger-fatal"
            onClick={() => setWorkbookFailed((value) => !value)}
            style={{
              minHeight: "36px",
              borderRadius: "6px",
              border: "1px solid #dc2626",
              background: "#fef2f2",
              color: "#b91c1c",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {workbookFailed ? "恢复 WorkbookErrorBoundary" : "触发全局崩溃"}
          </button>
        </div>
      }
    >
      <WorkbookErrorBoundary
        fallback={({ error, retry }) => (
          <div
            role="alert"
            data-testid="workbook-story-react-error-boundary-fatal-fallback"
            style={{
              border: "1px solid #fecaca",
              borderRadius: "8px",
              background: "#fef2f2",
              padding: "16px",
              color: "#7f1d1d",
            }}
          >
            <strong>WorkbookErrorBoundary 兜底</strong>
            <p style={{ margin: "6px 0" }}>{error.message}</p>
            <button
              type="button"
              onClick={retry}
              style={{
                minHeight: "32px",
                borderRadius: "6px",
                border: "1px solid #dc2626",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        )}
      >
        {workbookFailed ? (
          <ExplodingField />
        ) : (
          <BlockErrorBoundary
            blockType="form"
            fallback={
              <div role="alert" data-testid="workbook-story-react-error-boundary-block-fallback">
                ⚠️ 该区块渲染失败，其余内容正常
              </div>
            }
          >
            {blockFailed ? (
              <ExplodingField />
            ) : (
              <FieldErrorBoundary
                fieldPath="brokenField"
                fallback={
                  <div role="alert" data-testid="workbook-story-react-error-boundary-field-fallback">
                    ⚠️ 字段 brokenField 渲染失败，其余字段正常
                  </div>
                }
              >
                {fieldFailed || errorFormView == null ? (
                  <ExplodingField />
                ) : (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <WorkbookRuntimeProvider workbook={errorWorkbook} registry={registry}>
                      <SharedDataProvider initialData={{ safeField: "安全字段正常工作" }}>
                        <WorkbookFormView view={errorFormView} />
                      </SharedDataProvider>
                    </WorkbookRuntimeProvider>
                  </div>
                )}
              </FieldErrorBoundary>
            )}
          </BlockErrorBoundary>
        )}
      </WorkbookErrorBoundary>
    </StoryShell>
  );
}

export const ErrorBoundary: Story = {
  render: () => <ErrorBoundaryDemo />,
};
