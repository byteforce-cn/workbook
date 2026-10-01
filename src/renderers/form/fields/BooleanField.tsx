import { FieldLabel, type StandardFieldProps } from "./TextField";

export function BooleanField({
  form,
  fieldPath,
  label,
  disabled,
  required,
  errors,
  onValueChange,
  onValueBlur,
}: StandardFieldProps) {
  return (
    <form.Field name={fieldPath as never}>
      {(fieldApi) => (
        <label className="bf-workbook-field bf-workbook-field-inline">
          <input
            type="checkbox"
            checked={Boolean(fieldApi.state.value)}
            disabled={disabled}
            onChange={(event) => {
              fieldApi.handleChange(event.target.checked as never);
              onValueChange(event.target.checked);
            }}
            onBlur={() => {
              fieldApi.handleBlur();
              onValueBlur();
            }}
          />
          <FieldLabel label={label} required={required} />
          {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
        </label>
      )}
    </form.Field>
  );
}
