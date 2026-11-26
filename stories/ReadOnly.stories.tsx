import type { Meta, StoryObj } from "@storybook/react";
import { SimpleForm } from "../src/quick/SimpleForm";
import { StoryShell } from "./StoryShell";
import { sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";

const componentDocs = `### 适用场景
单据进入审核/归档阶段后，同一份 schema 要整体切换成只读；或者同屏对比「可编辑草稿 vs 审核中只读」。

### 最小可运行示例
\`\`\`tsx
// 由 schema 的 formView.config 驱动
formView: { config: { readOnly: true, readOnlyDisplay: "disabled" } }

// 或在组件层整体只读（Quick API）
<SimpleForm fields={fields} readOnly />
\`\`\`

### API
- \`config.readOnly\`：字段全部禁用，提交/重置按钮隐藏，明细不可增删。
- \`config.readOnlyDisplay\`：\`"disabled"\`（默认，保留输入框但禁用）或 \`"text"\`（渲染成 label + 文本，无表单控件）。
- 字段级 \`readOnly\` 可单独覆盖视图级设置。

### 边界与错误
- 只读不影响校验：已存在的不合法数据仍会显示错误文案，但不会阻止渲染。
- 只读状态下的数据仍可被写回（例如外部 \`data\` 更新），只是用户不能编辑。
- \`readOnlyDisplay: "text"\` 会丢失输入框的交互语义，屏幕阅读器读到的是纯文本。

### 源码
${sourceLink("src/renderers/form/FormRenderer.tsx")}
`;

import { createEditableDraftWorkbook, createReadOnlyReviewWorkbook } from "./workbookReadOnlyFixtures";

const meta = {
  title: "Workbook/ReadOnly",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ApprovingReadOnly: Story = {
  parameters: storyNote(
    "整张单据处于审核中：字段全部禁用、提交/重置不渲染、明细的增删按钮禁用。试试 Tab 键，焦点仍会经过这些字段（可被屏幕阅读器读到）。",
  ),
  args: {
    testId: "workbook-story-readonly-approving",
    workbook: createReadOnlyReviewWorkbook(),
    caption: "formView.config.readOnly = true：所有字段禁用、提交/重置按钮隐藏，用于审核中单据只读查看。",
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-readonly-approving-shell"
      title="审核中表单只读"
      caption="单据处于「审批中」状态时，通过 formView.config.readOnly 一键进入只读：全部字段禁用、提交/重置按钮不渲染、明细不可增删。数据树仅作展示，任何修改都不可落盘。"
      capabilities={["只读", "审核中", "隐藏操作按钮"]}
      code={`// 只需要在表单视图的 config 里声明 readOnly，无需给每个字段配 disabled
const workbook = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  views: [
    {
      type: "form",
      id: "change-form",
      label: "变更申请（审核中）",
      config: {
        readOnly: true,          // ← 一键只读
        validateMode: "onBlur",
      },
      fields: [ /* ... */ ],
    },
  ],
};`}
    >
      <WorkbookStoryHarness
        {...args}
        inspector={
          <div style={{ display: "grid", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "15px" }}>只读行为</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#526173", fontSize: "13px", lineHeight: 1.7 }}>
              <li>所有输入框 / 下拉框 / 文本域禁用</li>
              <li>提交、重置按钮不渲染</li>
              <li>明细「新增 / 删除」按钮禁用</li>
              <li>autoSave 与 onSubmit 被拦截</li>
            </ul>
          </div>
        }
      />
    </StoryShell>
  ),
};

export const DraftVsApproving: StoryObj = {
  parameters: storyNote(
    "同一份定义的两种只读状态并排：左边可编辑并能提交，右边禁用且没有操作按钮。窄屏会自动上下堆叠，两边对照看字段状态差异。",
  ),
  render: () => (
    <StoryShell
      testId="workbook-story-readonly-compare-shell"
      title="草稿可编辑 vs 审核中只读"
      caption="同一份变更单，左侧是提交前的可编辑草稿（含提交/重置按钮），右侧是进入审批流后的只读视图。切换由 formView.config.readOnly 单一配置驱动。"
      capabilities={["对比", "config.readOnly"]}
      code={`// 同一份定义，仅 config.readOnly 不同
createChangeWorkbook({ readOnly: false }); // 草稿：可编辑
createChangeWorkbook({ readOnly: true });  // 审核中：只读`}
      width="min(1440px, calc(100vw - 48px))"
    >
      <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <WorkbookStoryHarness
          testId="workbook-story-readonly-draft"
          workbook={createEditableDraftWorkbook()}
          caption="草稿（readOnly: false）—— 字段可编辑，含提交 / 重置按钮。"
        />
        <WorkbookStoryHarness
          testId="workbook-story-readonly-approving-2"
          workbook={createReadOnlyReviewWorkbook()}
          caption="审核中（readOnly: true）—— 字段禁用，操作按钮隐藏。"
        />
      </div>
    </StoryShell>
  ),
};

export const QuickReadOnly: StoryObj = {
  parameters: storyNote(
    "Quick API 的一行开关：同一个 SimpleForm 传 readOnly 前后对比，字段禁用规则与 schema 驱动的只读保持一致。",
  ),
  render: () => (
    <StoryShell
      testId="workbook-story-readonly-quick-shell"
      title="Quick API 只读"
      caption="SimpleForm 同样支持 readOnly prop：零配置快速获得审核中只读表单。"
      capabilities={["SimpleForm", "readOnly"]}
      code={`<SimpleForm
  fields={[
    { name: "title", type: "text", label: "变更标题" },
    { name: "reason", type: "textarea", label: "变更原因" },
  ]}
  initialData={{ title: "桩基直径调整", reason: "地质条件变更" }}
  readOnly          // ← 一键只读
/>`}
    >
      <QuickReadOnlyForm />
    </StoryShell>
  ),
};

function QuickReadOnlyForm() {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #d9e1ec", borderRadius: "16px", padding: "20px" }}>
      <SimpleForm
        fields={[
          { name: "title", type: "text", label: "变更标题" },
          { name: "owner", type: "text", label: "发起人" },
          { name: "reason", type: "textarea", label: "变更原因" },
        ]}
        initialData={{
          title: "桩基直径由 φ1.2m 调整为 φ1.5m",
          owner: "张三（项目经理）",
          reason: "地质条件变更，原桩型承载力不足",
        }}
        readOnly
      />
    </div>
  );
}
