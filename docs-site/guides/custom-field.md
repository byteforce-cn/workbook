# Custom Field Development

Build your own field components that integrate with the workbook's data binding, validation, and dependency systems.

## Field Component Interface

```typescript
import type { FieldPluginProps } from "@byteforce/workbook";

interface FieldPluginProps {
  /** Current field value */
  value: unknown;
  /** Update the field value */
  onChange: (value: unknown) => void;
  /** Field definition from schema */
  field: FieldDefinition;
  /** Current data tree */
  data: WorkbookData;
  /** Validation errors for this field */
  errors: ValidationError[];
  /** Whether the field is disabled */
  disabled: boolean;
  /** Whether the field is visible */
  visible: boolean;
  /** Whether the field is required */
  required: boolean;
  /** Resolved options (for select-like fields) */
  options?: WorkbookOption[];
  /** Locale for i18n */
  locale: string;
}
```

## Example: Star Rating Field

```tsx
import type { FieldPluginComponent } from "@byteforce/workbook";

const StarRating: FieldPluginComponent = ({
  value,
  onChange,
  field,
  disabled,
  errors,
}) => {
  const stars = field.props?.maxStars ?? 5;
  const currentRating = (typeof value === "number" ? value : 0);

  return (
    <div className="star-rating-field">
      <label>{field.label}</label>
      <div className="stars" role="radiogroup" aria-label={field.label}>
        {Array.from({ length: stars }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            className={`star ${i < currentRating ? "active" : ""}`}
            onClick={() => onChange(i + 1)}
            aria-label={`${i + 1} star${i > 0 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      {errors.length > 0 && (
        <span className="error" role="alert">{errors[0].message}</span>
      )}
    </div>
  );
};
```

## Registering the Field

```ts
import { createPluginRegistry } from "@byteforce/workbook/react";

const registry = createPluginRegistry();
registry.registerField("stars", StarRating);
```

## Using in Schema

```json
{
  "name": "satisfaction",
  "type": "custom",
  "component": "stars",
  "label": "Satisfaction",
  "props": { "maxStars": 5 },
  "validations": [{ "type": "required", "message": "Please rate your satisfaction" }]
}
```

## Using in SimpleForm

```tsx
<SimpleForm
  fields={[
    {
      name: "satisfaction",
      type: "custom",
      label: "Satisfaction",
      component: StarRating,
    },
  ]}
/>
```

## Connecting to DocumentRenderer

Pass the registry to the main-entry `DocumentRenderer` — either via the `registry` prop (recommended), or via `PluginProvider` context:

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import { createPluginRegistry } from "@byteforce/workbook/react";

const registry = createPluginRegistry();
registry.registerField("stars", StarRating);

// Option A — registry prop (wins when both are present)
<DocumentRenderer workbook={myWorkbook} registry={registry} />;

// Option B — PluginProvider context (useful for subtree scoping)
import { PluginProvider } from "@byteforce/workbook/react";

<PluginProvider registry={registry}>
  <DocumentRenderer workbook={myWorkbook} />
</PluginProvider>;
```

> ⚠️ If a custom field still renders as the `未注册自定义字段：xxx` placeholder, the registry was **not** actually wired to the renderer — confirm you passed the `registry` prop or wrapped the renderer in the same `<PluginProvider>`, and that you re-built/re-linked the library (see [Local Development (advanced)](/installation#local-development-advanced)).

## Best Practices

1. **Always forward `value` and call `onChange`** — the field won't participate in data binding otherwise
2. **Respect `disabled`** — check the prop and disable interactions
3. **Render errors** — show validation errors for accessibility (use `role="alert"`)
4. **Use `field.props`** — pass configurable properties through the schema
5. **Add ARIA labels** — ensure keyboard and screen reader accessibility
