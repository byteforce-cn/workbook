/**
 * RN 表单字段组件集（10 类 schema 字段类型 → RN 原生控件）。
 *
 * 与 Web 渲染器共用同一套 schema 与运行时契约：
 * - 值读写直接对接数据树（RNFieldFactory 注入 value / onValueChange），不依赖 @tanstack/react-form。
 * - custom 字段复用 `registry.field` 插件注册表，props 契约 = WorkbookFieldPluginProps（渲染器无关）。
 * - 原生控件：TextInput / Switch / Modal 底部选择器 / 多行文本 / JSON 数组对象编辑器。
 */

import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Switch, Text, TextInput, View } from "react-native";
import type { FieldDefinition, WorkbookRowContext } from "../core/types";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { WorkbookOption } from "../react/registry";
import { rnStyles } from "./styles";
import type { RNStandardFieldProps } from "./types";

/**
 * 通用文本输入字段（string / number / date / textarea 的基座）。
 */
export interface RNTextInputFieldProps extends RNStandardFieldProps {
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "number-pad" | "email-address" | "phone-pad";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function RNTextInputField({
  label,
  value,
  disabled,
  required,
  errors,
  multiline,
  keyboardType,
  placeholder,
  autoCapitalize,
  onValueChange,
  onValueBlur,
}: RNTextInputFieldProps) {
  return (
    <View style={rnStyles.field}>
      <Text style={rnStyles.label}>
        {label}
        {required ? <Text style={rnStyles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[rnStyles.input, multiline ? rnStyles.multiline : null, disabled ? rnStyles.inputDisabled : null]}
        value={value == null ? "" : String(value)}
        editable={!disabled}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize={autoCapitalize ?? "sentences"}
        onChangeText={(text) => onValueChange(text)}
        onBlur={onValueBlur}
      />
      {errors.length > 0 ? <Text style={rnStyles.error}>{errors.join(" ")}</Text> : null}
    </View>
  );
}

/**
 * string → TextInput
 */
export function RNStringField(props: RNStandardFieldProps & { placeholder?: string }) {
  const { onValueChange, ...rest } = props;
  return <RNTextInputField {...rest} placeholder={props.placeholder} onValueChange={onValueChange} />;
}

/**
 * number → TextInput（数字键盘，合法数字落 number，空串落空）
 */
export function RNNumberField(props: RNStandardFieldProps) {
  const { onValueChange, ...rest } = props;
  return (
    <RNTextInputField
      {...rest}
      keyboardType="numeric"
      placeholder="0"
      onValueChange={(next) => {
        const text = String(next ?? "");
        if (text.trim() === "") {
          onValueChange("");
          return;
        }
        const parsed = Number(text);
        onValueChange(Number.isNaN(parsed) ? text : parsed);
      }}
    />
  );
}

/**
 * boolean → Switch
 */
export function RNBooleanField({
  label,
  value,
  disabled,
  required,
  errors,
  onValueChange,
  onValueBlur,
}: RNStandardFieldProps) {
  return (
    <View style={rnStyles.field}>
      <View style={rnStyles.booleanRow}>
        <Text style={rnStyles.label}>
          {label}
          {required ? <Text style={rnStyles.required}> *</Text> : null}
        </Text>
        <Switch
          value={Boolean(value)}
          disabled={disabled}
          onValueChange={(next) => {
            onValueChange(next);
            onValueBlur();
          }}
        />
      </View>
      {errors.length > 0 ? <Text style={rnStyles.error}>{errors.join(" ")}</Text> : null}
    </View>
  );
}

/**
 * date → TextInput（MVP 自由文本录入；@react-native-community/datetimepicker 为规划增强）
 */
export function RNDateField(props: RNStandardFieldProps) {
  const { onValueChange, ...rest } = props;
  return <RNTextInputField {...rest} placeholder="YYYY-MM-DD" autoCapitalize="none" onValueChange={onValueChange} />;
}

/**
 * textarea → TextInput multiline
 */
export function RNTextareaField(props: RNStandardFieldProps) {
  const { onValueChange, ...rest } = props;
  return <RNTextInputField {...rest} multiline placeholder="请输入" onValueChange={onValueChange} />;
}

/**
 * select / multiselect → 底部弹窗选择器（Modal + FlatList）
 * - 单选：点选即确定并关闭
 * - 多选：勾选列表 + 确定按钮
 */
export interface RNSelectFieldProps extends RNStandardFieldProps {
  options: WorkbookOption[];
  multiple?: boolean;
}

export function RNSelectField({
  label,
  value,
  disabled,
  required,
  errors,
  options,
  multiple,
  onValueChange,
  onValueBlur,
}: RNSelectFieldProps) {
  const [visible, setVisible] = useState(false);

  const values = multiple
    ? Array.isArray(value)
      ? value.map(String)
      : []
    : value == null || value === ""
      ? []
      : [String(value)];

  const selectedLabels = options
    .filter((option) => values.includes(String(option.value)))
    .map((option) => option.label);
  const displayText = multiple
    ? selectedLabels.length > 0
      ? selectedLabels.join("、")
      : "请选择"
    : (selectedLabels[0] ?? "请选择");

  return (
    <View style={rnStyles.field}>
      <Text style={rnStyles.label}>
        {label}
        {required ? <Text style={rnStyles.required}> *</Text> : null}
      </Text>
      <Pressable
        style={[rnStyles.picker, disabled ? rnStyles.inputDisabled : null]}
        disabled={disabled}
        onPress={() => setVisible(true)}
      >
        <Text style={values.length > 0 ? rnStyles.pickerText : rnStyles.pickerPlaceholder} numberOfLines={1}>
          {displayText}
        </Text>
        <Text style={rnStyles.pickerChevron}>▾</Text>
      </Pressable>
      {errors.length > 0 ? <Text style={rnStyles.error}>{errors.join(" ")}</Text> : null}

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={rnStyles.modalBackdrop} onPress={() => setVisible(false)} />
        <View style={rnStyles.modalSheet}>
          <View style={rnStyles.modalHeader}>
            <Text style={rnStyles.modalTitle}>{label}</Text>
            <Pressable onPress={() => setVisible(false)}>
              <Text style={rnStyles.modalClose}>关闭</Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => {
              const isSelected = values.includes(String(item.value));
              return (
                <Pressable
                  style={[rnStyles.optionRow, item.disabled ? rnStyles.optionDisabled : null]}
                  disabled={item.disabled}
                  onPress={() => {
                    if (multiple) {
                      const next = isSelected
                        ? values.filter((selected) => selected !== String(item.value))
                        : [...values, String(item.value)];
                      onValueChange(next);
                    } else {
                      onValueChange(item.value);
                      onValueBlur();
                      setVisible(false);
                    }
                  }}
                >
                  <Text style={rnStyles.optionText}>{item.label}</Text>
                  {isSelected ? <Text style={rnStyles.optionCheck}>{multiple ? "☑" : "●"}</Text> : null}
                </Pressable>
              );
            }}
          />
          {multiple ? (
            <Pressable
              style={rnStyles.confirmBtn}
              onPress={() => {
                onValueBlur();
                setVisible(false);
              }}
            >
              <Text style={rnStyles.confirmText}>确定</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

/**
 * array / object → JSON 编辑器（与 Web 行为一致：失焦解析，非法 JSON 回退原值）。
 * 数组/对象的结构化编辑走 repeat 布局（`[*]` 行通配字段），此处为字段类型级兜底编辑器。
 */
function JsonEditorField({
  label,
  value,
  disabled,
  required,
  errors,
  emptyValue,
  onValueChange,
  onValueBlur,
}: RNStandardFieldProps & { emptyValue: unknown }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? emptyValue, null, 2));

  useEffect(() => {
    setDraft(JSON.stringify(value ?? emptyValue, null, 2));
  }, [value, emptyValue]);

  return (
    <View style={rnStyles.field}>
      <Text style={rnStyles.label}>
        {label}
        {required ? <Text style={rnStyles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[rnStyles.input, rnStyles.multiline, rnStyles.mono, disabled ? rnStyles.inputDisabled : null]}
        value={draft}
        editable={!disabled}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDraft}
        onBlur={() => {
          try {
            onValueChange(JSON.parse(draft));
          } catch {
            setDraft(JSON.stringify(value ?? emptyValue, null, 2));
          }
          onValueBlur();
        }}
      />
      {errors.length > 0 ? <Text style={rnStyles.error}>{errors.join(" ")}</Text> : null}
    </View>
  );
}

export function RNArrayField(props: RNStandardFieldProps) {
  return <JsonEditorField {...props} emptyValue={[]} />;
}

export function RNObjectField(props: RNStandardFieldProps) {
  return <JsonEditorField {...props} emptyValue={{}} />;
}

/**
 * custom → registry.field 注册的 RN 组件（WorkbookFieldPluginProps 契约，双端同构）
 */
export interface RNCustomFieldProps {
  componentName: string;
  field: FieldDefinition;
  fieldPath: string;
  value: unknown;
  errors: string[];
  disabled?: boolean;
  rowContext?: WorkbookRowContext;
  onChange(nextValue: unknown): void;
  onBlur(): void;
}

export function RNCustomField({
  componentName,
  field,
  fieldPath,
  value,
  errors,
  disabled,
  rowContext,
  onChange,
  onBlur,
}: RNCustomFieldProps) {
  const { registry } = useWorkbookRuntime();
  const Component = registry.field.get(componentName);

  if (Component == null) {
    return (
      <View style={rnStyles.field}>
        <Text style={rnStyles.unregistered}>未注册自定义字段：{componentName}</Text>
      </View>
    );
  }

  return (
    <Component
      field={field}
      fieldPath={fieldPath}
      value={value}
      errors={errors}
      disabled={disabled}
      rowContext={rowContext}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
}
