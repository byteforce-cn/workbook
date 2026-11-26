import type { Meta, StoryObj } from "@storybook/react";
import { StoryShell } from "./StoryShell";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createCustomConditionWorkbook,
  createCustomFieldWorkbook,
  createCustomLayoutWorkbook,
  createCustomPageBlockWorkbook,
  createCustomValidationWorkbook,
  createPluginSystemRegistry,
} from "./workbookPluginSystemFixtures";

const componentDocs = `### 适用场景
内置字段/布局/校验/条件/页面块不够用时，通过 registry 扩展，而不是 fork 渲染器。五类插件可分别注册，也可并存在一个 registry 里。

### 最小可运行示例
\`\`\`tsx
import { createPluginRegistry } from "@byteforce/workbook";

const registry = createPluginRegistry();
registry.registerField("status", StatusSegmented);   // 字段控件
registry.registerValidation("idCard", idCardValidator);
registry.registerCondition("isWorkday", isWorkday);
registry.registerLayout("card", CardLayout);
registry.registerPageBlock("seal", SealBlock);

<Workbook workbook={schema} data={data} registry={registry} />;
\`\`\`

### API
- \`registerField(id, component)\`：接收 \`{ field, value, onChange, onBlur, errors, readOnly }\`。
- \`registerValidation(id, plugin)\`：返回 \`string | undefined\` 或 \`Promise\`；异步需在 schema 里写 \`async: true\`。
- \`registerCondition(id, predicate)\`、\`registerOptionSource(id, loader)\`、\`registerLayout(id, component)\`、\`registerPageBlock(id, component)\`。
- 多个 registry 用 \`<PluginProvider registry={…}>\` 隔离，非受控区域内不共享插件。

### 边界与错误
- 未注册的 custom 字段/page block 不会降级成内置控件，而是不渲染（空位）；条件插件未注册时默认 **false**。
- 插件抛错会被错误边界捕获并显示降级 UI，不会弄崩整个表单。
- 同一个 id 重复注册以最后一次为准，不警告。

### 源码
${sourceLink("src/react/registry.ts")} · ${docsLink("guides/custom-field", "guides/custom-field")}`;

const meta = {
  title: "Workbook/Plugin System",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomField: Story = {
  parameters: storyNote(
    "中间那段分段控件不是内置字段类型：它在 registry 里注册为 custom field。点选不同状态，右侧数据树用字段名回显写回值。",
  ),
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
  parameters: storyNote(
    "卡片背景与分组标题来自注册的 card 布局插件；它仍然递归渲染 children，所以内部字段的校验与依赖照常生效。",
  ),
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
  parameters: storyNote(
    "输入一个 18 位身份证号：校验位不对时提示来自注册的插件而不是内置规则；把最后一位改错能复现失败。",
  ),
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
  parameters: storyNote(
    "选一个周末日期：「会议室」字段会被注册的 isWorkday 条件隐藏；改回工作日又重新出现，值不被清空。",
  ),
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

export const CustomPageBlock: Story = {
  parameters: storyNote(
    "页面顶部的印章/横幅是 page 视图里的 custom block，按 component id 命中注册插件；它的高度参与分页测量，所以内容不会被下一页覆盖。",
  ),
  args: {
    testId: "workbook-story-plugin-page-block",
    workbook: createCustomPageBlockWorkbook(),
    registry: createPluginSystemRegistry(),
  },
  render: (args) => (
    <StoryShell
      testId="workbook-story-plugin-page-block-shell"
      title="自定义 page block 插件"
      caption="page 视图里的 { type: 'custom' } block 按 component id 命中 registerPageBlock 注册的组件；renderHints.height 参与分页测量，未注册时该 block 不渲染。"
      capabilities={["pageBlock 插件", "renderHints.height 分页", "业务视图（流程进度条）"]}
      code={`import { createPluginRegistry } from "@byteforce/workbook";

const registry = createPluginRegistry({ namespace: "app" });
registry.registerPageBlock("app:flowStepper", FlowStepper);

// schema
// { "type": "custom", "component": "app:flowStepper",
//   "renderHints": { "height": 120 }, "props": { "currentStep": 1 } }`}
    >
      <WorkbookStoryHarness {...args} />
    </StoryShell>
  ),
};
