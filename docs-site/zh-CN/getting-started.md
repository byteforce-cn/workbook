# 快速开始

**5 分钟**渲染你的第一个表单。

## 安装

::: code-group

```bash [pnpm]
pnpm add @byteforce/workbook
```

```bash [npm]
npm install @byteforce/workbook
```

```bash [yarn]
yarn add @byteforce/workbook
```

:::

## 快速上手：SimpleForm

渲染表单最快的方式 —— 无需了解 schema：

```tsx
import { SimpleForm } from "@byteforce/workbook/quick";

function App() {
  return (
    <SimpleForm
      fields={[
        { name: "username", type: "text", label: "用户名", required: true },
        { name: "email", type: "text", label: "邮箱", format: "email" },
        {
          name: "role",
          type: "select",
          label: "角色",
          options: [
            { value: "admin", label: "管理员" },
            { value: "user", label: "普通用户" },
          ],
        },
      ]}
      onSubmit={(data) => console.log("提交：", data)}
    />
  );
}
```

就这样！你将获得一个带校验、数据绑定与提交处理的完整交互表单。

## 选择 API 层级

`@byteforce/workbook` 提供 **三层 API** —— 按需选择：

| 层级 | API | 适用场景 |
|------|-----|----------|
| **L1** | `@byteforce/workbook/quick` 的 `SimpleForm` | 需要快速渲染一个表单、配置最少 |
| **L2** | `@byteforce/workbook` 的 `DocumentRenderer` | 已有完整的 BF Schema v4.1.1 workbook 定义 |
| **L3** | `FormRenderer` / `PageRenderer` / `SheetRenderer` + core 原语 | 需要完全掌控渲染、数据与插件 |

## 下一步

- **[安装](/zh-CN/installation)** —— 详细配置与兼容性
- **Quick Start API** —— SimpleForm 完整参考（英文）
- **Document Renderer** —— schema 驱动渲染（英文）
- **插件系统** —— 扩展自定义字段与逻辑（英文）
- **[指南](/guides/custom-field)** —— 自定义字段、校验等（英文）
