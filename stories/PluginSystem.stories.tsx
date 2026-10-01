import type { Meta, StoryObj } from "@storybook/react";
import { StoryShell } from "./StoryShell";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createCustomConditionWorkbook,
  createCustomFieldWorkbook,
  createCustomLayoutWorkbook,
  createCustomValidationWorkbook,
  createPluginSystemRegistry,
} from "./workbookPluginSystemFixtures";

const meta = {
  title: "Workbook/Plugin System",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomField: Story = {
  args: {
    testId: "workbook-story-plugin-field",
    workbook: createCustomFieldWorkbook(),
    registry: createPluginSystemRegistry(),
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-plugin-field-shell"
      title="自定义字段插件"
      caption="注册 shadcn 风格的 StatusSegmented 组件替换内建控件，字段定义零改动即可接入。"
      capabilities={["字段插件", "shadcn 风格"]}
      code={`import { createPluginRegistry } from "@byteforce/workbook";

// 1. 编写字段组件（WorkbookFieldPluginProps）
function StatusSegmented({ field, value, onChange, onBlur, errors }) {
  return (
    <div role="group" aria-label={field.label}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          data-state={value === opt.value ? "active" : "inactive"}
          onClick={() => { onChange(opt.value); onBlur(); }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// 2. 注册到作用域 registry
const registry = createPluginRegistry();
registry.field.set("shadcn/status-segmented", StatusSegmented);

// 3. schema 中引用 component
// { name: "projectStatus", type: "custom", component: "shadcn/status-segmented" }`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};

export const CustomLayout: Story = {
  args: {
    testId: "workbook-story-plugin-layout",
    workbook: createCustomLayoutWorkbook(),
    registry: createPluginSystemRegistry(),
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-plugin-layout-shell"
      title="自定义布局插件"
      caption="注册 Card 布局组件，将一组字段渲染为带渐变背景的卡片。布局节点 children 自动递归渲染。"
      capabilities={["布局插件", "children 递归"]}
      code={`// 1. 编写布局组件（WorkbookLayoutPluginProps）
function CardLayout({ node, children }) {
  return (
    <section style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: 14 }}>
      <h3>{node.title}</h3>
      {children} {/* 子节点递归渲染 */}
    </section>
  );
}

// 2. 注册
registry.layout.set("storybook/card", CardLayout);

// 3. schema 中引用
// layout: [
//   { type: "custom", component: "storybook/card", title: "交付卡片", children: [
//     { type: "field", name: "name" },
//   ]}
// ]`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};

export const CustomValidation: Story = {
  args: {
    testId: "workbook-story-plugin-validation",
    workbook: createCustomValidationWorkbook(),
    registry: createPluginSystemRegistry(),
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-plugin-validation-shell"
      title="自定义校验插件"
      caption="注册身份证号校验插件（含加权校验位算法），schema 中声明 type 即自动生效。输入 18 位身份证号体验。"
      capabilities={["校验插件", "加权算法"]}
      code={`// 1. 编写校验插件（返回 string | undefined | Promise）
function idCardValidation({ value }) {
  if (typeof value !== "string" || value === "") return;
  if (!/^\\d{17}[\\dXx]$/.test(value)) return "身份证号必须为 18 位";
  // ... 加权校验位计算
  return expected === value[17].toUpperCase() ? undefined : "校验位不正确";
}

// 2. 注册
registry.validation.set("storybook/id-card", idCardValidation);

// 3. schema 中引用
// validations: [{ type: "storybook/id-card", message: "身份证号不合法" }]`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};

export const CustomCondition: Story = {
  args: {
    testId: "workbook-story-plugin-condition",
    workbook: createCustomConditionWorkbook(),
    registry: createPluginSystemRegistry(),
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-plugin-condition-shell"
      title="自定义条件插件"
      caption="注册「是否为工作日」条件插件：选择周末日期时「会议室」字段自动隐藏。"
      capabilities={["条件插件", "动态可见性"]}
      code={`// 1. 编写条件插件（返回 boolean）
function isWorkday({ data, condition }) {
  const path = condition.params.path;
  const raw = data[path];
  if (typeof raw !== "string" || raw === "") return true;
  const day = new Date(raw + "T00:00:00").getUTCDay();
  return day >= 1 && day <= 5; // 周一 ~ 周五
}

// 2. 注册
registry.condition.set("storybook/is-workday", isWorkday);

// 3. schema 中引用
// visible: { op: "custom", name: "storybook/is-workday", params: { path: "meetingDate" } }`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};
