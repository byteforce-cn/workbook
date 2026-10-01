# Quick Start API

The `@byteforce/workbook/quick` entry point provides the fastest way to render forms without any schema knowledge.

## `<SimpleForm>`

Render a fully interactive form with just a field definition array.

### Import

```ts
import { SimpleForm } from "@byteforce/workbook/quick";
```

### Props

```typescript
interface SimpleFormProps {
  /** Array of field definitions */
  fields: SimpleFieldDef[];
  /** Auto-layout direction (default: "vertical") */
  layout?: "vertical" | "horizontal" | "grid";
  /** Initial form data */
  initialData?: Record<string, unknown>;
  /** Submit handler */
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Change handler (called on every data change) */
  onChange?: (data: Record<string, unknown>) => void;
  /** Locale for i18n (default: "zh-CN") */
  locale?: string;
  /** CSS class name */
  className?: string;
}
```

### SimpleFieldDef

```typescript
type SimpleFieldType =
  | "text" | "number" | "boolean" | "date"
  | "textarea" | "select" | "multiselect"
  | "email" | "password" | "custom";

interface SimpleFieldDef {
  name: string;           // Data key
  type: SimpleFieldType;  // Field type
  label?: string;         // Display label
  required?: boolean;     // Required validation
  defaultValue?: unknown; // Default value
  placeholder?: string;   // Placeholder text
  options?: SimpleOption[]; // For select/multiselect
  format?: string;        // Format hint (e.g., "email")
  disabled?: boolean;     // Disabled state
  visible?: boolean;      // Visibility
  validations?: SimpleValidationDef[]; // Custom validations
  component?: ComponentType<FieldPluginProps>; // Custom component
}

interface SimpleOption {
  value: string;
  label: string;
}
```

### Examples

**Basic form with validation:**

```tsx
<SimpleForm
  fields={[
    { name: "name", type: "text", label: "Name", required: true },
    { name: "email", type: "email", label: "Email", required: true },
    { name: "bio", type: "textarea", label: "Bio" },
  ]}
  onSubmit={(data) => api.createUser(data)}
/>
```

**Select with options:**

```tsx
<SimpleForm
  fields={[
    {
      name: "department",
      type: "select",
      label: "Department",
      options: [
        { value: "eng", label: "Engineering" },
        { value: "design", label: "Design" },
        { value: "product", label: "Product" },
      ],
    },
  ]}
/>
```

**Grid layout:**

```tsx
<SimpleForm
  layout="grid"
  fields={[
    { name: "firstName", type: "text", label: "First Name" },
    { name: "lastName", type: "text", label: "Last Name" },
    { name: "email", type: "email", label: "Email" },
  ]}
/>
```

### How It Works

`SimpleForm` internally translates your simplified field definitions into a full BF Workbook Schema v4.1.1 definition, then delegates to `DocumentRenderer`. This means you get all the power of the full schema engine — data binding, conditional visibility, dependency resolution, and validation — without writing any schema JSON.
