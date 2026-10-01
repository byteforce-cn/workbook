import { FieldLabel, type StandardFieldProps } from "./TextField";

export function TextareaField({
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
        <label className="bf-workbook-field">
          <FieldLabel label={label} required={required} />
          <textarea
            value={String(fieldApi.state.value ?? "")}
            disabled={disabled}
            onChange={(event) => {
              fieldApi.handleChange(event.target.value as never);
              onValueChange(event.target.value);
            }}
            onBlur={() => {
              fieldApi.handleBlur();
              onValueBlur();
            }}
          />
          {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
        </label>
      )}
    </form.Field>
  );
}
