# Theming

Customize the visual appearance of `@byteforce/workbook` components.

## Default Theme

The package ships with a default CSS theme:

```ts
import "@byteforce/workbook/styles.css";
```

This provides baseline styling for all form fields, layouts, page views, and sheet views.

## CSS Custom Properties

The default theme reads its colours, radii, sizes and shadows from `--bf-*` CSS
custom properties. Each declaration carries its default inline as a `var()`
fallback, so the theme renders identically when you override nothing — and it
takes only one inherited declaration to re-point a token:

```css
/* your application stylesheet */
:root {
  --bf-primary: #1d4ed8;
  --bf-field-border: #e4e7ec;
  --bf-field-radius: 12px;
  --bf-field-font-size: 14px;
}
```

Because tokens are inherited, they can be scoped instead of global: put them on
a wrapper class to re-skin a subtree, or on a single element to re-skin one
control.

```css
.checkout-review {
  --bf-primary: #0f766e;
  --bf-field-border: #d0d5dd;
}
```

Notes:

- Overrides win by inheritance, not by specificity or stylesheet order — you
  never need to override `.bf-workbook-*` selectors, deep selectors or
  `!important` to re-theme.
- Unknown or misspelled tokens are silently inert (standard CSS custom property
  behaviour); use the reference below as the source of truth.
- Tokens marked _reserved_ are part of the documented surface but are not yet
  consumed by the default theme: `--bf-success` / `--bf-warning` belong to
  schema-level styles (`styles.*`), and the sheet canvas palette
  (`--bf-sheet-header-bg`, `--bf-sheet-header-color`, `--bf-sheet-row-hover`) is
  still drawn from a fixed palette inside the canvas renderer.

### Token reference

#### Text and surfaces

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-text` | Primary text (inputs, controls, page body) | `#172033` |
| `--bf-heading` | Headings (`h2`/`h3` of the view and group cards) | `#111827` |
| `--bf-text-muted` | Secondary text (segmented controls) | `#475569` |
| `--bf-text-disabled` | Disabled text and muted icons | `#7c8798` |
| `--bf-placeholder` | Input placeholder text | `#a6b0c3` |
| `--bf-surface` | Raised neutral surface | `#ffffff` |
| `--bf-surface-subtle` | Subtle surface (repeat items) | `#fafbfd` |
| `--bf-surface-sunken` | Sunken surface (control wells) | `#f8fafc` |
| `--bf-border-subtle` | Hairline divider | `#e3e8f0` |
| `--bf-border-strong` | Strong border (dashed add/remove controls) | `#cbd5e1` |

#### Brand and status

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-primary` | Brand colour: focus, selection, primary button | `#2563eb` |
| `--bf-primary-hover` | Primary hover / active | `#1d4ed8` |
| `--bf-primary-fg` | Foreground on a primary surface | `#ffffff` |
| `--bf-primary-soft` | Soft primary fill | `#eff6ff` |
| `--bf-primary-border` | Soft primary border | `#bfdbfe` |
| `--bf-danger` | Destructive emphasis (required marker, error border) | `#dc2626` |
| `--bf-danger-soft-hover` | Destructive hover fill | `#fee2e2` |
| `--bf-error-color` | Error message text | `#b42318` |
| `--bf-error-bg` | Error/destructive surface | `#fff5f5` |
| `--bf-error-border` | Error/destructive border | `#fecaca` |
| `--bf-success` | _reserved_ — schema-level styles | `#22c55e` |
| `--bf-warning` | _reserved_ — schema-level styles | `#f59e0b` |

#### Fields

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-field-bg` | Input background | `#ffffff` |
| `--bf-field-border` | Input border | `#d7dee9` |
| `--bf-field-border-hover` | Input border on hover | `#94a3b8` |
| `--bf-field-border-focus` | Input border on focus | `#2563eb` |
| `--bf-field-disabled-bg` | Disabled input background | `#f4f6f9` |
| `--bf-field-radius` | Input corner radius | `6px` |
| `--bf-field-padding` | Input padding | `7px 11px` |
| `--bf-field-font-size` | Field/label font size | `13px` |
| `--bf-label-color` | Field label colour | `#334155` |
| `--bf-label-font-weight` | Field label weight | `600` |
| `--bf-control-height` | Desktop control height | `36px` |
| `--bf-control-height-tablet` | Tablet touch target | `40px` |
| `--bf-control-height-mobile` | Mobile touch target | `44px` |
| `--bf-focus-ring` | Focus ring (brand) | `rgba(37, 99, 235, 0.13)` |
| `--bf-focus-ring-danger` | Focus ring (error) | `rgba(220, 38, 38, 0.12)` |
| `--bf-select-arrow` | `<select>` chevron colour (CSS-drawn, no `data:` image) | `#64748b` |
| `--bf-select-arrow-hover` | `<select>` chevron colour on hover | `#2563eb` |

#### Groups, cards and buttons

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-group-bg` | Group card background | `#ffffff` |
| `--bf-group-border` | Group card border | `#dbe4f0` |
| `--bf-group-radius` | Group card radius | `10px` |
| `--bf-group-padding` | Group card padding | `18px 20px 20px` |
| `--bf-radius` | Control corner radius (buttons, tags) | `6px` |
| `--bf-radius-lg` | Large radius (control wells, sheet viewport) | `8px` |
| `--bf-button-bg` | Secondary button background | `#ffffff` |
| `--bf-button-border` | Secondary button border | `#d7dee9` |
| `--bf-button-color` | Secondary button text | `#344054` |
| `--bf-button-hover-bg` | Secondary button hover background | `#f5f8ff` |
| `--bf-button-hover-border` | Secondary button hover border | `#2563eb` |
| `--bf-button-hover-color` | Secondary button hover text | `#1d4ed8` |
| `--bf-button-disabled-bg` | Disabled button background | `#f4f6f9` |
| `--bf-button-disabled-border` | Disabled button border | `#e3e8f0` |
| `--bf-button-disabled-color` | Disabled button text | `#a6b0c3` |

#### Tabs and steps

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-tab-bg` | Tab background | `transparent` |
| `--bf-tab-color` | Inactive tab text | `#5b6472` |
| `--bf-tab-active-bg` | Active tab background | `transparent` |
| `--bf-tab-active-border` | Active tab underline | `#2563eb` |
| `--bf-tab-active-color` | Active tab text | `#2563eb` |

#### Tags, sheet and elevation

| Variable | Meaning | Default |
|----------|---------|---------|
| `--bf-tag-bg` | Tag pill background | `#eff6ff` |
| `--bf-tag-border` | Tag pill border | `#bfdbfe` |
| `--bf-tag-color` | Tag pill text | `#1d4ed8` |
| `--bf-tag-remove-bg` | Tag remove affordance background | `rgba(37, 99, 235, 0.14)` |
| `--bf-sheet-border` | Sheet viewport border | `#d7dee9` |
| `--bf-sheet-header-bg` | _reserved_ — sheet canvas palette | `#f3f4f6` |
| `--bf-sheet-header-color` | _reserved_ — sheet canvas palette | `#374151` |
| `--bf-sheet-row-hover` | _reserved_ — sheet canvas palette | `#f9fafb` |
| `--bf-shadow-card` | Group card shadow | `0 1px 2px rgba(16, 24, 40, 0.04)` |
| `--bf-shadow-control` | Segmented-control shadow | `0 1px 4px rgba(15, 23, 42, 0.12)` |
| `--bf-shadow-sheet` | Sheet viewport shadow | `0 4px 16px rgba(16, 24, 40, 0.05)` |
| `--bf-shadow-page` | Page preview shadow | `0 12px 32px rgba(15, 23, 42, 0.08)` |
| `--bf-shadow-primary` | Primary button shadow | `0 4px 12px rgba(37, 99, 235, 0.28)` |
| `--bf-sticky-actions-bg` | Mobile sticky action bar backdrop | `linear-gradient(to top, #eef3f8 70%, rgba(238, 243, 248, 0))` |

## Compact Theme

Re-point the sizing tokens for dense UIs (e.g. admin panels):

```css
.bf-compact {
  --bf-field-padding: 4px 8px;
  --bf-field-font-size: 13px;
  --bf-group-padding: 12px;
  --bf-field-radius: 4px;
  --bf-control-height: 32px;
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
