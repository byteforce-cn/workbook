/**
 * Read-only **text** presentation for form fields (config.readOnlyDisplay: "text").
 *
 * Renders label + value — no `input` / `select` / `textarea` — so an approval or
 * archive view reads as a document instead of a wall of greyed-out controls.
 * `config.readOnlyDisplay: "disabled"` keeps the 1.0.0 behaviour (disabled
 * inputs) and stays the default.
 */

import type { FieldDefinition } from "../../../core/types";
import type { WorkbookOption } from "../../../react/registry";
import { FieldLabel } from "./TextField";

export interface ReadOnlyFieldTexts {
  /** Shown when the value is empty (`—` by default, i18n key `workbook.readonly.empty`). */
  emptyText: string;
  /** Boolean true rendering (`是` by default, i18n key `workbook.boolean.true`). */
  trueText: string;
  /** Boolean false rendering (`否` by default, i18n key `workbook.boolean.false`). */
  falseText: string;
}

export interface ReadOnlyFieldValue {
  text: string;
  empty: boolean;
}

/**
 * Format a value for read-only text display.
 *
 * - empty string / null / undefined / empty array → the empty placeholder
 * - boolean → the configured true/false text
 * - array → its items joined with `, ` (each mapped through the options below)
 * - value matching an option → that option's label (so a stored `"a1"` shows as
 *   the text the user picked, not the raw key)
 * - anything else → `String(value)`, nested objects as compact JSON
 */
export function formatReadOnlyValue(
  value: unknown,
  texts: ReadOnlyFieldTexts,
  options: WorkbookOption[] = [],
): ReadOnlyFieldValue {
  if (value == null || value === "") {
    return { text: texts.emptyText, empty: true };
  }

  if (typeof value === "boolean") {
    return { text: value ? texts.trueText : texts.falseText, empty: false };
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry) => formatReadOnlyValue(entry, { ...texts, emptyText: "" }, options))
      .filter((entry) => !entry.empty && entry.text !== "")
      .map((entry) => entry.text);

    return items.length === 0 ? { text: texts.emptyText, empty: true } : { text: items.join(", "), empty: false };
  }

  const optionLabel = options.find((option) => String(option.value) === String(value))?.label;
  if (optionLabel != null) {
    return { text: optionLabel, empty: false };
  }

  if (typeof value === "object") {
    return { text: JSON.stringify(value), empty: false };
  }

  return { text: String(value), empty: false };
}

export interface ReadOnlyFieldProps extends ReadOnlyFieldTexts {
  field: FieldDefinition;
  label: string;
  required?: boolean;
  value: unknown;
  options?: WorkbookOption[];
}

export function ReadOnlyField({
  field,
  label,
  required,
  value,
  options = [],
  emptyText,
  trueText,
  falseText,
}: ReadOnlyFieldProps) {
  const formatted = formatReadOnlyValue(value, { emptyText, trueText, falseText }, options);
  const valueClassName = formatted.empty
    ? "bf-workbook-field-value bf-workbook-field-value--empty"
    : "bf-workbook-field-value";

  return (
    <div className="bf-workbook-field bf-workbook-field--readonly" data-field-name={field.name}>
      <FieldLabel label={label} required={required} />
      <span className={valueClassName}>{formatted.text}</span>
    </div>
  );
}
