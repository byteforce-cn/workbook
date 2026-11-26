import type { Meta, StoryObj } from "@storybook/react";
import { sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createDependencyCapabilityWorkbook } from "./workbookCapabilityFixtures";

const componentDocs = `### 适用场景
字段的可见性、禁用、必填、选项需要随另一个字段变化时（如「省份→城市」「是否开票→税号」），用 dependency 声明，不要写 
 \`onChange\` 跟新数据。

### 最小可运行示例
\`\`\`tsx
{ type: "field", name: "taxId", overrides: {
  type: "string",
  dependencies: [{
    targetField: "needsInvoice",
    condition: { field: "needsInvoice", equals: true },
    effect: { visible: true, required: true },
    otherwise: { visible: false },
  }],
}}
\`\`\`

### API
- \`targetField\`：依赖哪个字段；\`condition\`：求值条件。
- \`effect\` / \`otherwise\` 可分别控制 \`visible\` / \`required\` / \`disabled\` / \`options\` / \`validations\` / \`defaultValue\` / \`props\`。
- \`debounce\` 可延迟求值，适合选项来自远程的依赖。

### 边界与错误
- 依赖只在被依赖字段真变化时重算；初始数据不满足条件时字段直接不渲染。
- 字段被隐藏时其值仍保留在数据树里，提交前需要自己清理（或把它设为 \`required\` 触发校验）。
- 循环依赖（A 依赖 B、B 依赖 A）不会被自动检测，会造成静默不更新。

### 源码
${sourceLink("src/renderers/form/FormRenderer.tsx")}`;

const meta = {
  title: "Workbook/Dependencies",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VisibilityAndDisableState: Story = {
  parameters: storyNote(
    "切换顶部的开关字段，看下游字段在 visible / disabled / required 三种效果间变化；右侧数据树保留被隐藏字段的值，可在提交前据此清理。",
  ),
  args: {
    testId: "workbook-story-dependencies",
    workbook: createDependencyCapabilityWorkbook(),
    caption: "通过字段依赖切换 disabled 与 visible，验证 dependency 引擎不是静态声明，而是直接驱动表单运行时状态。",
    width: "1080px",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
