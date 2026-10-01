import { useMemo } from "react";
import type { FieldDefinition, FormViewDefinition, LayoutNodeDefinition } from "../core/types";
import { DocumentRenderer } from "../DocumentRenderer";
import type { WorkbookDefinition } from "../schema/generated-types";
import type { SimpleFieldDef, SimpleFormLayout, SimpleFormProps } from "./types";

const TYPE_MAP: Record<string, FieldDefinition["type"]> = {
  text: "string",
  number: "number",
  boolean: "boolean",
  date: "date",
  textarea: "textarea",
  select: "select",
  multiselect: "multiselect",
  email: "string",
  password: "string",
  custom: "custom",
};

function mapFieldToDefinition(field: SimpleFieldDef): FieldDefinition {
  const def: FieldDefinition = {
    name: field.name,
    type: TYPE_MAP[field.type] ?? "string",
    label: field.label ?? field.name,
  };

  if (field.defaultValue !== undefined) {
    def.defaultValue = field.defaultValue;
  }

  if (field.required) {
    def.validations = [
      ...(def.validations ?? []),
      { type: "required", message: `${field.label ?? field.name} 为必填项` },
    ];
  }

  if (field.validations && field.validations.length > 0) {
    def.validations = [
      ...(def.validations ?? []),
      ...field.validations.map((v) => ({
        type: v.type,
        message: v.message,
        params: v.params,
      })),
    ];
  }

  if (field.options && field.options.length > 0) {
    def.options = field.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  if (field.disabled !== undefined) {
    def.disabled = field.disabled;
  }

  if (field.visible !== undefined) {
    def.visible = field.visible;
  }

  if (field.component) {
    def.component = field.component;
  }

  if (field.placeholder || field.format) {
    def.props = {
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(field.format ? { format: field.format } : {}),
    };
  }

  return def;
}

function generateLayout(fields: SimpleFieldDef[], layout: SimpleFormLayout): LayoutNodeDefinition[] {
  const fieldNodes = fields.map((field) => ({
    type: "field" as const,
    name: field.name,
    ...(layout === "grid" ? { span: Math.floor(12 / Math.max(fields.length, 1)) } : {}),
  }));

  if (fieldNodes.length === 0) return [];

  if (layout === "horizontal" || layout === "grid") {
    return [
      {
        type: "row",
        children: fieldNodes as [LayoutNodeDefinition, ...LayoutNodeDefinition[]],
      },
    ];
  }

  // vertical: one field per row
  return fieldNodes;
}

function buildWorkbookDefinition(
  fields: SimpleFieldDef[],
  layout: SimpleFormLayout,
  initialData: Record<string, unknown> | undefined,
  locale: string,
  readOnly: boolean,
): WorkbookDefinition {
  const fieldDefs: FieldDefinition[] = fields.map(mapFieldToDefinition);

  const formView: FormViewDefinition = {
    type: "form",
    id: "simple-form",
    label: "表单",
    fields: fieldDefs,
    layout: generateLayout(fields, layout),
    config: {
      validateMode: "onBlur",
      ...(readOnly ? { readOnly: true } : {}),
    },
  } as FormViewDefinition;

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale,
    data: initialData ?? {},
    views: [formView],
  };
}

/**
 * SimpleForm — the zero-config quick-start API.
 *
 * Renders a form from a simple field definition array. No Workbook schema
 * knowledge required. Internally translates to standard BF Workbook Schema
 * and reuses the full rendering pipeline.
 *
 * @example
 * ```tsx
 * <SimpleForm
 *   fields={[
 *     { name: "username", type: "text", label: "用户名", required: true },
 *     { name: "role", type: "select", label: "角色", options: [
 *       { value: "admin", label: "管理员" },
 *       { value: "user", label: "用户" },
 *     ]},
 *   ]}
 *   onSubmit={(data) => console.log(data)}
 * />
 * ```
 */
export function SimpleForm({
  fields,
  layout = "vertical",
  initialData = {},
  readOnly = false,
  onSubmit,
  onChange,
  locale = "zh-CN",
  className,
}: SimpleFormProps) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately re-compute only when fields/layout/locale/readOnly change; initialData is only the starting snapshot.
  const workbook = useMemo(
    () => buildWorkbookDefinition(fields, layout, initialData, locale, readOnly),
    [fields, layout, locale, readOnly],
  );

  return (
    <div className={className}>
      <DocumentRenderer
        workbook={workbook}
        initialData={initialData}
        onDataChange={onChange}
        onSubmit={onSubmit}
        locale={locale}
        activeViewId="simple-form"
      />
    </div>
  );
}
