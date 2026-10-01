# Form Renderer

The standalone `FormView` component renders a form view from a BF Workbook Schema form definition. It is self-contained — no `DocumentRenderer` wrapper needed.

## Import

```ts
import { WorkbookFormView } from "@byteforce/workbook";
```

## Props

```typescript
interface FormViewProps {
  /** A BF Workbook Schema form view definition */
  view: FormViewDefinition;
  /** Submit handler */
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}
```

## Basic Usage

```tsx
import { WorkbookFormView } from "@byteforce/workbook";

function MyForm() {
  return (
    <WorkbookFormView
      view={{
        type: "form",
        id: "my-form",
        fields: [
          { name: "name", type: "string", label: "Name", required: true },
          { name: "email", type: "string", label: "Email", format: "email" },
        ],
        layout: [
          { type: "field", name: "name" },
          { type: "field", name: "email" },
        ],
      }}
      onSubmit={(data) => console.log(data)}
    />
  );
}
```

## Read-only mode

Declare `readOnly: true` in the form view's `config` to render the whole form
read-only — designed for reviewing documents in an approval flow:

- Every field is disabled (stacked on top of field-level `disabled` / dependency conditions)
- Submit and reset buttons are not rendered
- Add/remove buttons of `repeat` layouts are disabled
- `onSubmit` / `handleReset` / `autoSave` are all intercepted — no writes are produced

```tsx
const formView = {
  type: "form",
  id: "change-form",
  label: "Change request (under review)",
  config: {
    readOnly: true, // one-switch read-only
    validateMode: "onBlur",
  },
  fields: [ /* ... */ ],
};
```

`FormRenderer` and the Quick API's `SimpleForm` also accept a `readOnly` prop
that is passed straight through to the form view:

```tsx
<FormRenderer fields={fields} data={data} readOnly />
<SimpleForm fields={fields} initialData={data} readOnly />
```

## Multi-column rows and field spans (`layoutField.span`)

`row` layouts consume `layoutField.span` to mix columns of different widths —
behavior is identical on web and React Native:

- Each `row` child defaults to `span: 1`; the row's column count = the sum of child spans.
- `[A(1), B(2)]` → a 3-column grid where A takes 1/3 and B takes 2/3; `[A(3)]` → full width. Great for `textarea` / child tables (`array`) / entity pickers.
- With all spans `1` (or omitted) rendering is identical to equal-width columns (backward compatible).
- Responsive: mobile stacks single-column (span ignored, fields become full rows); tablet caps at two columns (span clamped to 2); desktop renders declared spans.

```tsx
const formView = {
  type: "form",
  id: "change-form",
  fields: [
    { name: "title", type: "string", label: "Title" },
    { name: "description", type: "textarea", label: "Description" },
    { name: "assignees", type: "custom", label: "Assignees", component: "user-picker" },
  ],
  layout: [
    {
      type: "row",
      children: [
        { type: "field", name: "title" },
        { type: "field", name: "description", span: 2 },
      ],
    },
    {
      type: "row",
      children: [{ type: "field", name: "assignees", span: 3 }],
    },
  ],
};
```

## Context Requirements

`WorkbookFormView` must be wrapped in:
- `DataProvider` — provides the shared data tree
- `WorkbookRuntimeProvider` — provides the plugin registry and runtime config

If you're using `DocumentRenderer`, these are set up automatically.

For standalone usage, set up the context yourself:

```tsx
import { DataProvider } from "@byteforce/workbook/react";
import { WorkbookRuntimeProvider } from "@byteforce/workbook/react";
import { createPluginRegistry } from "@byteforce/workbook/react";

const registry = createPluginRegistry();

<DataProvider initialData={{}}>
  <WorkbookRuntimeProvider registry={registry}>
    <WorkbookFormView view={formView} />
  </WorkbookRuntimeProvider>
</DataProvider>
```

## Features

- **Field Types**: string, number, boolean, date, textarea, select, multiselect, array
- **Validation**: required, min/max, pattern, custom validators, async validation
- **Conditional Visibility**: fields show/hide based on data conditions
- **Dependency Resolution**: field state depends on other fields' values
- **Layout System**: rows, groups, tabs, steps, repeat layouts
- **Read-only Mode**: `config.readOnly` disables fields, hides action buttons and intercepts submits — for reviewing documents under approval
- **Hook System**: onMount, onChange, onSubmit, onValidate, onBeforeSave, onAfterSave
