# 文档编辑器

`@byteforce/workbook/editor` 只编辑 `PageView` 的流式内容；持久化对象始终是
`WorkbookDefinition`。页眉、页脚、水印与浮动块在独立面板中编辑，保存时按原始相对位置合并。

## 安装

Tiptap/ProseMirror 是**可选 peer 依赖**，只在使用编辑器的应用中安装：

```bash
npm install @tiptap/core@3.35.0 @tiptap/pm@3.35.0 @tiptap/react@3.35.0 @tiptap/extension-text@3.35.0
```

版本精确锁定（Tiptap 3 的 minor 会改扩展 API）。React 18/19 均受支持。

## 最小示例

```tsx
import { DocumentEditor } from "@byteforce/workbook/editor";
import "@byteforce/workbook/styles.css";

<DocumentEditor
  workbook={workbook}
  onSave={(next) => persist(next)}
  previewData={{ customer: { name: "Alice" } }}
/>
```

`onSave` 收到替换了页面视图的新 `WorkbookDefinition`，传入对象不会被原地修改。
命令式访问使用 `ref`：`save()` / `isDirty()` / `getView()`。

## 架构

- `views[type="page"]` 是唯一真源。
- ProseMirror JSON 只存在于编辑会话，不落盘、不参与签名、不作为跨端格式。
- `toProseMirror` 做投影，`fromProseMirror` 回写并执行 AJV 校验；不可无损表达的
  编辑会抛出带结构化诊断的 `EditorSerializationError`，不会静默降级。
- 数据绑定与条件块属于模板状态：预览数据不写回 `data`，条件求值不写回 `visible`。

## 保真度承诺

**编辑态 ≠ 打印输出。** 编辑器编辑 HTML；预览与 PDF 由 workbook 渲染器
（`layoutPageView` + SVG + 自研 PDF writer）生成，使用估算高度与字体度量。
打印预览复用同一条渲染链路，不新增测量逻辑。

已知差异：

| 区域 | 编辑态 | 预览/打印 | 计划 |
|---|---|---|---|
| 换行 | 浏览器排版 | `pageLayout.ts` 估算字宽 | 以预览为准 |
| 表格行高 | 内容撑开 | 固定估算 / 声明高度 | 记录为已知差异 |
| 列表缩进 | CSS 默认 | `listStyles` 解析 | 主题对齐 |
| 分页 | 正文流不画分页 | 真实分页 | 仅预览 |
| 字体 | 浏览器回退 | 页面默认字体 + PDF 嵌入 | 宿主提供字体 |

## 出流层

页眉/页脚/水印/浮动块由面板编辑，不进入正文 ProseMirror 文档。浮动块拖拽保持原单位
（pt 或 %），画布直接消费 `layoutPageView` 的矩形。

## 完整性与持久化

```ts
import { contentHash, signDocument, verifyDocument, migrateWorkbook } from "@byteforce/workbook/core";
```

`contentHash` 默认覆盖 `views`/`styles`/`printConfig`/`assets`，不包含 `data`。
详见 [完整性](./integrity.md)。

## v1 不支持

- 条件样式规则的可视化编辑（只读展示）。
- 编辑 spreadsheet 块（只读渲染）。
- 任意 `custom` 块属性面板（由宿主提供）。
- 将浮动块锚定到指定页（浮动块属于文档级）。

## 无障碍

工具栏可键盘操作，按钮暴露 `aria-pressed`，绑定浮层是带标签的对话框；
Storybook 对每个编辑器 story 以 error 级别运行 a11y 检查。
