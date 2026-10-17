import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateBooleanLike } from "../../core/condition/evaluate";
import { getValueAtPath, materializePath } from "../../core/data/pathUtils";
import { resolveFieldState } from "../../core/dependency/engine";
import { resolveBuiltInText, resolveI18nText, WORKBOOK_I18N_KEYS } from "../../core/i18n/i18n";
import { fetchOptions } from "../../core/options/fetchOptions";
import type { FieldDefinition, OptionSourceDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import type { WorkbookOption } from "../../react/registry";
import { ArrayField } from "./fields/ArrayField";
import { BooleanField } from "./fields/BooleanField";
import { CustomField } from "./fields/CustomField";
import { DateField } from "./fields/DateField";
import { NumberField } from "./fields/NumberField";
import { ObjectField } from "./fields/ObjectField";
import { ReadOnlyField } from "./fields/ReadOnlyField";
import { SelectField } from "./fields/SelectField";
import { TextareaField } from "./fields/TextareaField";
import { TextField } from "./fields/TextField";
import type { FormApiLike } from "./types";

function resolveFieldPath(field: FieldDefinition, rowContext?: WorkbookRowContext): string {
  const rawPath = field.bind?.path ?? field.name;
  if (rowContext == null && rawPath.includes("*")) {
    return field.name;
  }
  return rawPath.includes("*") ? materializePath(rawPath, rowContext) : rawPath;
}

type DynamicOptionSource = Exclude<OptionSourceDefinition, unknown[]> & {
  type: "url" | "graphql" | "custom";
  dependsOn?: string[];
  fetchOnMount?: boolean;
  searchDebounce?: number;
};

function isDynamicOptionSource(source: OptionSourceDefinition | undefined): source is DynamicOptionSource {
  return (
    !Array.isArray(source) &&
    source != null &&
    typeof source === "object" &&
    typeof (source as { type?: unknown }).type === "string"
  );
}

function createOptionReloadKey(
  source: OptionSourceDefinition | undefined,
  data: WorkbookData,
  rowContext?: WorkbookRowContext,
): string {
  if (!isDynamicOptionSource(source) || source.dependsOn == null || source.dependsOn.length === 0) {
    return JSON.stringify(data);
  }

  return JSON.stringify(
    Object.fromEntries(source.dependsOn.map((path) => [path, getValueAtPath(data, path, rowContext)])),
  );
}

export interface FieldFactoryProps {
  form: FormApiLike;
  field: FieldDefinition;
  fieldErrors: Record<string, string[]>;
  rowContext?: WorkbookRowContext;
  /** Form-level read-only flag (config.readOnly); forces every field disabled */
  readOnly?: boolean;
  /**
   * How form-level read-only renders fields (config.readOnlyDisplay):
   * `disabled` (default) keeps the controls but disables them, `text` renders
   * label + value only.
   */
  readOnlyDisplay?: "disabled" | "text";
  onFieldChange(field: FieldDefinition, fieldPath: string, nextValue: unknown, rowContext?: WorkbookRowContext): void;
  onFieldBlur(field: FieldDefinition, fieldPath: string, rowContext?: WorkbookRowContext): void;
}

export function FieldFactory({
  form,
  field,
  fieldErrors,
  rowContext,
  readOnly,
  readOnlyDisplay,
  onFieldChange,
  onFieldBlur,
}: FieldFactoryProps) {
  const { data } = useWorkbookData();
  const { registry, locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchOptions>>>([]);
  const optionLifecycleRef = useRef<{
    source?: OptionSourceDefinition;
    initialReloadKey?: string;
    skippedInitialFetch: boolean;
  }>({ skippedInitialFetch: false });

  const fieldPath = resolveFieldPath(field, rowContext);

  // Compute max debounce from dependencies (schema: dependency.debounce)
  const depDebounceMs = useMemo(() => {
    const deps = field.dependencies ?? [];
    if (deps.length === 0) return 0;
    return Math.max(0, ...deps.map((d) => (d as { debounce?: number }).debounce ?? 0));
  }, [field.dependencies]);

  // Debounced data snapshot for dependency resolution only — field values still use raw data
  const [debouncedDepData, setDebouncedDepData] = useState(data);
  useEffect(() => {
    if (depDebounceMs <= 0) {
      setDebouncedDepData(data);
      return;
    }
    const timerId = globalThis.setTimeout(() => setDebouncedDepData(data), depDebounceMs);
    return () => globalThis.clearTimeout(timerId);
  }, [data, depDebounceMs]);

  const runtimeState = useMemo(
    () => resolveFieldState(field, debouncedDepData, registry, rowContext),
    [debouncedDepData, field, registry, rowContext],
  );
  const optionReloadKey = createOptionReloadKey(runtimeState.options, data, rowContext);

  useEffect(() => {
    const source = runtimeState.options;
    if (source == null) {
      setOptions([]);
      return;
    }

    const lifecycle = optionLifecycleRef.current;
    if (lifecycle.source !== source) {
      lifecycle.source = source;
      lifecycle.initialReloadKey = optionReloadKey;
      lifecycle.skippedInitialFetch = false;
    }

    if (
      isDynamicOptionSource(source) &&
      source.fetchOnMount === false &&
      !lifecycle.skippedInitialFetch &&
      optionReloadKey === lifecycle.initialReloadKey
    ) {
      lifecycle.skippedInitialFetch = true;
      setOptions([]);
      return;
    }

    const abortController = new AbortController();
    const fetchDelay = isDynamicOptionSource(source) ? (source.searchDebounce ?? 0) : 0;
    const timerId = globalThis.setTimeout(() => {
      void fetchOptions(source, data, registry, rowContext, abortController.signal)
        .then((nextOptions) => {
          if (!abortController.signal.aborted) {
            setOptions(nextOptions);
          }
        })
        .catch(() => {
          if (!abortController.signal.aborted) {
            setOptions([]);
          }
        });
    }, fetchDelay);

    return () => {
      globalThis.clearTimeout(timerId);
      abortController.abort();
    };
  }, [data, optionReloadKey, registry, rowContext, runtimeState.options]);

  const visible = runtimeState.visible && evaluateBooleanLike(field.visible, data, registry, true, rowContext);
  if (!visible) {
    return null;
  }

  const fieldValue = getValueAtPath(data, fieldPath, rowContext);
  const label = resolveI18nText(field.label ?? field.name, locale, i18n, fallbackLocale) ?? field.name;
  const errors = fieldErrors[fieldPath] ?? [];
  // readOnly 表单级只读：与字段级 disabled（含依赖条件）叠加，任一为真即禁用
  const disabled = runtimeState.disabled || readOnly === true;
  // 必填标记：字段 validations（含依赖 required 效果）任一 required 即渲染星号
  const required = runtimeState.required || runtimeState.validations.some((v) => v.type === "required");

  // 只读文本模式（config.readOnlyDisplay === "text"）：不渲染输入控件，只呈现标签 + 值
  if (readOnly === true && readOnlyDisplay === "text") {
    // 静态 options 直接来自字段定义，动态 options 来自上面的 optionSource 拉取
    const displayOptions: WorkbookOption[] =
      options.length > 0 ? options : Array.isArray(field.options) ? field.options : [];

    return (
      <ReadOnlyField
        field={field}
        label={label}
        required={required}
        value={fieldValue}
        options={displayOptions}
        emptyText={resolveBuiltInText(WORKBOOK_I18N_KEYS.READONLY_EMPTY, locale, i18n, fallbackLocale, "—")}
        trueText={resolveBuiltInText(WORKBOOK_I18N_KEYS.BOOLEAN_TRUE, locale, i18n, fallbackLocale, "是")}
        falseText={resolveBuiltInText(WORKBOOK_I18N_KEYS.BOOLEAN_FALSE, locale, i18n, fallbackLocale, "否")}
      />
    );
  }
  const commonProps = {
    form,
    fieldPath,
    label,
    disabled,
    required,
    errors,
    onValueChange(nextValue: unknown) {
      onFieldChange(field, fieldPath, nextValue, rowContext);
    },
    onValueBlur() {
      onFieldBlur(field, fieldPath, rowContext);
    },
  };

  switch (field.type) {
    case "string":
      return <TextField {...commonProps} />;
    case "number":
      return <NumberField {...commonProps} />;
    case "boolean":
      return <BooleanField {...commonProps} />;
    case "date":
      return <DateField {...commonProps} />;
    case "textarea":
      return <TextareaField {...commonProps} />;
    case "select":
      return <SelectField {...commonProps} options={options} />;
    case "multiselect":
      return <SelectField {...commonProps} multiple options={options} />;
    case "array":
      return <ArrayField {...commonProps} field={field} />;
    case "object":
      return <ObjectField {...commonProps} />;
    case "custom":
      return (
        <CustomField
          componentName={field.component ?? ""}
          field={field}
          fieldPath={fieldPath}
          value={fieldValue}
          errors={errors}
          disabled={disabled}
          rowContext={rowContext}
          onChange={(nextValue) => onFieldChange(field, fieldPath, nextValue, rowContext)}
          onBlur={() => onFieldBlur(field, fieldPath, rowContext)}
        />
      );
    default:
      return null;
  }
}
