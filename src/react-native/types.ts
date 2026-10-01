/**
 * RN 渲染器共享类型。
 * 字段组件与 FieldFactory 之间传递的通用 props，渲染器无关（不依赖 @tanstack/react-form）。
 */

export interface RNStandardFieldProps {
  /** 绑定路径（已物化，含行上下文时 `[*]` 已替换） */
  fieldPath: string;
  /** 已解析的 i18n 标签 */
  label: string;
  /** 当前值（来自数据树） */
  value: unknown;
  /** 字段级禁用（依赖条件）或表单级只读叠加 */
  disabled?: boolean;
  /** schema validations 是否含 required（用于展示必填星号） */
  required?: boolean;
  /** 当前字段校验错误 */
  errors: string[];
  /** 值变更（写入数据树 + onChange 校验） */
  onValueChange(nextValue: unknown): void;
  /** 失焦（触发 onBlur 校验） */
  onValueBlur(): void;
}
