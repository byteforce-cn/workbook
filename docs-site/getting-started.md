# Getting Started

Get your first form rendered in **5 minutes**.

## Installation

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

## Quick Start: SimpleForm

The fastest way to render a form — no schema knowledge needed:

```tsx
import { SimpleForm } from "@byteforce/workbook/quick";

function App() {
  return (
    <SimpleForm
      fields={[
        { name: "username", type: "text", label: "Username", required: true },
        { name: "email", type: "text", label: "Email", format: "email" },
        {
          name: "role",
          type: "select",
          label: "Role",
          options: [
            { value: "admin", label: "Administrator" },
            { value: "user", label: "User" },
          ],
        },
      ]}
      onSubmit={(data) => console.log("Submitted:", data)}
    />
  );
}
```

That's it! You get a fully interactive form with validation, data binding, and submission handling.

## Choosing Your API Level

`@byteforce/workbook` provides **three API tiers** — pick the one that matches your needs:

| Tier | API | Use When |
|------|-----|----------|
| **L1** | `SimpleForm` from `@byteforce/workbook/quick` | You need a form quickly with minimal configuration |
| **L2** | `DocumentRenderer` from `@byteforce/workbook` | You have a full BF Schema v4.1.1 workbook definition |
| **L3** | `FormRenderer` / `PageRenderer` / `SheetRenderer` + core primitives | You need full control over rendering, data, and plugins |

## Next Steps

- **[Installation](/installation)** — Detailed setup and compatibility
- **[Quick Start API](/api/quick-start)** — Full SimpleForm API reference
- **[Document Renderer](/api/document-renderer)** — Schema-driven rendering
- **[Plugin System](/api/plugin-system)** — Extend with custom fields and logic
- **[Guides](/guides/custom-field)** — Build custom fields, validations, and more
