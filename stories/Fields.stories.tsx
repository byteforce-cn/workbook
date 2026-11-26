import type { Meta, StoryObj } from "@storybook/react";
import { storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createFieldsCapabilityWorkbook } from "./workbookCapabilityFixtures";

const componentDocs = `### 适用场景
需要用一个 schema 描述整张表单（字段、布局、校验、选项源）并交给运行时渲染时使用。
只想快速出一个表单时用 \`SimpleForm\`；只想渲染已经存在的数据时用 \`DocumentRenderer\`。

### 最小可运行示例
\`\`\`tsx
const schema = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  views: [
    {
      type: "form",
      id: "order",
      label: "订单",
      content: [
        { type: "field", name: "customer", overrides: { type: "text", label: "客户", required: true } },
        { type: "field", name: "amount", overrides: { type: "number", label: "金额" } },
      ],
    },
  ],
  data: { customer: "", amount: null },
};
\`\`\`

### API
- 字段类型由 \`field.overrides.type\` 决定：string / number / boolean / date / textarea / select / multiselect / array / object。
- 字段级 \`config\` 可覆盖 \`readOnly\`、\`validateMode\` 等运行时行为。
- 自定义类型通过 \`WorkbookPluginRegistry.registerField\` 注册，再在 schema 里引用。

### 边界与错误
- \`data\` 里缺失的字段仍会渲染，值为 \`undefined\`；受控模式下需自行保证回写。
- 未知 \`type\` 会回落到文本字段，而不是抛错。
- \`array\` / \`object\` 需要 \`itemFields\` 才能渲染子字段。

### 源码
[\`src/renderers/form/FieldFactory.tsx\`](https://github.com/byteforce-cn/workbook/blob/main/src/renderers/form/FieldFactory.tsx) · [\`schema/schema-reference\`](https://byteforce-cn.github.io/workbook/schema/schema-reference)`;

const meta = {
  title: "Workbook/Fields",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimitiveFieldTypes: Story = {
  parameters: storyNote(
    "左侧从上到下依次是 string、number、boolean、date、textarea、select、multiselect、array、object；改任一字段，右侧数据树会立即回显写回的路径与值。",
  ),
  args: {
    testId: "workbook-story-fields",
    workbook: createFieldsCapabilityWorkbook(),
    caption:
      "覆盖 string、number、boolean、date、textarea、select、multiselect、array、object 九类字段，并通过右侧数据树回显验证写回链路。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
