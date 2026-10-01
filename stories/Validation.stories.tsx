import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock, StoryShell } from "./StoryShell";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createAsyncValidationRegistry,
  createAsyncValidationWorkbook,
  createConditionalValidationWorkbook,
  createSyncValidatorsWorkbook,
} from "./workbookCapabilityFixtures";

const meta = {
  title: "Workbook/Validation",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyncValidators: Story = {
  args: {
    testId: "workbook-story-validation-sync",
    workbook: createSyncValidatorsWorkbook(),
    caption:
      "required / min / max / minLength / maxLength / pattern 六种内置同步校验规则，onChange 实时触发展示错误消息。",
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-validation-sync-shell"
      title="内置同步校验"
      caption="六种内置规则在同一表单中实时触发：required、min、max、minLength、maxLength、pattern。修改字段即可看到错误消息与数据树同步。"
      capabilities={["required", "min/max", "minLength/maxLength", "pattern"]}
      code={`// 在字段定义中声明校验规则即可，无需编写校验函数
{
  name: "mobile",
  type: "string",
  label: "手机号",
  validations: [
    { type: "required", message: "手机号不能为空" },
    { type: "pattern", params: { value: "^1\\\\d{10}$" }, message: "手机号格式不正确" },
  ],
}`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};

export const AsyncValidation: Story = {
  args: {
    testId: "workbook-story-validation-async",
    workbook: createAsyncValidationWorkbook(),
    registry: createAsyncValidationRegistry(),
    caption: "自定义异步校验插件：用户名唯一性检查（mock 600ms），loading 期间显示校验中状态。",
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-validation-async-shell"
      title="异步校验"
      caption="通过 registry.validation.set 注册异步校验插件，实现用户名唯一性检查。输入 admin / root / taken 会命中 mock 已占用名单。"
      capabilities={["async 校验", "自定义校验插件", "loading"]}
      code={`import { createPluginRegistry } from "@byteforce/workbook";

const registry = createPluginRegistry();
registry.validation.set("uniqueUsername", async ({ value }) => {
  const taken = await checkRemote(value); // 远程查询
  return taken ? "用户名已被占用" : undefined;
});`}
    >
      <WorkbookStoryHarness
        {...args}
        inspector={
          <div style={{ display: "grid", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "15px" }}>演示提示</h3>
            <p style={{ margin: 0, color: "#526173", fontSize: "13px", lineHeight: 1.6 }}>
              在「用户名」输入框输入 <code>admin</code>、<code>root</code> 或 <code>taken</code> 后失焦， 600ms
              后返回「用户名已被占用」。
            </p>
            <CodeBlock
              code={`const TAKEN = new Set(["admin", "root", "taken"]);

registry.validation.set("uniqueUsername", async ({ value }) => {
  if (typeof value !== "string" || value.trim() === "") return;
  await new Promise((r) => setTimeout(r, 600));
  return TAKEN.has(value.trim())
    ? "用户名已被占用"
    : undefined;
});`}
              maxHeight="220px"
            />
          </div>
        }
      />
    </StoryShell>
  ),
};

export const ConditionalValidation: Story = {
  args: {
    testId: "workbook-story-validation-conditional",
    workbook: createConditionalValidationWorkbook(),
    caption: "校验规则附加 condition 条件：金额超过 500 时，「原因」字段才参与必填校验。",
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-validation-conditional-shell"
      title="条件校验"
      caption="校验规则可附加 condition 门控 —— 金额 ≤ 500 时清空原因也不会报错；金额 &gt; 500 时原因变为必填。"
      capabilities={["条件门控", "动态规则"]}
      code={`{
  name: "reason",
  type: "textarea",
  label: "原因",
  validations: [
    {
      type: "required",
      message: "原因不能为空",
      condition: { op: "gt", path: "amount", value: 500 },
    },
  ],
}`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};
