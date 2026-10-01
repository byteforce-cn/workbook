/**
 * RN 布局渲染器：9 类布局节点 → RN flexbox。
 * - field → RNFieldFactory（含 overrides 合并）
 * - group / row / tabs / steps / conditional / repeat 与 Web 语义一致
 * - html → 移动端降级忽略（无 HTML 渲染能力，生产单据禁止使用 layoutHtml）
 * - custom → registry.layout 注册的 RN 组件（WorkbookLayoutPluginProps 契约）
 */

import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { evaluateCondition } from "../core/condition/evaluate";
import { materializePath } from "../core/data/pathUtils";
import { resolveBuiltInText, WORKBOOK_I18N_KEYS } from "../core/i18n/i18n";
import type { FieldDefinition, FormViewDefinition, LayoutNodeDefinition, WorkbookRowContext } from "../core/types";
import { resolveLayoutSpan } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import { RNFieldFactory } from "./RNFieldFactory";
import { rnStyles } from "./styles";

function resolveFieldPath(field: FieldDefinition, rowContext?: WorkbookRowContext): string {
  const rawPath = field.bind?.path ?? field.name;
  if (rowContext == null && rawPath.includes("*")) {
    return field.name;
  }
  return rawPath.includes("*") ? materializePath(rawPath, rowContext) : rawPath;
}

function buildArrayItemFromFields(fields: FieldDefinition[] | undefined): Record<string, unknown> {
  return (fields ?? []).reduce<Record<string, unknown>>((result, field) => {
    result[field.name] = field.defaultValue ?? (field.type === "array" ? [] : field.type === "object" ? {} : "");
    return result;
  }, {});
}

export interface RNLayoutRendererProps {
  view: Pick<FormViewDefinition, "fields" | "layout">;
  fieldErrors: Record<string, string[]>;
  /** Form-level read-only flag (config.readOnly); forces every field disabled */
  readOnly?: boolean;
  onFieldChange(field: FieldDefinition, fieldPath: string, nextValue: unknown, rowContext?: WorkbookRowContext): void;
  onFieldBlur(field: FieldDefinition, fieldPath: string, rowContext?: WorkbookRowContext): void;
  rowContext?: WorkbookRowContext;
}

function TabsLayout({
  node,
  ...props
}: RNLayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "tabs" }> }) {
  const { data } = useWorkbookData();
  const { registry } = useWorkbookRuntime();
  const [activeKey, setActiveKey] = useState(node.defaultActiveKey ?? node.tabs[0]?.key);

  const visibleTabs = node.tabs.filter(
    (tab) => tab.visible == null || evaluateCondition(tab.visible, data, registry, props.rowContext),
  );
  const activeTab = visibleTabs.find((tab) => tab.key === activeKey) ?? visibleTabs[0];

  return (
    <View style={rnStyles.tabs}>
      <View style={rnStyles.tabBar}>
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <Pressable
              key={tab.key}
              style={[rnStyles.tab, isActive ? rnStyles.tabActive : null]}
              onPress={() => setActiveKey(tab.key)}
            >
              <Text style={isActive ? rnStyles.tabTextActive : rnStyles.tabText}>{tab.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {activeTab != null ? (
        <RNLayoutRenderer {...props} view={{ fields: props.view.fields, layout: activeTab.children }} />
      ) : null}
    </View>
  );
}

function StepsLayout({
  node,
  ...props
}: RNLayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "steps" }> }) {
  const { locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const [index, setIndex] = useState(node.current ?? 0);
  const step = node.steps[index] ?? node.steps[0];
  const stepCount = node.steps.length;

  return (
    <View style={rnStyles.steps}>
      <View style={rnStyles.stepBar}>
        {node.steps.map((entry, stepIndex) => {
          const isCurrent = stepIndex === index;
          return (
            <Pressable
              key={entry.key}
              style={[rnStyles.stepChip, isCurrent ? rnStyles.stepChipActive : null]}
              onPress={() => setIndex(stepIndex)}
            >
              <Text style={isCurrent ? rnStyles.stepChipTextActive : rnStyles.stepChipText}>{entry.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {step != null ? (
        <RNLayoutRenderer {...props} view={{ fields: props.view.fields, layout: step.children }} />
      ) : null}
      <View style={rnStyles.repeatActions}>
        <Pressable style={rnStyles.linkBtn} disabled={index === 0} onPress={() => setIndex(Math.max(0, index - 1))}>
          <Text style={[rnStyles.linkText, index === 0 ? { color: "#9ca3af" } : null]}>
            {resolveBuiltInText(WORKBOOK_I18N_KEYS.STEPS_PREVIOUS, locale, i18n, fallbackLocale, "上一步")}
          </Text>
        </Pressable>
        <Pressable
          style={rnStyles.linkBtn}
          disabled={index >= stepCount - 1}
          onPress={() => setIndex(Math.min(stepCount - 1, index + 1))}
        >
          <Text style={[rnStyles.linkText, index >= stepCount - 1 ? { color: "#9ca3af" } : null]}>
            {resolveBuiltInText(WORKBOOK_I18N_KEYS.STEPS_NEXT, locale, i18n, fallbackLocale, "下一步")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function RepeatLayout({
  node,
  ...props
}: RNLayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "repeat" }> }) {
  const { data, setValue } = useWorkbookData();
  const { locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const arrayField = useMemo(
    () => props.view.fields.find((field) => field.name === node.field),
    [node.field, props.view.fields],
  );
  const arrayPath = arrayField == null ? node.field : resolveFieldPath(arrayField, props.rowContext);
  const items = Array.isArray((data as Record<string, unknown>)[arrayField?.name ?? ""])
    ? ((data as Record<string, unknown>)[arrayField?.name ?? ""] as unknown[])
    : [];

  const arrayConfig = node.arrayConfig ?? arrayField?.arrayConfig;
  const minItems = typeof arrayConfig?.minItems === "number" ? arrayConfig.minItems : 0;
  const maxItems = typeof arrayConfig?.maxItems === "number" ? arrayConfig.maxItems : Infinity;
  const atMin = items.length <= minItems;
  const atMax = items.length >= maxItems;
  // 只读模式下禁止增删行
  const canMutate = props.readOnly !== true;

  const handleAdd = () => {
    if (!canMutate) {
      return;
    }
    const nextItems = [...items, buildArrayItemFromFields(arrayConfig?.itemFields)];
    setValue(arrayPath, nextItems, props.rowContext);
  };

  const handleRemove = (index: number) => {
    if (!canMutate) {
      return;
    }
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    setValue(arrayPath, nextItems, props.rowContext);
  };

  return (
    <View style={rnStyles.field}>
      {items.map((item, index) => (
        <View key={`${arrayPath}-${index}`} style={rnStyles.repeatItem}>
          <RNLayoutRenderer
            {...props}
            rowContext={{ index, path: arrayPath, item }}
            view={{ fields: props.view.fields, layout: node.children }}
          />
          <Pressable style={rnStyles.linkBtn} disabled={atMin || !canMutate} onPress={() => handleRemove(index)}>
            <Text
              style={[rnStyles.linkText, rnStyles.linkTextDanger, atMin || !canMutate ? { color: "#9ca3af" } : null]}
            >
              {arrayConfig?.removeLabel ??
                resolveBuiltInText(WORKBOOK_I18N_KEYS.REPEAT_REMOVE, locale, i18n, fallbackLocale, "删除")}
            </Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={rnStyles.linkBtn} disabled={atMax || !canMutate} onPress={handleAdd}>
        <Text style={[rnStyles.linkText, atMax || !canMutate ? { color: "#9ca3af" } : null]}>
          {arrayConfig?.addLabel ??
            resolveBuiltInText(WORKBOOK_I18N_KEYS.REPEAT_ADD, locale, i18n, fallbackLocale, "新增")}
        </Text>
      </Pressable>
    </View>
  );
}

export function RNLayoutRenderer(props: RNLayoutRendererProps) {
  const { data } = useWorkbookData();
  const { registry } = useWorkbookRuntime();
  const fieldMap = useMemo(() => new Map(props.view.fields.map((field) => [field.name, field])), [props.view.fields]);
  const layout =
    props.view.layout ??
    props.view.fields.map((field) => ({ type: "field", name: field.name }) as LayoutNodeDefinition);

  return (
    <View>
      {layout.map((node, index) => {
        switch (node.type) {
          case "field": {
            const field = fieldMap.get(node.name);
            if (field == null) {
              return null;
            }
            const mergedField =
              node.overrides == null
                ? field
                : {
                    ...field,
                    ...node.overrides,
                    props: {
                      ...(field.props ?? {}),
                      ...(node.overrides.props ?? {}),
                    },
                  };
            return (
              <RNFieldFactory
                key={`${node.type}-${node.name}-${index}`}
                field={mergedField}
                fieldErrors={props.fieldErrors}
                rowContext={props.rowContext}
                readOnly={props.readOnly}
                onFieldChange={props.onFieldChange}
                onFieldBlur={props.onFieldBlur}
              />
            );
          }
          case "group":
            return (
              <View key={`${node.type}-${index}`} style={rnStyles.group}>
                {node.title != null ? <Text style={rnStyles.groupTitle}>{node.title}</Text> : null}
                <RNLayoutRenderer {...props} view={{ fields: props.view.fields, layout: node.children }} />
              </View>
            );
          case "row":
            // 子项按 span 相对分配宽度（flex 权重 = span）→ 全 span:1 时均分，与 Web 等宽一致
            return (
              <View key={`${node.type}-${index}`} style={[rnStyles.row, { marginBottom: 14, gap: node.gutter ?? 12 }]}>
                {node.children.map((child, childIndex) => (
                  <View key={childIndex} style={{ flex: resolveLayoutSpan(child) }}>
                    <RNLayoutRenderer {...props} view={{ fields: props.view.fields, layout: [child] }} />
                  </View>
                ))}
              </View>
            );
          case "tabs":
            return <TabsLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "steps":
            return <StepsLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "conditional":
            return evaluateCondition(node.condition, data, registry, props.rowContext) ? (
              <RNLayoutRenderer
                key={`${node.type}-${index}`}
                {...props}
                view={{ fields: props.view.fields, layout: node.children }}
              />
            ) : null;
          case "repeat":
            return <RepeatLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "html":
            // 移动端降级：无 HTML 渲染能力，忽略 layoutHtml 节点（生产单据禁止使用）
            return null;
          case "custom": {
            const Component = registry.layout.get(node.component);
            if (Component == null) {
              return (
                <View key={`${node.type}-${index}`} style={rnStyles.field}>
                  <Text style={rnStyles.unregistered}>未注册自定义布局：{node.component}</Text>
                </View>
              );
            }
            return (
              <Component key={`${node.type}-${index}`} node={node} rowContext={props.rowContext}>
                {node.children != null && node.children.length > 0 ? (
                  <RNLayoutRenderer {...props} view={{ fields: props.view.fields, layout: node.children }} />
                ) : undefined}
              </Component>
            );
          }
          default:
            return null;
        }
      })}
    </View>
  );
}
