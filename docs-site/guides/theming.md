# Theming

Customize the visual appearance of `@byteforce/workbook` components.

## Default Theme

The package ships with a default CSS theme:

```ts
import "@byteforce/workbook/styles.css";
```

This provides baseline styling for all form fields, layouts, page views, and sheet views.

## CSS Custom Properties

Override theme variables to customize colors, spacing, and typography:

```css
:root {
  /* Colors */
  --bf-primary: #3b82f6;
  --bf-primary-hover: #2563eb;
  --bf-danger: #ef4444;
  --bf-success: #22c55e;
  --bf-warning: #f59e0b;

  /* Form */
  --bf-field-bg: #ffffff;
  --bf-field-border: #d1d5db;
  --bf-field-border-focus: #3b82f6;
  --bf-field-radius: 0.375rem;
  --bf-field-padding: 0.5rem 0.75rem;
  --bf-field-font-size: 0.875rem;
  --bf-label-color: #374151;
  --bf-label-font-weight: 500;

  /* Layout */
  --bf-group-bg: #f9fafb;
  --bf-group-border: #e5e7eb;
  --bf-group-radius: 0.5rem;
  --bf-group-padding: 1rem;

  /* Tabs */
  --bf-tab-bg: transparent;
  --bf-tab-active-bg: #ffffff;
  --bf-tab-active-border: #3b82f6;
  --bf-tab-color: #6b7280;
  --bf-tab-active-color: #111827;

  /* Sheet */
  --bf-sheet-header-bg: #f3f4f6;
  --bf-sheet-header-color: #374151;
  --bf-sheet-border: #e5e7eb;
  --bf-sheet-row-hover: #f9fafb;

  /* Error */
  --bf-error-color: #ef4444;
  --bf-error-bg: #fef2f2;
  --bf-error-border: #fecaca;
}
```

## Compact Theme

For dense UIs (e.g., admin panels):

```css
:root.bf-compact {
  --bf-field-padding: 0.25rem 0.5rem;
  --bf-field-font-size: 0.8125rem;
  --bf-group-padding: 0.75rem;
  --bf-field-radius: 0.25rem;
}
```

Enable via `className`:

```tsx
<div className="bf-compact">
  <SimpleForm fields={fields} />
</div>
```

## Schema-Level Styling

For page and sheet views, styles can be defined in the schema:

```json
{
  "styles": {
    "paragraphStyles": {
      "heading1": {
        "fontSize": 24,
        "fontWeight": "bold",
        "color": "#111827",
        "lineHeight": 1.4
      },
      "body": {
        "fontSize": 12,
        "color": "#374151",
        "lineHeight": 1.6
      }
    },
    "tableStyles": {
      "default": {
        "borderColor": "#d1d5db",
        "borderWidth": 1,
        "headerBg": "#f3f4f6"
      }
    },
    "cellStyles": {
      "highlight": {
        "bgColor": "#fef3c7",
        "fontWeight": "bold"
      }
    }
  }
}
```

## Conditional Styling

Apply styles based on data conditions:

```json
{
  "conditionalStyles": [
    {
      "condition": { "type": "gt", "field": "amount", "value": 1000 },
      "style": "highlight"
    }
  ]
}
```

```ts
import { applyConditionalStyle } from "@byteforce/workbook";

const resolvedStyle = applyConditionalStyle(
  baseStyle,
  conditionalStyles,
  data
);
```

## Custom Field Styling

Your custom field components can use CSS modules or any styling approach:

```tsx
// my-field.module.css
import styles from "./my-field.module.css";

const MyField: FieldPluginComponent = ({ value, onChange, field }) => (
  <div className={styles.container}>
    <label className={styles.label}>{field.label}</label>
    <input
      className={styles.input}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
```
