import { FieldLabel, type StandardFieldProps } from "./TextField";

export function NumberField({
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
          <input
            type="number"
            value={typeof fieldApi.state.value === "number" ? fieldApi.state.value : Number(fieldApi.state.value ?? 0)}
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.target.value === "" ? undefined : Number(event.target.value);
              fieldApi.handleChange(nextValue as never);
              onValueChange(nextValue);
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
