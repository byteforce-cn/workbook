import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock, StoryShell } from "./StoryShell";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createAsyncValidationRegistry,
  createAsyncValidationWorkbook,
  createConditionalValidationWorkbook,
  createSyncValidatorsWorkbook,
} from "./workbookCapabilityFixtures";

const componentDocs = `### 适用场景
需要在 schema 里声明字段校验（必填、范围、正则、异步唯一性、条件必填）而不是在业务组件里散写规则时使用。

### 最小可运行示例
\`\`\`tsx
{ type: "field", name: "amount", overrides: {
  type: "number",
  validations: [
    { type: "required", message: "金额必填" },
    { type: "min", params: { value: 0 }, message: "不能为负" },
    { type: "min", params: { value: 500 }, message: "超 500 需说明原因",
      condition: { field: "needsReason", equals: true } },
  ],
}}
\`\`\`

### API
- 内置同步规则：\`required\` / \`min\` / \`max\` / \`minLength\` / \`maxLength\` / \`pattern\`（参数放在 \`params\`，失败显示 \`message\`）。
- 其他 \`type\` 由 \`registry.registerValidation(id, plugin)\` 注册，可同步也可 \`async: true\`。
- 每条规则都可加 \`condition\`，不满足时该规则不参与校验。

### 边界与错误
- 未注册的 \`type\` 会被跳过（不报错也不拦截），拼错规则名等于关闭校验。
- \`pattern\` 是字符串正则，非法正则会直接返回 \`message\`（视为不通过）。
- 异步校验不会阻断输入，只在结果回来时更新错误状态；快速连续输入以最后一次为准。

### 源码
${sourceLink("src/core/validation/validator.ts")} · ${docsLink("guides/custom-validation", "guides/custom-validation")}`;

const meta = {
  title: "Workbook/Validation",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyncValidators: Story = {
  parameters: storyNote(
    "逐个把字段清空或改成越界值：错误文案出现在字段下方，右侧数据树仍保留原值。改回合法值后错误立即消失，说明同步规则在 onChange 时就跑。",
  ),
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
  parameters: storyNote(
    "输入一个已存在的用户名（如 admin）会触发 600ms 的异步唯一性校验：先看到「校验中」再看到失败文案；换成新名字则通过。",
  ),
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
  parameters: storyNote("金额超 500 时，「原因」才变必填：先填 100 提交能过，改成 5000 后同一字段会阻断提交。"),
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
