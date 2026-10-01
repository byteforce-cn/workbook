# @byteforce/workbook

[![CI](https://github.com/byteforce-cn/workbook/actions/workflows/ci.yml/badge.svg)](https://github.com/byteforce-cn/workbook/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@byteforce/workbook.svg)](https://www.npmjs.com/package/@byteforce/workbook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Schema-driven runtime for business documents** — describe your data once with a
`BFDocumentSchema v4.1.1` document, and render it as an **editable form**, a
**paginated document (page)**, a **spreadsheet-like sheet**, and **print / PDF
output**, all from the same schema and data tree.

- 🧾 **One schema, four views** — form → page → sheet → PDF stays consistent by construction.
- 🧩 **Plugin system** — custom fields, layouts, validations, option sources and lifecycle hooks.
- 🌐 **Remote options** — URL / GraphQL / custom option sources with `$field` binding, pagination, caching.
- 📱 **Multi-device** — desktop / tablet / mobile responsive rendering (React Native renderer experimental).
- 🖨️ **Print & PDF** — print-ready HTML and a dependency-free binary PDF writer.
- 🧪 **Strict TypeScript** — types fully generated from the JSON schema; strict mode, tree-shakeable entries.

## Installation

```bash
pnpm add @byteforce/workbook
# or: npm install @byteforce/workbook / yarn add @byteforce/workbook
```

React 18 or 19 are peer dependencies. The Zod validation adapter additionally
needs `zod` (optional peer).

## Quick start

Zero-config form with `SimpleForm`:

```tsx
import { SimpleForm } from "@byteforce/workbook/quick";

export function OrderForm() {
  return (
    <SimpleForm
      fields={[
        { name: "customerName", type: "string", label: "Customer", required: true },
        { name: "amount", type: "number", label: "Amount" },
        { name: "deliveryDate", type: "date", label: "Delivery date" },
      ]}
      onSubmit={(data) => console.log("submitted", data)}
    />
  );
}
```

Full documents with `DocumentRenderer` (form + page + sheet in one workbook):

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import type { WorkbookDefinition } from "@byteforce/workbook";

const workbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "en-US",
  data: { customerName: "" },
  views: [
    {
      type: "form",
      id: "main",
      label: "Order",
      fields: [
        { name: "customerName", type: "string", label: "Customer", bind: { path: "customerName", mode: "twoWay" } },
      ],
    },
    {
      type: "page",
      id: "contract",
      label: "Contract",
      content: [{ type: "paragraph", runs: [{ type: "text", text: "Dear customer…" }] }],
    },
  ],
};

export function App() {
  return <DocumentRenderer workbook={workbook} />;
}
```

The default theme (optional):

```ts
import "@byteforce/workbook/styles.css";
```

## Package entry points

| Import | Contents |
|--------|----------|
| `@byteforce/workbook` | `DocumentRenderer`, views, device wrappers, print/PDF helpers |
| `@byteforce/workbook/core` | Framework-agnostic pure functions (no React) |
| `@byteforce/workbook/react` | React providers, hooks, error boundaries, scoped registry |
| `@byteforce/workbook/quick` | Zero-config `SimpleForm` |
| `@byteforce/workbook/react-native` | React Native renderers — **experimental** |
| `@byteforce/workbook/adapters/zod` | Optional Zod validation adapter |
| `@byteforce/workbook/styles.css` | Default theme |

## Compatibility

| Environment | Support |
|-------------|---------|
| Node.js | ≥ 20.16 (LTS) |
| React / React DOM | 18.x · 19.x |
| Browsers | Evergreen Chromium / Firefox / Safari (Canvas + SVG required) |
| React Native | Experimental — API may change between minors |

## Documentation

- **Online docs** — <https://byteforce-cn.github.io/workbook/>
- **Storybook examples** — <https://byteforce-cn.github.io/workbook/storybook/>
- **API Reference** — <https://byteforce-cn.github.io/workbook/api-reference/>
- **Local docs** — `docs-site/` (run `pnpm docs:dev`); schema reference in `docs-site/schema/schema-reference.md`
- **i18n & default text** — built-in UI copy falls back to Chinese (zh-CN); see `docs-site/guides/i18n.md`
- **Contributing** — see [CONTRIBUTING.md](./CONTRIBUTING.md)

## Contributing

We'd love your help — see [CONTRIBUTING.md](./CONTRIBUTING.md). All commits are
signed off under the [DCO](https://developercertificate.org/). Please follow our
[Code of Conduct](./CODE_OF_CONDUCT.md); security issues go through
[SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © ByteForce

---

中文说明见 [README.zh-CN.md](./README.zh-CN.md)。
