import { useCallback, useMemo, useRef, useState } from "react";

import { evaluateCondition } from "../../core/condition/evaluate";
import { materializePath } from "../../core/data/pathUtils";
import { resolveBuiltInText, WORKBOOK_I18N_KEYS } from "../../core/i18n/i18n";
import { sanitizeHtml } from "../../core/sanitize/sanitize";
import type { FieldDefinition, FormViewDefinition, LayoutNodeDefinition, WorkbookRowContext } from "../../core/types";
import { resolveLayoutSpan } from "../../core/types";
import { useDevice } from "../../device/DeviceContext";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import { FieldFactory } from "./FieldFactory";
import type { FormApiLike } from "./types";

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

interface LayoutRendererProps {
  form: FormApiLike;
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
}: LayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "tabs" }> }) {
  const { data } = useWorkbookData();
  const { registry, locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const [activeKey, setActiveKey] = useState(node.defaultActiveKey ?? node.tabs[0]?.key);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const visibleTabs = node.tabs.filter(
    (tab) => tab.visible == null || evaluateCondition(tab.visible, data, registry, props.rowContext),
  );
  const activeTab = visibleTabs.find((tab) => tab.key === activeKey) ?? visibleTabs[0];
  const activeIndex = visibleTabs.findIndex((tab) => tab.key === activeTab?.key);

  const focusTab = useCallback(
    (index: number) => {
      const tab = visibleTabs[index];
      if (tab != null) {
        setActiveKey(tab.key);
        tabRefs.current.get(tab.key)?.focus();
      }
    },
    [visibleTabs],
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const count = visibleTabs.length;
      let nextIndex = activeIndex;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (activeIndex + 1) % count;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (activeIndex - 1 + count) % count;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = count - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      focusTab(nextIndex);
    },
    [activeIndex, visibleTabs.length, focusTab],
  );

  const tabPanelId = `bf-tabpanel-${node.tabs[0]?.key ?? "tab"}`;

  return (
    <div className="bf-workbook-tabs">
      <div
        className="bf-workbook-tabs-list"
        role="tablist"
        aria-label={resolveBuiltInText(WORKBOOK_I18N_KEYS.TABS_LABEL, locale, i18n, fallbackLocale, "标签页")}
      >
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          const tabId = `bf-tab-${tab.key}`;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.key, el);
                else tabRefs.current.delete(tab.key);
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveKey(tab.key)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.title}
            </button>
          );
        })}
      </div>
      {activeTab != null ? (
        <div role="tabpanel" id={tabPanelId} aria-labelledby={`bf-tab-${activeTab.key}`} tabIndex={0}>
          <LayoutRenderer {...props} view={{ fields: props.view.fields, layout: activeTab.children }} />
        </div>
      ) : null}
    </div>
  );
}

function StepsLayout({
  node,
  ...props
}: LayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "steps" }> }) {
  const { locale, fallbackLocale, i18n } = useWorkbookRuntime();
  const [index, setIndex] = useState(node.current ?? 0);
  const step = node.steps[index] ?? node.steps[0];
  const stepCount = node.steps.length;

  const goToStep = useCallback(
    (nextIndex: number) => {
      setIndex(Math.max(0, Math.min(nextIndex, stepCount - 1)));
    },
    [stepCount],
  );

  const handleStepKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          goToStep(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          goToStep(index - 1);
          break;
        case "Home":
          event.preventDefault();
          goToStep(0);
          break;
        case "End":
          event.preventDefault();
          goToStep(stepCount - 1);
          break;
        default:
          return;
      }
    },
    [index, stepCount, goToStep],
  );

  return (
    <div className="bf-workbook-steps">
      <div
        className="bf-workbook-steps-list"
        role="list"
        aria-label={resolveBuiltInText(WORKBOOK_I18N_KEYS.STEPS_LABEL, locale, i18n, fallbackLocale, "步骤")}
      >
        {node.steps.map((entry, stepIndex) => {
          const isCurrent = stepIndex === index;
          const stepId = `bf-step-${entry.key}`;
          return (
            <button
              key={entry.key}
              id={stepId}
              type="button"
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
              aria-posinset={stepIndex + 1}
              aria-setsize={stepCount}
              tabIndex={isCurrent ? 0 : -1}
              onClick={() => setIndex(stepIndex)}
              onKeyDown={handleStepKeyDown}
            >
              {entry.title}
            </button>
          );
        })}
      </div>
      {step != null ? <LayoutRenderer {...props} view={{ fields: props.view.fields, layout: step.children }} /> : null}
      <div className="bf-workbook-steps-actions">
        <button type="button" onClick={() => goToStep(index - 1)} disabled={index === 0}>
          {resolveBuiltInText(WORKBOOK_I18N_KEYS.STEPS_PREVIOUS, locale, i18n, fallbackLocale, "上一步")}
        </button>
        <button type="button" onClick={() => goToStep(index + 1)} disabled={index >= node.steps.length - 1}>
          {resolveBuiltInText(WORKBOOK_I18N_KEYS.STEPS_NEXT, locale, i18n, fallbackLocale, "下一步")}
        </button>
      </div>
    </div>
  );
}

function RepeatLayout({
  node,
  ...props
}: LayoutRendererProps & { node: Extract<LayoutNodeDefinition, { type: "repeat" }> }) {
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
    props.form.setFieldValue(arrayPath as never, nextItems as never);
    setValue(arrayPath, nextItems, props.rowContext);
  };

  const handleRemove = (index: number) => {
    if (!canMutate) {
      return;
    }
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    props.form.setFieldValue(arrayPath as never, nextItems as never);
    setValue(arrayPath, nextItems, props.rowContext);
  };

  return (
    <div className="bf-workbook-repeat">
      {items.map((item, index) => (
        <div key={`${arrayPath}-${index}`} className="bf-workbook-repeat-item">
          <LayoutRenderer
            {...props}
            rowContext={{ index, path: arrayPath, item }}
            view={{ fields: props.view.fields, layout: node.children }}
          />
          <button type="button" onClick={() => handleRemove(index)} disabled={atMin || !canMutate}>
            {arrayConfig?.removeLabel ??
              resolveBuiltInText(WORKBOOK_I18N_KEYS.REPEAT_REMOVE, locale, i18n, fallbackLocale, "删除")}
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} disabled={atMax || !canMutate}>
        {arrayConfig?.addLabel ??
          resolveBuiltInText(WORKBOOK_I18N_KEYS.REPEAT_ADD, locale, i18n, fallbackLocale, "新增")}
      </button>
    </div>
  );
}

export function LayoutRenderer(props: LayoutRendererProps) {
  const { data } = useWorkbookData();
  const { registry } = useWorkbookRuntime();
  const { device } = useDevice();
  const fieldMap = useMemo(() => new Map(props.view.fields.map((field) => [field.name, field])), [props.view.fields]);
  const layout =
    props.view.layout ??
    props.view.fields.map((field) => ({ type: "field", name: field.name }) as LayoutNodeDefinition);

  return (
    <div className="bf-workbook-layout">
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
              <FieldFactory
                key={`${node.type}-${node.name}-${index}`}
                form={props.form}
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
              <section key={`${node.type}-${index}`} className="bf-workbook-group">
                {node.title != null ? <h3>{node.title}</h3> : null}
                <LayoutRenderer {...props} view={{ fields: props.view.fields, layout: node.children }} />
              </section>
            );
          case "row": {
            // 多端适配：mobile 单列堆叠、tablet 最多两列、desktop 按子项 span 之和声明列数。
            // 每个子项按 resolveLayoutSpan 占列（缺省 1）→ 全 span:1 时与现状等宽一致。
            const totalCols = node.children.reduce((sum, child) => sum + resolveLayoutSpan(child), 0);
            const cols = device === "mobile" ? 1 : device === "tablet" ? Math.min(totalCols, 2) : totalCols;
            return (
              <div
                key={`${node.type}-${index}`}
                className="bf-workbook-row"
                data-cols={cols}
                style={{
                  display: "grid",
                  gap: node.gutter ?? 12,
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {node.children.map((child, childIndex) => (
                  <div
                    key={`${node.type}-item-${childIndex}`}
                    className="bf-workbook-row-item"
                    style={{ gridColumn: `span ${Math.min(resolveLayoutSpan(child), cols)}` }}
                  >
                    <LayoutRenderer {...props} view={{ fields: props.view.fields, layout: [child] }} />
                  </div>
                ))}
              </div>
            );
          }
          case "tabs":
            return <TabsLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "steps":
            return <StepsLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "conditional":
            return evaluateCondition(node.condition, data, registry, props.rowContext) ? (
              <LayoutRenderer
                key={`${node.type}-${index}`}
                {...props}
                view={{ fields: props.view.fields, layout: node.children }}
              />
            ) : null;
          case "repeat":
            return <RepeatLayout key={`${node.type}-${index}`} {...props} node={node} />;
          case "html":
            return (
              // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized via sanitizeHtml() above.
              <div key={`${node.type}-${index}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(node.content) }} />
            );
          case "custom": {
            const Component = registry.layout.get(node.component);
            if (Component == null) {
              return <div key={`${node.type}-${index}`}>未注册自定义布局：{node.component}</div>;
            }
            return (
              <Component key={`${node.type}-${index}`} node={node} rowContext={props.rowContext}>
                {node.children != null && node.children.length > 0 ? (
                  <LayoutRenderer {...props} view={{ fields: props.view.fields, layout: node.children }} />
                ) : undefined}
              </Component>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
