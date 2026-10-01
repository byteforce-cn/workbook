import { useEffect, useState } from "react";

import type { FieldApiLike } from "../types";
import { FieldLabel, type StandardFieldProps } from "./TextField";

interface ObjectFieldEditorProps extends Omit<StandardFieldProps, "form" | "fieldPath"> {
  fieldApi: FieldApiLike;
}

function ObjectFieldEditor({
  fieldApi,
  label,
  required,
  disabled,
  errors,
  onValueChange,
  onValueBlur,
}: ObjectFieldEditorProps) {
  const [draftValue, setDraftValue] = useState("{}");

  useEffect(() => {
    const safeValue =
      fieldApi.state.value != null && typeof fieldApi.state.value === "object" ? fieldApi.state.value : {};
    setDraftValue(JSON.stringify(safeValue, null, 2));
  }, [fieldApi.state.value]);

  return (
    <label className="bf-workbook-field">
      <FieldLabel label={label} required={required} />
      <textarea
        value={draftValue}
        disabled={disabled}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={() => {
          fieldApi.handleBlur();
          try {
            const nextValue = JSON.parse(draftValue) as Record<string, unknown>;
            fieldApi.handleChange(nextValue);
            onValueChange(nextValue);
          } catch {
            onValueChange(fieldApi.state.value ?? {});
          }
          onValueBlur();
        }}
      />
      {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
    </label>
  );
}

export function ObjectField({
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
        <ObjectFieldEditor
          fieldApi={fieldApi}
          label={label}
          required={required}
          disabled={disabled}
          errors={errors}
          onValueChange={onValueChange}
          onValueBlur={onValueBlur}
        />
      )}
    </form.Field>
  );
}
