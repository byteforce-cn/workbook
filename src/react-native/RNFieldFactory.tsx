/**
 * RN 字段工厂：字段定义 → RN 控件分发。
 * 与 Web FieldFactory 共用同一运行时逻辑：
 * - resolveFieldState（依赖联动：disableWhen / hiddenWhen / defaultValue / options）
 * - fetchOptions（static / url / graphql / custom + dependsOn 重载 + 搜索防抖 + 缓存）
 * - evaluateBooleanLike（字段级 visible）
 * - 校验与只读态由 RNFormView 统一驱动。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateBooleanLike } from "../core/condition/evaluate";
import { getValueAtPath, materializePath } from "../core/data/pathUtils";
import { resolveFieldState } from "../core/dependency/engine";
import { resolveI18nText } from "../core/i18n/i18n";
import { fetchOptions } from "../core/options/fetchOptions";
import type { FieldDefinition, OptionSourceDefinition, WorkbookData, WorkbookRowContext } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { WorkbookOption } from "../react/registry";
import {
  RNArrayField,
  RNBooleanField,
  RNCustomField,
  RNDateField,
  RNNumberField,
  RNObjectField,
  RNSelectField,
  RNStringField,
  RNTextareaField,
} from "./fields";
import type { RNStandardFieldProps } from "./types";

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

export interface RNFieldFactoryProps {
  field: FieldDefinition;
  fieldErrors: Record<string, string[]>;
  rowContext?: WorkbookRowContext;
  /** Form-level read-only flag (config.readOnly); forces every field disabled */
  readOnly?: boolean;
  onFieldChange(field: FieldDefinition, fieldPath: string, nextValue: unknown, rowContext?: WorkbookRowContext): void;
  onFieldBlur(field: FieldDefinition, fieldPath: string, rowContext?: WorkbookRowContext): void;
}

export function RNFieldFactory({
  field,
  fieldErrors,
  rowContext,
  readOnly,
  onFieldChange,
  onFieldBlur,
}: RNFieldFactoryProps) {
  const { data } = useWorkbookData();
  const { registry, locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const [options, setOptions] = useState<WorkbookOption[]>([]);
  const optionLifecycleRef = useRef<{
    source?: OptionSourceDefinition;
    initialReloadKey?: string;
    skippedInitialFetch: boolean;
  }>({ skippedInitialFetch: false });

  const fieldPath = resolveFieldPath(field, rowContext);

  // 依赖防抖（schema: dependency.debounce）——与 Web 渲染器行为一致
  const depDebounceMs = useMemo(() => {
    const deps = field.dependencies ?? [];
    if (deps.length === 0) return 0;
    return Math.max(0, ...deps.map((dependency) => (dependency as { debounce?: number }).debounce ?? 0));
  }, [field.dependencies]);

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
  const disabled = runtimeState.disabled || readOnly === true;
  const required = (field.validations ?? []).some((validation) => validation.type === "required");
  const placeholder =
    field.props != null && typeof field.props === "object"
      ? (field.props as Record<string, unknown>).placeholder
      : undefined;

  const commonProps: RNStandardFieldProps = {
    fieldPath,
    label,
    value: fieldValue,
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
      return <RNStringField {...commonProps} placeholder={typeof placeholder === "string" ? placeholder : undefined} />;
    case "number":
      return <RNNumberField {...commonProps} />;
    case "boolean":
      return <RNBooleanField {...commonProps} />;
    case "date":
      return <RNDateField {...commonProps} />;
    case "textarea":
      return <RNTextareaField {...commonProps} />;
    case "select":
      return <RNSelectField {...commonProps} options={options} />;
    case "multiselect":
      return <RNSelectField {...commonProps} multiple options={options} />;
    case "array":
      return <RNArrayField {...commonProps} />;
    case "object":
      return <RNObjectField {...commonProps} />;
    case "custom":
      return (
        <RNCustomField
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
