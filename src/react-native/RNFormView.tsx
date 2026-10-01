/**
 * RN 表单视图：Workbook form 视图的 React Native 渲染入口。
 * 与 Web FormView 保持同一行为语义：
 * - 默认值播种（resolveFieldState.defaultValue / field.defaultValue）
 * - 校验时机 validateMode（onChange / onBlur）
 * - 提交前全量校验 + onValidate Hook 调度
 * - config.readOnly 整表单只读（禁用字段 + 隐藏提交/重置 + 拦截提交/自动保存）
 * - autoSave 防抖（globalThis.setTimeout，RN 无 window）
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { getValueAtPath } from "../core/data/pathUtils";
import { resolveFieldState } from "../core/dependency/engine";
import { resolveBuiltInText, resolveI18nText, WORKBOOK_I18N_KEYS } from "../core/i18n/i18n";
import type { FieldDefinition, FormViewDefinition, WorkbookData, WorkbookRowContext } from "../core/types";
import { runValidations } from "../core/validation/validator";
import { useWorkbookData } from "../react/DataProvider";
import { runWorkbookHooks } from "../react/hooks/useWorkbookHooks";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import { RNLayoutRenderer } from "./RNLayoutRenderer";
import { rnStyles } from "./styles";

function resolveFieldPath(field: FieldDefinition, rowContext?: WorkbookRowContext): string {
  const rawPath = field.bind?.path ?? field.name;
  if (rowContext == null && rawPath.includes("*")) {
    return field.name;
  }
  return rawPath.includes("*") ? rawPath.replaceAll("*", String(rowContext?.index ?? 0)) : rawPath;
}

function buildFieldInstances(
  fields: FieldDefinition[],
  data: WorkbookData,
): Array<{ field: FieldDefinition; rowContext?: WorkbookRowContext }> {
  return fields.flatMap((field) => {
    const rawPath = field.bind?.path ?? field.name;
    if (!rawPath.includes("*")) {
      return [{ field }];
    }

    const arrayPath = rawPath.slice(0, rawPath.indexOf("[*]"));
    const source = getValueAtPath(data, arrayPath);
    if (!Array.isArray(source)) {
      return [];
    }

    return source.map((item, index) => ({ field, rowContext: { index, path: arrayPath, item } }));
  });
}

export interface RNFormViewProps {
  view: FormViewDefinition;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}

export function RNFormView({ view, onSubmit }: RNFormViewProps) {
  const { data, replaceData, setValue } = useWorkbookData();
  const { registry, locale, fallbackLocale, i18n, hooks } = useWorkbookRuntime();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const initialSnapshotRef = useRef(data);
  // 审核中只读：config.readOnly === true 时整表单只读（字段禁用 + 隐藏提交/重置 + 拦截提交/autoSave）
  const readOnly = view.config?.readOnly === true;

  // 默认值播种
  useEffect(() => {
    for (const field of view.fields) {
      const fieldPath = resolveFieldPath(field);
      const currentValue = getValueAtPath(data, fieldPath);
      const runtimeState = resolveFieldState(field, data, registry);
      const effectiveDefault = runtimeState.defaultValue ?? field.defaultValue;

      if (currentValue === undefined && effectiveDefault !== undefined) {
        setValue(fieldPath, effectiveDefault);
      }
    }
  }, [data, setValue, view.fields, registry]);

  // 自动保存（只读表单不触发）
  useEffect(() => {
    if (readOnly || view.config?.autoSave?.enabled !== true || onSubmit == null) {
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      void onSubmit(data);
    }, view.config.autoSave.debounce ?? 300);

    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [data, onSubmit, readOnly, view.config?.autoSave?.debounce, view.config?.autoSave?.enabled]);

  const validateFieldInstance = async (
    field: FieldDefinition,
    rowContext?: WorkbookRowContext,
    nextValueOverride?: unknown,
  ) => {
    const fieldPath = resolveFieldPath(field, rowContext);
    const runtimeState = resolveFieldState(field, data, registry, rowContext);
    // onChange 校验时 data 闭包尚未包含新值，直接使用新值避免校验旧数据
    const value = nextValueOverride !== undefined ? nextValueOverride : getValueAtPath(data, fieldPath, rowContext);
    const nextErrors = await runValidations(value, runtimeState.validations, data, registry, rowContext);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [fieldPath]: nextErrors,
    }));
    return nextErrors;
  };

  const handleFieldChange = (
    field: FieldDefinition,
    fieldPath: string,
    nextValue: unknown,
    rowContext?: WorkbookRowContext,
  ) => {
    setValue(fieldPath, nextValue, rowContext);
    if (view.config?.validateMode === "onChange") {
      void validateFieldInstance(field, rowContext, nextValue);
    }
  };

  const handleFieldBlur = (field: FieldDefinition, _fieldPath: string, rowContext?: WorkbookRowContext) => {
    if (view.config?.validateMode === "onBlur" || view.config?.validateMode == null) {
      void validateFieldInstance(field, rowContext);
    }
  };

  const title = resolveI18nText(view.label, locale, i18n, fallbackLocale);

  const handleSubmit = async () => {
    // 只读表单不允许提交（防御）
    if (readOnly) {
      return;
    }

    const instances = buildFieldInstances(view.fields, data);
    const validationResults = await Promise.all(
      instances.map(({ field, rowContext }) => validateFieldInstance(field, rowContext)),
    );

    // Dispatch onValidate hook after field-level validation
    await runWorkbookHooks({ hooks, trigger: "onValidate", data, registry });

    if (validationResults.some((errors) => errors.length > 0)) {
      return;
    }

    replaceData(data);
    await onSubmit?.(data);
  };

  const handleReset = () => {
    if (readOnly) {
      return;
    }
    replaceData(initialSnapshotRef.current);
    setFieldErrors({});
  };

  const submitLabel =
    view.config?.submitLabel ??
    resolveBuiltInText(WORKBOOK_I18N_KEYS.FORM_SUBMIT, locale, i18n, fallbackLocale, "提交");
  const resetLabel =
    view.config?.resetLabel ?? resolveBuiltInText(WORKBOOK_I18N_KEYS.FORM_RESET, locale, i18n, fallbackLocale, "重置");

  return (
    <ScrollView style={rnStyles.scroll} contentContainerStyle={rnStyles.container} keyboardShouldPersistTaps="handled">
      {title != null ? <Text style={rnStyles.title}>{title}</Text> : null}
      <RNLayoutRenderer
        view={view}
        fieldErrors={fieldErrors}
        readOnly={readOnly}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
      />
      {!readOnly ? (
        <View style={rnStyles.actions}>
          <Pressable style={rnStyles.primaryBtn} onPress={() => void handleSubmit()}>
            <Text style={rnStyles.primaryText}>{submitLabel}</Text>
          </Pressable>
          <Pressable style={rnStyles.secondaryBtn} onPress={handleReset}>
            <Text style={rnStyles.secondaryText}>{resetLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
