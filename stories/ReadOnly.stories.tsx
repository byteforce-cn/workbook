import type { Meta, StoryObj } from "@storybook/react";
import { SimpleForm } from "../src/quick/SimpleForm";
import { StoryShell } from "./StoryShell";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createEditableDraftWorkbook, createReadOnlyReviewWorkbook } from "./workbookReadOnlyFixtures";

const meta = {
  title: "Workbook/ReadOnly",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ApprovingReadOnly: Story = {
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
