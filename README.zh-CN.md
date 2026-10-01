# @byteforce/workbook

[![CI](https://github.com/byteforce-cn/workbook/actions/workflows/ci.yml/badge.svg)](https://github.com/byteforce-cn/workbook/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@byteforce/workbook.svg)](https://www.npmjs.com/package/@byteforce/workbook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Schema 驱动的业务文档运行时** —— 用一份 `BFDocumentSchema v4.1.1` 描述数据，
同一份 schema 与数据树即可同时驱动 **表单录入 → 分页文档（page）→ 台账表格
（sheet）→ 打印 / PDF 输出**。

- 🧾 **一份 schema，四种视图**：form → page → sheet → PDF 天然保持一致。
- 🧩 **插件体系**：自定义字段、布局、校验、选项源与生命周期 Hook。
- 🌐 **远端选项源**：URL / GraphQL / 自定义插件，支持 `$field` 绑定、分页与缓存。
- 📱 **多端适配**：desktop / tablet / mobile 响应式渲染（React Native 渲染为实验特性）。
- 🖨️ **打印与 PDF**：可打印 HTML 与零依赖的二进制 PDF 输出。
- 🧪 **严格 TypeScript**：类型由 JSON schema 全量生成；strict 模式、多入口可摇树。

## 安装

```bash
pnpm add @byteforce/workbook
# 或：npm install @byteforce/workbook / yarn add @byteforce/workbook
```

React 18 / 19 为 peer 依赖；Zod 校验适配器额外需要 `zod`（可选 peer）。

## 快速开始

零配置表单（`SimpleForm`）：

```tsx
import { SimpleForm } from "@byteforce/workbook/quick";

export function OrderForm() {
  return (
    <SimpleForm
      fields={[
        { name: "customerName", type: "string", label: "客户名称", required: true },
        { name: "amount", type: "number", label: "订单金额" },
        { name: "deliveryDate", type: "date", label: "交付日期" },
      ]}
      onSubmit={(data) => console.log("提交", data)}
    />
  );
}
```

完整文档（form + page + sheet 同一份 workbook）：

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import type { WorkbookDefinition } from "@byteforce/workbook";

const workbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: { customerName: "" },
  views: [
    {
      type: "form",
      id: "main",
      label: "订单",
      fields: [
        { name: "customerName", type: "string", label: "客户名称", bind: { path: "customerName", mode: "twoWay" } },
      ],
    },
    {
      type: "page",
      id: "contract",
      label: "合同",
      content: [{ type: "paragraph", runs: [{ type: "text", text: "尊敬的客户…" }] }],
    },
  ],
};

export function App() {
  return <DocumentRenderer workbook={workbook} />;
}
```

默认主题（可选）：

```ts
import "@byteforce/workbook/styles.css";
```

## 包入口

| 入口 | 内容 |
|------|------|
| `@byteforce/workbook` | `DocumentRenderer`、各类视图、设备包装、打印 / PDF 工具 |
| `@byteforce/workbook/core` | 框架无关纯函数（零 React 依赖） |
| `@byteforce/workbook/react` | React Provider / Hook / 错误边界 / 作用域插件注册表 |
| `@byteforce/workbook/quick` | 零配置 `SimpleForm` |
| `@byteforce/workbook/react-native` | React Native 渲染（**实验特性**） |
| `@byteforce/workbook/adapters/zod` | Zod 校验适配器（可选） |
| `@byteforce/workbook/styles.css` | 默认主题 |

## 兼容性

| 环境 | 支持范围 |
|------|----------|
| Node.js | ≥ 20.16 (LTS) |
| React / React DOM | 18.x · 19.x |
| 浏览器 | 常青版 Chromium / Firefox / Safari（依赖 Canvas 与 SVG） |
| React Native | 实验特性 —— API 可能在小版本间调整 |

## 文档

- **在线文档** —— <https://byteforce-cn.github.io/workbook/>
- **Storybook 交互示例** —— <https://byteforce-cn.github.io/workbook/storybook/>
- **API 参考** —— <https://byteforce-cn.github.io/workbook/api-reference/>
- **本地文档** —— `docs-site/`（运行 `pnpm docs:dev`）；Schema 参考见 `docs-site/schema/schema-reference.md`
- **i18n 与默认文案** —— 内置 UI 文案默认回退为中文（zh-CN）；详见 `docs-site/guides/i18n.md`
- **参与贡献** —— 见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 参与贡献

欢迎参与！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。所有提交需按
[DCO](https://developercertificate.org/) 签署；请遵守
[行为准则](./CODE_OF_CONDUCT.md)；安全问题请按 [SECURITY.md](./SECURITY.md) 上报。

## 许可证

[MIT](./LICENSE) © ByteForce

---

English version: [README.md](./README.md)。
