# 安装

## 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 20.16 (LTS) |
| React | ^18.0.0 \|\| ^19.0.0 |
| React DOM | ^18.0.0 \|\| ^19.0.0 |

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

## 引入默认主题

在应用入口引入默认主题 CSS：

```ts
// main.tsx 或 App.tsx
import "@byteforce/workbook/styles.css";
```

## 包入口

`@byteforce/workbook` 提供多个入口以支持摇树优化：

| 入口 | 导入 | 说明 |
|------|------|------|
| 主入口 | `@byteforce/workbook` | 完整引擎（含 React 绑定） |
| Core | `@byteforce/workbook/core` | 框架无关纯函数 |
| React | `@byteforce/workbook/react` | React 绑定层（Provider、Hook） |
| Quick | `@byteforce/workbook/quick` | 零配置 SimpleForm API |
| React Native | `@byteforce/workbook/react-native` | RN 渲染（**实验特性**，API 可能在小版本间调整） |
| Zod 适配器 | `@byteforce/workbook/adapters/zod` | 可选的 Zod 校验适配器（需要 `zod`） |

> **实验特性**：React Native 入口面向早期采用者发布，尚未纳入常规 semver 承诺；
> 如基于它开发，建议锁定精确版本。

## TypeScript

包内自带类型定义，无需额外安装 `@types/` 包：

```ts
import type {
  FieldDefinition,
  WorkbookData,
  ValidationDefinition,
} from "@byteforce/workbook";
```

## 本地联调（进阶）

当通过本地构建（如 `pnpm link`、`file:` 依赖或 workspace 链接）消费本库时，
重新构建 **不会** 自动同步到正在运行的 dev server，可能有两层缓存：

1. **包管理器链接/拷贝** —— 重建后重新执行安装步骤，让消费方看到新的 `dist/`。
2. **Vite `optimizeDeps` 预打包缓存**（`node_modules/.vite`）—— 若包版本哈希未变，
   缓存不会失效，dev server 会继续提供旧产物（典型症状：「JS 是旧的、CSS 是新的」）。

完整的刷新链路：

```bash
# 1. 重新构建库
pnpm build

# 2. 重新链接消费方依赖
pnpm install

# 3. 在消费方应用中清理 Vite 预打包缓存
rm -rf node_modules/.vite

# 4. 重启 Vite dev server
pnpm dev
```

> 在 monorepo 中可能需要在 workspace 根执行 `pnpm install`；`node_modules/.vite`
> 位于消费方应用的 `node_modules`（或提升后的 workspace 根）。一次性检查也可用
> `vite --force` 绕过缓存。

## 下一步

- **[快速开始](/zh-CN/getting-started)** —— 渲染你的第一个表单
- **[Quick Start API](/api/quick-start)** —— SimpleForm 参考（英文）
