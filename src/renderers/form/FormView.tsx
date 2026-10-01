import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { getValueAtPath } from "../../core/data/pathUtils";
import { resolveFieldState } from "../../core/dependency/engine";
import { resolveBuiltInText, resolveI18nText, WORKBOOK_I18N_KEYS } from "../../core/i18n/i18n";
import type {
  FieldDefinition,
  FormBlockDefinition,
  FormViewDefinition,
  WorkbookData,
  WorkbookRowContext,
} from "../../core/types";
import { runValidations } from "../../core/validation/validator";
import { useDevice } from "../../device/DeviceContext";
import { useWorkbookData } from "../../react/DataProvider";
import { runWorkbookHooks } from "../../react/hooks/useWorkbookHooks";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import { LayoutRenderer } from "./LayoutRenderer";
import type { FormApiLike } from "./types";

type FormLikeDefinition = FormViewDefinition | FormBlockDefinition;

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

export interface FormViewProps {
  view: FormLikeDefinition;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}

export function FormView({ view, onSubmit }: FormViewProps) {
  const { data, replaceData, setValue } = useWorkbookData();
  const { registry, locale, fallbackLocale, i18n, hooks } = useWorkbookRuntime();
  const { device } = useDevice();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const initialSnapshotRef = useRef(data);
  // 审核中只读：config.readOnly === true 时整表单只读（字段禁用 + 隐藏提交/重置 + 拦截提交/autoSave）
  const readOnly = view.config?.readOnly === true;
  const form = useForm({
    defaultValues: data,
    onSubmit: async ({ value }) => {
      if (readOnly) {
        return;
      }
      replaceData(value as WorkbookData);
      await onSubmit?.(value as WorkbookData);
    },
  }) as unknown as FormApiLike;

  useEffect(() => {
    for (const field of view.fields) {
      const fieldPath = resolveFieldPath(field);
      const currentValue = getValueAtPath(data, fieldPath);
      const runtimeState = resolveFieldState(field, data, registry);
      const effectiveDefault = runtimeState.defaultValue ?? field.defaultValue;

      if (currentValue === undefined && effectiveDefault !== undefined) {
        form.setFieldValue(fieldPath as never, effectiveDefault as never);
        setValue(fieldPath, effectiveDefault);
      }
    }
  }, [data, form, setValue, view.fields, registry]);

  useEffect(() => {
    // 只读表单不应触发 autoSave（审核中不产生任何写操作）
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
    form.setFieldValue(fieldPath as never, nextValue as never);
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

  const title = resolveI18nText(("label" in view ? view.label : undefined) ?? undefined, locale, i18n, fallbackLocale);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 只读表单不允许提交（防御：即便外部触发表单 submit 事件也拦截）
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

    await form.handleSubmit();
  };

  const handleReset = () => {
    if (readOnly) {
      return;
    }
    form.reset();
    replaceData(initialSnapshotRef.current);
    setFieldErrors({});
  };

  return (
    <section className="bf-workbook-form-view" data-device={device}>
      {title != null ? <h2>{title}</h2> : null}
      <form onSubmit={(event) => void handleSubmit(event)}>
        <LayoutRenderer
          form={form}
          view={view}
          fieldErrors={fieldErrors}
          readOnly={readOnly}
          onFieldChange={handleFieldChange}
          onFieldBlur={handleFieldBlur}
        />
        {!readOnly ? (
          <div className={`bf-workbook-form-actions${device === "mobile" ? " bf-workbook-form-actions--mobile" : ""}`}>
            <button type="submit">
              {view.config?.submitLabel ??
                resolveBuiltInText(WORKBOOK_I18N_KEYS.FORM_SUBMIT, locale, i18n, fallbackLocale, "提交")}
            </button>
            <button type="button" onClick={handleReset}>
              {view.config?.resetLabel ??
                resolveBuiltInText(WORKBOOK_I18N_KEYS.FORM_RESET, locale, i18n, fallbackLocale, "重置")}
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
