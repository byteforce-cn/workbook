import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SimpleForm } from "../src/quick/SimpleForm";
import type { SimpleFieldDef, SimpleFormLayout } from "../src/quick/types";
import { CodeBlock, StoryShell } from "./StoryShell";

const meta = {
  title: "Quick Start/SimpleForm",
  component: SimpleForm,
  tags: ["autodocs"],
} satisfies Meta<typeof SimpleForm>;

export default meta;

// Render-only stories render custom demos, so keep args untyped.
type Story = StoryObj;

const basicsFields: SimpleFieldDef[] = [
  { name: "customerName", type: "text", label: "客户名称", required: true, placeholder: "请输入客户名称" },
  { name: "contactEmail", type: "email", label: "联系邮箱", placeholder: "name@example.com" },
  { name: "orderAmount", type: "number", label: "订单金额", placeholder: "0.00" },
  { name: "deliveryDate", type: "date", label: "交付日期" },
  { name: "remark", type: "textarea", label: "备注", placeholder: "选填" },
];

const basicsCode = `import { SimpleForm } from "@byteforce/workbook/quick";

export function OrderForm() {
  return (
    <SimpleForm
      fields={[
        { name: "customerName", type: "text", label: "客户名称", required: true },
        { name: "contactEmail", type: "email", label: "联系邮箱" },
        { name: "orderAmount", type: "number", label: "订单金额" },
        { name: "deliveryDate", type: "date", label: "交付日期" },
        { name: "remark", type: "textarea", label: "备注" },
      ]}
      onSubmit={(data) => console.log("提交", data)}
    />
  );
}`;

function SubmitPanel({ title, onSubmit }: { title: string; onSubmit: (data: Record<string, unknown>) => void }) {
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  return (
    <StoryShell
      testId="workbook-story-quick-basics"
      title={title}
      caption="5 行字段定义即可渲染完整表单 —— 无需了解 Workbook Schema。提交时回调拿到当前数据。"
      capabilities={["Quick Start API", "零 Schema 配置"]}
      code={basicsCode}
      inspector={
        <div data-testid="workbook-story-quick-basics-inspector" style={{ display: "grid", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>交互输出</h3>
          <div style={{ display: "grid", gap: "6px" }}>
            <button
              type="button"
              data-testid="workbook-story-quick-submit"
              onClick={() => {
                onSubmit({ placeholder: true });
                setEventLog((log) => [...log, `onSubmit 触发 @ ${new Date().toLocaleTimeString()}`]);
              }}
              style={{
                minHeight: "36px",
                borderRadius: "6px",
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              模拟提交
            </button>
          </div>
          {eventLog.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569", fontSize: "12px", lineHeight: 1.7 }}>
              {eventLog.map((entry, index) => (
                <li key={index}>{entry}</li>
              ))}
            </ul>
          ) : null}
          {submitted != null ? (
            <div>
              <h4 style={{ margin: "0 0 6px", fontSize: "13px" }}>提交数据</h4>
              <CodeBlock code={JSON.stringify(submitted, null, 2)} maxHeight="240px" />
            </div>
          ) : null}
        </div>
      }
    >
      <SimpleForm
        fields={basicsFields}
        onSubmit={(data) => {
          setSubmitted(data);
          setEventLog((log) => [...log, `onSubmit 回调收到 ${Object.keys(data).length} 个字段`]);
        }}
      />
    </StoryShell>
  );
}

export const SimpleFormBasics: Story = {
  render: () => <SubmitPanel title="SimpleForm 基础表单" onSubmit={() => undefined} />,
};

const selectFields: SimpleFieldDef[] = [
  {
    name: "region",
    type: "select",
    label: "所属区域",
    required: true,
    options: [
      { value: "east", label: "华东" },
      { value: "south", label: "华南" },
      { value: "west", label: "西南" },
      { value: "north", label: "华北" },
    ],
  },
  {
    name: "tags",
    type: "multiselect",
    label: "标签",
    options: [
      { value: "vip", label: "VIP" },
      { value: "new", label: "新客户" },
      { value: "risk", label: "高风险" },
      { value: "archived", label: "已归档" },
    ],
  },
  {
    name: "priority",
    type: "select",
    label: "优先级",
    options: [
      { value: "high", label: "高" },
      { value: "medium", label: "中" },
      { value: "low", label: "低" },
    ],
    defaultValue: "medium",
  },
];

const selectCode = `import { SimpleForm } from "@byteforce/workbook/quick";

<SimpleForm
  fields={[
    {
      name: "region", type: "select", label: "所属区域", required: true,
      options: [
        { value: "east", label: "华东" },
        { value: "south", label: "华南" },
      ],
    },
    {
      name: "tags", type: "multiselect", label: "标签",
      options: [
        { value: "vip", label: "VIP" },
        { value: "new", label: "新客户" },
      ],
    },
  ]}
  onSubmit={(data) => console.log(data)}
/>`;

function SelectDemo() {
  const [data, setData] = useState<Record<string, unknown>>(() => structuredClone({ priority: "medium" }));

  return (
    <StoryShell
      testId="workbook-story-quick-select"
      title="SimpleForm 下拉与多选"
      caption="select / multiselect 字段 + 静态 options + 默认值。选中值实时回显到数据树。"
      capabilities={["select", "multiselect", "默认值"]}
      code={selectCode}
      inspector={
        <div data-testid="workbook-story-quick-select-inspector" style={{ display: "grid", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>实时数据树</h3>
          <div data-testid="workbook-story-quick-select-state">
            <CodeBlock code={JSON.stringify(data, null, 2)} maxHeight="360px" />
          </div>
        </div>
      }
    >
      <SimpleForm fields={selectFields} initialData={data} onChange={setData} />
    </StoryShell>
  );
}

function LiveForm({ fields, initialData = {} }: { fields: SimpleFieldDef[]; initialData?: Record<string, unknown> }) {
  const [data, setData] = useState<Record<string, unknown>>(() => structuredClone(initialData));
  return <SimpleForm fields={fields} initialData={data} onChange={(next) => setData(next)} />;
}

export const SimpleFormSelect: Story = {
  render: () => <SelectDemo />,
};

const layoutFields: SimpleFieldDef[] = [
  { name: "name", type: "text", label: "姓名", required: true },
  { name: "phone", type: "text", label: "电话" },
  { name: "email", type: "email", label: "邮箱" },
  { name: "note", type: "textarea", label: "备注" },
];

const layoutCode = `import { SimpleForm } from "@byteforce/workbook/quick";

// vertical（默认，每行一个字段）
<SimpleForm fields={fields} layout="vertical" />

// horizontal（label 左对齐）
<SimpleForm fields={fields} layout="horizontal" />

// grid（2 列网格）
<SimpleForm fields={fields} layout="grid" />`;

export const SimpleFormLayouts: Story = {
  render: () => (
    <StoryShell
      testId="workbook-story-quick-layouts"
      title="SimpleForm 三种布局"
      caption="同一份字段定义，通过 layout 属性切换 vertical / horizontal / grid 三种自动布局。"
      capabilities={["vertical", "horizontal", "grid"]}
      code={layoutCode}
    >
      <div style={{ display: "grid", gap: "18px" }}>
        {(["vertical", "horizontal", "grid"] as SimpleFormLayout[]).map((layout) => (
          <section
            key={layout}
            data-testid={`workbook-story-quick-layout-${layout}`}
            style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", background: "#f8fafc" }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#334155" }}>layout=&quot;{layout}&quot;</h3>
            <LiveForm fields={layoutFields} />
          </section>
        ))}
      </div>
    </StoryShell>
  ),
};
