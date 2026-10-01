import { useId, useMemo, useState } from "react";
import { resolveBuiltInText, WORKBOOK_I18N_KEYS } from "../../../core/i18n/i18n";
import type { FieldDefinition } from "../../../core/types";
import { useWorkbookRuntime } from "../../../react/RuntimeProvider";
import type { FieldApiLike } from "../types";
import { FieldLabel, type StandardFieldProps } from "./TextField";

interface TagSelectorFieldEditorProps extends Omit<StandardFieldProps, "form" | "fieldPath"> {
  field: FieldDefinition;
  fieldApi: FieldApiLike;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function readFieldProps(field: FieldDefinition): Record<string, unknown> {
  return field.props != null && typeof field.props === "object" ? (field.props as Record<string, unknown>) : {};
}

function readSuggestions(field: FieldDefinition): string[] {
  const suggestions = readFieldProps(field).suggestions;
  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .filter((suggestion): suggestion is string => typeof suggestion === "string" && suggestion.trim() !== "")
    .map((suggestion) => suggestion.trim());
}

function parseCandidateTags(value: string): string[] {
  return value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeTags(currentTags: string[], candidateTags: string[]) {
  const seen = new Set(currentTags);
  return [
    ...currentTags,
    ...candidateTags.filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    }),
  ];
}

function TagSelectorFieldEditor({
  field,
  fieldApi,
  label,
  required,
  disabled,
  errors,
  onValueChange,
  onValueBlur,
}: TagSelectorFieldEditorProps) {
  const [draftValue, setDraftValue] = useState("");
  const datalistId = useId();
  const tags = readStringArray(fieldApi.state.value);
  const suggestions = useMemo(() => readSuggestions(field), [field]);
  const { locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const addLabel = resolveBuiltInText(WORKBOOK_I18N_KEYS.REPEAT_ADD, locale, i18n, fallbackLocale, "添加");

  function commitTags() {
    const candidateTags = parseCandidateTags(draftValue);
    if (candidateTags.length === 0) {
      return;
    }

    const nextTags = mergeTags(tags, candidateTags);
    fieldApi.handleChange(nextTags as never);
    onValueChange(nextTags);
    setDraftValue("");
  }

  function removeTag(tag: string) {
    const nextTags = tags.filter((candidate) => candidate !== tag);
    fieldApi.handleChange(nextTags as never);
    onValueChange(nextTags);
  }

  return (
    <label className="bf-workbook-field bf-workbook-tag-selector">
      <FieldLabel label={label} required={required} />
      <div className="bf-workbook-tag-selector__control">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="bf-workbook-tag-selector__tag"
            disabled={disabled}
            aria-label={`移除标签 ${tag}`}
            onClick={() => removeTag(tag)}
          >
            <span>{tag}</span>
            <span aria-hidden="true">x</span>
          </button>
        ))}
        <input
          aria-label={`新增${label}`}
          list={suggestions.length > 0 ? datalistId : undefined}
          value={draftValue}
          disabled={disabled}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitTags();
            }
          }}
          onBlur={() => {
            fieldApi.handleBlur();
            onValueBlur();
          }}
        />
        {suggestions.length > 0 ? (
          <datalist id={datalistId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
        <button
          type="button"
          disabled={disabled || draftValue.trim() === ""}
          aria-label={`${addLabel}${label}`}
          onClick={commitTags}
        >
          {addLabel}
        </button>
      </div>
      {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
    </label>
  );
}

export interface TagSelectorFieldProps extends StandardFieldProps {
  field: FieldDefinition;
}

export function TagSelectorField({
  form,
  field,
  fieldPath,
  label,
  disabled,
  required,
  errors,
  onValueChange,
  onValueBlur,
}: TagSelectorFieldProps) {
  return (
    <form.Field name={fieldPath as never}>
      {(fieldApi) => (
        <TagSelectorFieldEditor
          field={field}
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
