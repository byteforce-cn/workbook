import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef, useState } from "react";
import { evaluateCondition } from "../src/core/condition/evaluate";
import type { WorkbookData } from "../src/core/types";
import { DocumentRenderer } from "../src/DocumentRenderer";
import { createPluginRegistry } from "../src/react/registry";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { CodeBlock, StoryShell } from "./StoryShell";

const meta = {
  title: "Workbook/Runtime",
  component: DocumentRenderer,
  tags: ["autodocs"],
} satisfies Meta<typeof DocumentRenderer>;

export default meta;

// Render-only stories render custom demos, so keep args untyped.
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/* 1. I18n                                                             */
/* ------------------------------------------------------------------ */

const i18nWorkbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: { username: "", plan: "pro" },
  i18n: {
    "zh-CN": {
      "fields.username.label": "用户名称",
      "fields.plan.label": "套餐",
      "validations.required": "此项必填",
      "steps.basic.title": "基础信息",
      "workbook.form.submit": "保存",
      "workbook.form.reset": "清空",
      "workbook.steps.next": "下一步",
    },
    en: {
      "fields.username.label": "Username",
      "fields.plan.label": "Plan",
      "validations.required": "This field is required",
      "steps.basic.title": "Basic Info",
      "workbook.form.submit": "Save",
      "workbook.form.reset": "Reset",
      "workbook.steps.next": "Next",
    },
  },
  views: [
    {
      type: "form",
      id: "i18n-form",
      label: "@:steps.basic.title",
      fields: [
        {
          name: "username",
          type: "string",
          label: "@:fields.username.label",
          bind: { path: "username", mode: "twoWay" },
          validations: [{ type: "required", message: "@:validations.required" }],
        },
        {
          name: "plan",
          type: "select",
          label: "@:fields.plan.label",
          bind: { path: "plan", mode: "twoWay" },
          options: [
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
            { value: "enterprise", label: "Enterprise" },
          ],
        },
      ],
      layout: [
        {
          type: "steps",
          steps: [
            {
              key: "basic",
              title: "@:steps.basic.title",
              children: [
                { type: "field", name: "username" },
                { type: "field", name: "plan" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function I18nDemo() {
  const [locale, setLocale] = useState<"zh-CN" | "en">("zh-CN");
  const [data, setData] = useState<WorkbookData>(() => structuredClone(i18nWorkbook.data as WorkbookData));

  return (
    <StoryShell
      testId="workbook-story-runtime-i18n"
      title="国际化 i18n"
      caption="字段标签、校验消息、步骤标题与内建按钮文案均可通过 @:key 引用词典。切换语言即时生效。"
      capabilities={["@:key 解析", "词典注入", "内建 key"]}
      code={`const workbook = {
  locale: "zh-CN",
  i18n: {
    "zh-CN": { "fields.username.label": "用户名称", "workbook.form.submit": "保存" },
    en:      { "fields.username.label": "Username",   "workbook.form.submit": "Save" },
  },
  views: [{
    type: "form", id: "main",
    fields: [{
      name: "username", type: "string",
      label: "@:fields.username.label", // 词典 key
      validations: [{ type: "required", message: "@:validations.required" }],
    }],
  }],
};

<DocumentRenderer workbook={workbook} locale="en" />`}
      inspector={
        <div style={{ display: "grid", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>语言切换</h3>
          <div role="group" aria-label="语言切换" style={{ display: "flex", gap: "8px" }}>
            {(["zh-CN", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                data-testid={`workbook-story-runtime-i18n-locale-${lang}`}
                aria-pressed={locale === lang}
                onClick={() => setLocale(lang)}
                style={{
                  minHeight: "34px",
                  borderRadius: "6px",
                  border: locale === lang ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: locale === lang ? "#eff6ff" : "#ffffff",
                  color: locale === lang ? "#1d4ed8" : "#172033",
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "6px 12px",
                }}
              >
                {lang === "zh-CN" ? "中文" : "English"}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, color: "#526173", fontSize: "13px", lineHeight: 1.6 }}>
            当前 locale：<code>{locale}</code>。清空「用户名称」触发必填校验，错误文案随词典切换。
          </p>
          <CodeBlock code={`${JSON.stringify(i18nWorkbook.i18n?.[locale] ?? {}, null, 2)}`} maxHeight="260px" />
        </div>
      }
    >
      <DocumentRenderer workbook={i18nWorkbook} locale={locale} initialData={data} onDataChange={setData} />
    </StoryShell>
  );
}

export const I18n: Story = {
  render: () => <I18nDemo />,
};

/* ------------------------------------------------------------------ */
/* 2. Condition Engine                                                 */
/* ------------------------------------------------------------------ */

const conditionWorkbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {
    city: "sh",
    age: 20,
    tags: ["vip"],
    note: "",
  },
  views: [
    {
      type: "form",
      id: "condition-lab",
      label: "条件引擎实验室",
      config: { validateMode: "onChange" },
      fields: [
        {
          name: "city",
          type: "select",
          label: "城市（eq / in）",
          bind: { path: "city", mode: "twoWay" },
          options: [
            { value: "bj", label: "北京" },
            { value: "sh", label: "上海" },
            { value: "gz", label: "广州" },
          ],
        },
        {
          name: "age",
          type: "number",
          label: "年龄（gt / gte / lt / lte）",
          bind: { path: "age", mode: "twoWay" },
        },
        {
          name: "tags",
          type: "multiselect",
          label: "标签（contains / in）",
          bind: { path: "tags", mode: "twoWay" },
          options: [
            { value: "vip", label: "VIP" },
            { value: "new", label: "新客户" },
            { value: "risk", label: "高风险" },
          ],
        },
        {
          name: "note",
          type: "string",
          label: "备注（isEmpty）",
          bind: { path: "note", mode: "twoWay" },
        },
        {
          name: "vipDetail",
          type: "string",
          label: "VIP 专属权益说明（and 组合）",
          bind: { path: "vipDetail", mode: "twoWay" },
          visible: {
            op: "and",
            conditions: [
              { op: "contains", path: "tags", value: "vip" },
              { op: "gte", path: "age", value: 18 },
            ],
          },
        },
        {
          name: "shAllowance",
          type: "string",
          label: "上海补贴说明（or 组合）",
          bind: { path: "shAllowance", mode: "twoWay" },
          visible: {
            op: "or",
            conditions: [
              { op: "eq", path: "city", value: "sh" },
              { op: "isEmpty", path: "note" },
            ],
          },
        },
        {
          name: "riskWarning",
          type: "string",
          label: "风险提示（not 组合）",
          bind: { path: "riskWarning", mode: "twoWay" },
          visible: {
            op: "not",
            condition: { op: "contains", path: "tags", value: "risk" },
          },
        },
      ],
      layout: [
        { type: "field", name: "city" },
        { type: "field", name: "age" },
        { type: "field", name: "tags" },
        { type: "field", name: "note" },
        { type: "field", name: "vipDetail" },
        { type: "field", name: "shAllowance" },
        { type: "field", name: "riskWarning" },
      ],
    },
  ],
};

const OPERATOR_MATRIX = [
  { op: "eq", label: "eq 等于", path: "city", value: "sh", description: 'city === "sh"' },
  { op: "neq", label: "neq 不等于", path: "city", value: "bj", description: 'city !== "bj"' },
  { op: "gt", label: "gt 大于", path: "age", value: 18, description: "age > 18" },
  { op: "gte", label: "gte 大于等于", path: "age", value: 18, description: "age >= 18" },
  { op: "lt", label: "lt 小于", path: "age", value: 30, description: "age < 30" },
  { op: "lte", label: "lte 小于等于", path: "age", value: 30, description: "age <= 30" },
  { op: "in", label: "in 属于", path: "city", value: ["sh", "gz"], description: "city ∈ [sh, gz]" },
  { op: "contains", label: "contains 包含", path: "tags", value: "vip", description: "tags 包含 vip" },
  { op: "isEmpty", label: "isEmpty 为空", path: "note", value: undefined, description: "note 为空" },
] as const;

function ConditionEngineDemo() {
  const [data, setData] = useState<WorkbookData>(() => structuredClone(conditionWorkbook.data as WorkbookData));
  const [registry] = useState(() => createPluginRegistry());

  const results = OPERATOR_MATRIX.map((row) => {
    const condition = { op: row.op, path: row.path, value: row.value };
    return {
      ...row,
      result: evaluateCondition(condition, data, registry),
    };
  });

  return (
    <StoryShell
      testId="workbook-story-runtime-condition"
      title="条件引擎操作符矩阵"
      caption="修改左侧控件，右侧实时计算每种操作符的布尔结果；组合条件（and / or / not）驱动字段显隐。"
      capabilities={["13 种操作符", "组合条件", "实时求值"]}
      code={`import { evaluateCondition } from "@byteforce/workbook";

const result = evaluateCondition(
  { op: "and", conditions: [
    { op: "contains", path: "tags", value: "vip" },
    { op: "gte", path: "age", value: 18 },
  ]},
  data,      // 当前表单数据
  registry,  // 插件注册表（支持 custom 操作符）
);`}
      inspector={
        <div data-testid="workbook-story-runtime-condition-matrix" style={{ display: "grid", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>操作符实时求值</h3>
          {results.map((row) => (
            <div
              key={row.op}
              data-testid={`condition-matrix-${row.op}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 10px",
                background: row.result ? "#f0fdf4" : "#fef2f2",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#172033" }}>{row.label}</div>
                <code style={{ fontSize: "11px", color: "#64748b" }}>{row.description}</code>
              </div>
              <strong
                style={{
                  color: row.result ? "#15803d" : "#b91c1c",
                  fontSize: "13px",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {String(row.result)}
              </strong>
            </div>
          ))}
        </div>
      }
    >
      <DocumentRenderer workbook={conditionWorkbook} initialData={data} onDataChange={setData} />
    </StoryShell>
  );
}

export const ConditionEngine: Story = {
  render: () => <ConditionEngineDemo />,
};

/* ------------------------------------------------------------------ */
/* 3. Hook Lifecycle                                                   */
/* ------------------------------------------------------------------ */

interface HookLogEntry {
  time: string;
  label: string;
  payload?: unknown;
}

const hookLog: HookLogEntry[] = [];

const hooksWorkbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: { status: "draft" },
  hooks: [
    { trigger: "onMount", type: "function", config: { name: "storybook/audit" }, description: "mount: 审计日志" },
    {
      trigger: "onChange",
      type: "api",
      config: { endpoint: "https://hooks.example/on-change", method: "POST" },
      debounce: 400,
      description: "change: 防抖自动保存",
    },
    { trigger: "onChange", type: "function", config: { name: "storybook/audit" }, description: "change: 审计日志" },
    {
      trigger: "onSubmit",
      type: "api",
      config: { endpoint: "https://hooks.example/on-submit", method: "POST" },
      description: "submit: 提交到服务端",
    },
    { trigger: "onSubmit", type: "function", config: { name: "storybook/audit" }, description: "submit: 审计日志" },
  ],
  views: [
    {
      type: "form",
      id: "hooks-form",
      label: "Hook 生命周期",
      config: { validateMode: "onChange" },
      fields: [
        {
          name: "status",
          type: "select",
          label: "单据状态",
          bind: { path: "status", mode: "twoWay" },
          options: [
            { value: "draft", label: "草稿" },
            { value: "submitted", label: "已提交" },
            { value: "approved", label: "已批准" },
          ],
        },
        {
          name: "comment",
          type: "textarea",
          label: "审批意见",
          bind: { path: "comment", mode: "twoWay" },
        },
      ],
      layout: [
        { type: "field", name: "status" },
        { type: "field", name: "comment" },
      ],
    },
  ],
};

function HookLifecycleDemo() {
  const [data, setData] = useState<WorkbookData>(() => structuredClone(hooksWorkbook.data as WorkbookData));
  const [log, setLog] = useState<HookLogEntry[]>(() => {
    hookLog.length = 0;
    return [];
  });
  // Keep the latest log setter reachable from plugins/mock created on mount.
  const pushLogRef = useRef<(entry: HookLogEntry) => void>(() => undefined);
  pushLogRef.current = (entry: HookLogEntry) => {
    hookLog.push(entry);
    setLog(structuredClone(hookLog));
  };

  const [registry] = useState(() => {
    const scopedRegistry = createPluginRegistry();
    scopedRegistry.hook.set("storybook/audit", ({ hook, data: hookData }) => {
      pushLogRef.current({
        time: new Date().toLocaleTimeString(),
        label: `自定义 hook「${hook.description ?? "audit"}」`,
        payload: hookData,
      });
    });
    return scopedRegistry;
  });

  useEffect(() => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      pushLogRef.current({
        time: new Date().toLocaleTimeString(),
        label: `API hook → ${url.replace("https://hooks.example/", "")}`,
        payload: JSON.parse(String(init?.body ?? "{}")),
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

  return (
    <StoryShell
      testId="workbook-story-runtime-hooks"
      title="Hook 生命周期"
      caption="onMount 加载、onChange 防抖自动保存、onSubmit 提交，加上自定义 function hook 审计日志。"
      capabilities={["onMount", "onChange+debounce", "onSubmit", "自定义 hook"]}
      code={`// schema 声明 hooks（声明式，无需业务代码）
hooks: [
  { trigger: "onMount",  type: "function", config: { name: "storybook/audit" } },
  { trigger: "onChange", type: "api", config: { endpoint: "/api/save" }, debounce: 400 },
  { trigger: "onChange", type: "function", config: { name: "storybook/audit" } },
  { trigger: "onSubmit", type: "api", config: { endpoint: "/api/submit" } },
],

// 自定义 hook 注册
registry.hook.set("storybook/audit", ({ hook, data }) => {
  console.log("audit", data);
});`}
      inspector={
        <div data-testid="workbook-story-runtime-hooks-log" style={{ display: "grid", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>Hook 触发日志</h3>
          <p style={{ margin: 0, color: "#526173", fontSize: "12px", lineHeight: 1.6 }}>
            修改字段触发 onChange（400ms 防抖）；点击「提交」触发 onSubmit。API 与自定义 hook 均被记录。
          </p>
          <button
            type="button"
            data-testid="workbook-story-runtime-hooks-submit"
            onClick={() => {
              pushLogRef.current({
                time: new Date().toLocaleTimeString(),
                label: "onSubmit 事件手动触发（见表单提交按钮）",
              });
            }}
            style={{
              minHeight: "34px",
              borderRadius: "6px",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            触发 onSubmit
          </button>
          <div style={{ display: "grid", gap: "6px", maxHeight: "380px", overflow: "auto" }}>
            {log.length === 0 ? (
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px" }}>暂无记录，尝试修改字段…</p>
            ) : (
              log.map((entry, index) => (
                <div
                  key={`${entry.time}-${index}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    background: "#f8fafc",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  <code style={{ color: "#64748b" }}>{entry.time}</code>
                  <div style={{ fontWeight: 700, color: "#172033" }}>{entry.label}</div>
                </div>
              ))
            )}
          </div>
        </div>
      }
    >
      <DocumentRenderer
        workbook={hooksWorkbook}
        registry={registry}
        initialData={data}
        onDataChange={setData}
        onSubmit={(next) => {
          pushLogRef.current({
            time: new Date().toLocaleTimeString(),
            label: "onSubmit 回调（表单已提交）",
            payload: next,
          });
        }}
      />
    </StoryShell>
  );
}

export const HookLifecycle: Story = {
  render: () => <HookLifecycleDemo />,
};
