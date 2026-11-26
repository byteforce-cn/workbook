import type { Meta, StoryObj } from "@storybook/react";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createLayoutCapabilityWorkbook, createRowSpanWorkbook } from "./workbookCapabilityFixtures";

const componentDocs = `### 适用场景
表单需要分组、多列、选项卡、步骤条、条件显隐或重复明细时，用布局节点描述结构，而不是写业务组件。

### 最小可运行示例
\`\`\`tsx
content: [
  { type: "group", title: "基本信息", children: [
    { type: "row", children: [
      { type: "field", name: "code", span: 1 },
      { type: "field", name: "name", span: 2 },
    ]},
  ]},
  { type: "conditional", condition: { field: "kind", equals: "company" }, then: [/* … */] },
  { type: "repeat", name: "items", children: [/* 明细字段 */] },
]
\`\`\`

### API
- 布局节点：\`group\` / \`row\`（含 \`span\` 相对跨列）/ \`tabs\` / \`steps\` / \`conditional\` / \`repeat\` / \`html\`。
- \`row\` 的列数为子项 \`span\` 之和，\`span\` 会按最大公约数归一（1+2 → 3 列）。
- \`conditional\` 用 \`condition\` 控制显隐；\`repeat\` 绑定 \`data\` 里的数组。

### 边界与错误
- 布局节点只能嵌套在允许的父节点下（如 \`row\` 不能直接包含 \`tabs\`），非法嵌套会被 schema 校验拦下。
- \`html\` 节点会经过内置 XSS 清洗，白名单外的标签与属性会被删除。
- \`repeat\` 的增删按钮在 \`readOnly\` 下禁用而不是隐藏。

### 源码
${sourceLink("src/renderers/form/LayoutRenderer.tsx")} · ${docsLink("guides/custom-layout", "guides/custom-layout")}`;

const meta = {
  title: "Workbook/Layout",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabsStepsRepeatAndHtml: Story = {
  parameters: storyNote(
    "从上往下依次看 group、row、tabs、steps、conditional、repeat、html 七类节点：切 tab 与步骤条时留意右侧数据树不会丢值，repeat 里可增删明细行。",
  ),
  args: {
    testId: "workbook-story-layout",
    workbook: createLayoutCapabilityWorkbook(),
    caption: "同一份 workbook 文档同时展示 group、row、tabs、steps、conditional、repeat 和 html 七类布局节点。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};

export const RowFieldSpan: Story = {
  parameters: storyNote(
    "四行分别演示 1+1、1+2、2+1、3 的 span 组合：比较每一行各字段的宽度比例，整行字段应占满内容区而不是被拉伸到视口宽。",
  ),
  args: {
    testId: "workbook-story-row-span",
    workbook: createRowSpanWorkbook(),
    caption: "row 布局消费 layoutField.span 相对跨列：1+1 等宽基线、1+2 与 2+1 错落、3 整行（textarea 宽字段跨列）。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
