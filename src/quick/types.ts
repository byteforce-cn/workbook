/**
 * Simplified field types for the Quick Start API.
 * These are intentionally simpler than the full BF Workbook Schema field definitions.
 */

export interface SimpleOption {
  value: string;
  label: string;
}

export type SimpleFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "textarea"
  | "select"
  | "multiselect"
  | "email"
  | "password"
  | "custom";

export interface SimpleValidationDef {
  type: string;
  message: string;
  params?: unknown;
}

export interface SimpleFieldDef {
  /** Field name (used as the data key) */
  name: string;
  /** Field type */
  type: SimpleFieldType;
  /** Display label */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select/multiselect fields */
  options?: SimpleOption[];
  /** Format hint (e.g., "email", "url") */
  format?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is visible */
  visible?: boolean;
  /** Custom validations */
  validations?: SimpleValidationDef[];
  /** Custom component name (for type="custom") */
  component?: string;
}

/** Layout direction for auto-layout */
export type SimpleFormLayout = "vertical" | "horizontal" | "grid";

export interface SimpleFormProps {
  /** Field definitions */
  fields: SimpleFieldDef[];
  /** Auto-layout direction (default: "vertical") */
  layout?: SimpleFormLayout;
  /** Initial form data */
  initialData?: Record<string, unknown>;
  /** Read-only mode: all fields disabled and submit/reset actions hidden (审核中只读) */
  readOnly?: boolean;
  /** Called on form submit with current data */
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Called whenever data changes */
  onChange?: (data: Record<string, unknown>) => void;
  /** Locale for i18n (default: "zh-CN") */
  locale?: string;
  /** Additional CSS class */
  className?: string;
}
