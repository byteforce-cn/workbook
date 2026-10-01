import { useEffect, useState } from "react";

import type { FieldDefinition } from "../../../core/types";
import type { FieldApiLike } from "../types";
import { TagSelectorField } from "./TagSelectorField";
import { FieldLabel, type StandardFieldProps } from "./TextField";

interface ArrayFieldEditorProps extends Omit<StandardFieldProps, "form" | "fieldPath"> {
  fieldApi: FieldApiLike;
}

function ArrayFieldEditor({
  fieldApi,
  label,
  required,
  disabled,
  errors,
  onValueChange,
  onValueBlur,
}: ArrayFieldEditorProps) {
  const [draftValue, setDraftValue] = useState("[]");

  useEffect(() => {
    setDraftValue(JSON.stringify(Array.isArray(fieldApi.state.value) ? fieldApi.state.value : [], null, 2));
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
            const nextValue = JSON.parse(draftValue) as unknown[];
            fieldApi.handleChange(nextValue);
            onValueChange(nextValue);
          } catch {
            onValueChange(fieldApi.state.value ?? []);
          }
          onValueBlur();
        }}
      />
      {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
    </label>
  );
}

function isTagSelectorField(field: FieldDefinition | undefined) {
  const props = field?.props;
  if (props == null || typeof props !== "object") {
    return false;
  }

  const widget = (props as Record<string, unknown>).widget ?? (props as Record<string, unknown>).variant;
  return widget === "tags" || widget === "tag-selector";
}

export interface ArrayFieldProps extends StandardFieldProps {
  field?: FieldDefinition;
}

export function ArrayField({
  form,
  field,
  fieldPath,
  label,
  disabled,
  required,
  errors,
  onValueChange,
  onValueBlur,
}: ArrayFieldProps) {
  if (isTagSelectorField(field) && field != null) {
    return (
      <TagSelectorField
        form={form}
        field={field}
        fieldPath={fieldPath}
        label={label}
        disabled={disabled}
        required={required}
        errors={errors}
        onValueChange={onValueChange}
        onValueBlur={onValueBlur}
      />
    );
  }

  return (
    <form.Field name={fieldPath as never}>
      {(fieldApi) => (
        <ArrayFieldEditor
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
