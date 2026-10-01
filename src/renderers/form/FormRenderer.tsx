import { useMemo } from "react";
import type { FieldDefinition, FormViewDefinition, LayoutNodeDefinition, WorkbookData } from "../../core/types";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookPluginRegistry } from "../../react/registry";
import type { WorkbookDefinition } from "../../schema/generated-types";

export interface FormRendererProps {
  /** Field definitions (BF Workbook Schema format or simplified) */
  fields: FieldDefinition[];
  /** Layout nodes (auto-generated vertical layout if omitted) */
  layout?: LayoutNodeDefinition[];
  /** Initial form data */
  data?: WorkbookData;
  /** Called when form data changes */
  onDataChange?: (data: WorkbookData) => void;
  /** Called on form submit */
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
  /** Plugin registry (uses global singleton if omitted) */
  plugins?: WorkbookPluginRegistry;
  /** Locale (default: "zh-CN") */
  locale?: string;
  /** Fallback locale */
  fallbackLocale?: string;
  /** Form view configuration */
  validateMode?: "onBlur" | "onChange" | "onSubmit";
  /** Custom submit button label */
  submitLabel?: string;
  /** Read-only mode: all fields disabled and submit/reset actions hidden (审核中只读) */
  readOnly?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * FormRenderer — standalone form rendering without DocumentRenderer.
 *
 * Creates its own runtime context internally. Use when you only need
 * a form and don't want to construct a full WorkbookDefinition.
 *
 * @example
 * ```tsx
 * <FormRenderer
 *   fields={[
 *     { name: "username", type: "string", label: "用户名" },
 *   ]}
 *   onSubmit={(data) => console.log(data)}
 * />
 * ```
 */
export function FormRenderer({
  fields,
  layout,
  data = {},
  onDataChange,
  onSubmit,
  plugins,
  locale = "zh-CN",
  fallbackLocale = "en-US",
  validateMode = "onBlur",
  submitLabel,
  readOnly = false,
  className,
}: FormRendererProps) {
  const workbook = useMemo<WorkbookDefinition>(() => {
    const formView: FormViewDefinition = {
      type: "form",
      id: "form-renderer",
      label: "表单",
      fields,
      layout: layout ?? fields.map((f) => ({ type: "field" as const, name: f.name })),
      config: {
        validateMode,
        ...(readOnly ? { readOnly: true } : {}),
        ...(submitLabel ? { submitLabel } : {}),
      },
    } as FormViewDefinition;

    return {
      kind: "workbook",
      schemaVersion: "4.1.1",
      locale,
      data,
      views: [formView],
    };
  }, [fields, layout, locale, validateMode, submitLabel, readOnly, data]);

  return (
    <div className={className}>
      <DocumentRenderer
        workbook={workbook}
        registry={plugins}
        locale={locale}
        fallbackLocale={fallbackLocale}
        initialData={data}
        onDataChange={onDataChange}
        onSubmit={onSubmit}
        activeViewId="form-renderer"
      />
    </div>
  );
}
