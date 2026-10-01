import { resolveBuiltInText, WORKBOOK_I18N_KEYS } from "../../../core/i18n/i18n";
import { useWorkbookRuntime } from "../../../react/RuntimeProvider";
import type { WorkbookOption } from "../../../react/registry";
import { FieldLabel, type StandardFieldProps } from "./TextField";

export interface SelectFieldProps extends StandardFieldProps {
  options: WorkbookOption[];
  multiple?: boolean;
}

export function SelectField({
  form,
  fieldPath,
  label,
  disabled,
  required,
  errors,
  options,
  multiple,
  onValueChange,
  onValueBlur,
}: SelectFieldProps) {
  const { locale, fallbackLocale, i18n } = useWorkbookRuntime();
  return (
    <form.Field name={fieldPath as never}>
      {(fieldApi) => (
        <label className="bf-workbook-field">
          <FieldLabel label={label} required={required} />
          <select
            multiple={multiple}
            value={
              multiple
                ? Array.isArray(fieldApi.state.value)
                  ? fieldApi.state.value.map(String)
                  : []
                : String(fieldApi.state.value ?? "")
            }
            disabled={disabled}
            onChange={(event) => {
              const nextValue = multiple
                ? Array.from(event.target.selectedOptions).map((option) => option.value)
                : event.target.value;
              fieldApi.handleChange(nextValue as never);
              onValueChange(nextValue);
            }}
            onBlur={() => {
              fieldApi.handleBlur();
              onValueBlur();
            }}
          >
            {!multiple ? (
              <option value="">
                {resolveBuiltInText(WORKBOOK_I18N_KEYS.SELECT_PLACEHOLDER, locale, i18n, fallbackLocale, "请选择")}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
        </label>
      )}
    </form.Field>
  );
}
