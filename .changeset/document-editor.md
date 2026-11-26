---
"@byteforce/workbook": minor
---

新增可选的 `@byteforce/workbook/editor` 入口：Tiptap/ProseMirror 编辑投影、PageView 双向 codec、表格/绑定/条件块/出流层面板、打印预览桥；同时新增 canonical 序列化、内容哈希、签名钩子与 schemaVersion 迁移，以及字段级 `readOnly`、`setFieldErrors` 与 option 缓存按业务键失效。编辑器依赖为可选 peer，不进入现有入口。
