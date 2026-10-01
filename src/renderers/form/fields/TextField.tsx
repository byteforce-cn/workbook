import type { FormApiLike } from "../types";

export interface StandardFieldProps {
  form: FormApiLike;
  fieldPath: string;
  label: string;
  disabled?: boolean;
  /** 必填标记（由运行时 validations / 依赖 required 解析，渲染红 `*`） */
  required?: boolean;
  errors: string[];
  onValueChange(nextValue: unknown): void;
  onValueBlur(): void;
}

/** 字段标签（label + 必填星号），各内建字段统一复用。
 * 星号经 `data-required` 交由主题 CSS `::after` 渲染：不污染标签文本
 * （屏幕阅读器可读名 / testing-library 标签匹配均不受影响）。 */
export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span data-required={required ? "true" : undefined}>{label}</span>;
}

export function TextField({
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
