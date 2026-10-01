/**
 * Framework-agnostic core types for @byteforce/workbook.
 *
 * Canonical domain model derived from the JSON schema, plus the pure helper
 * types that have no schema counterpart.
 */

import type { ComponentType, ReactNode } from "react";

import type { Condition, WorkbookDefinition } from "../schema/generated-types";

// ---- Canonical domain types (derived from the JSON schema) ----

export type { WorkbookDefinition } from "../schema/generated-types";

export type WorkbookData = Record<string, unknown>;

export interface WorkbookRowContext {
  index: number;
  path?: string;
  item?: unknown;
}

export type WorkbookViewDefinition = WorkbookDefinition["views"][number];
export type FormViewDefinition = Extract<WorkbookViewDefinition, { type: "form" }>;
export type PageViewDefinition = Extract<WorkbookViewDefinition, { type: "page" }>;
export type SheetViewDefinition = Extract<WorkbookViewDefinition, { type: "sheet" }>;
export type FormBlockDefinition = NonNullable<SheetViewDefinition["forms"]>[number];
export type FieldDefinition = FormViewDefinition["fields"][number];
export type LayoutNodeDefinition = NonNullable<FormViewDefinition["layout"]>[number];

/**
 * 解析布局节点在 `row`（多栏）布局中的相对跨列数（span）。
 * - 仅 `field` 节点携带 `layoutField.span`（schema 已定义，`minimum: 1`）；
 * - 其余节点（group / row / tabs / steps / conditional / repeat / html / custom）固定为 1；
 * - 缺省（span 未声明）按 1 处理 → 全 span:1 时 row 保持等宽渲染（向后兼容）；
 * - 防御性下限 1：兼容旧数据/历史生成（如 SimpleForm grid 在 >12 字段时
 *   `Math.floor(12 / n)` 会产出 0），避免产生 `repeat(0, …)` 等非法栅格。
 */
export function resolveLayoutSpan(node: LayoutNodeDefinition): number {
  return node.type === "field" ? Math.max(node.span ?? 1, 1) : 1;
}

export type ValidationDefinition = NonNullable<FieldDefinition["validations"]>[number];
export type DependencyDefinition = NonNullable<FieldDefinition["dependencies"]>[number];
export type OptionSourceDefinition = Exclude<FieldDefinition["options"], undefined>;
export type BindDefinition = Exclude<FieldDefinition["bind"], undefined>;
export type WorkbookHookDefinition = NonNullable<WorkbookDefinition["hooks"]>[number];
export type WorkbookAssetMap = NonNullable<WorkbookDefinition["assets"]>;
export type WorkbookStyleCatalog = NonNullable<WorkbookDefinition["styles"]>;
export type WorkbookPrintConfig = NonNullable<WorkbookDefinition["printConfig"]>;
export type PageBlockDefinition = PageViewDefinition["content"][number];
export type SheetColumnDefinition = SheetViewDefinition["columns"][number];
export type SheetRowDefinition = NonNullable<SheetViewDefinition["rows"]>[number];
export type SheetCellDefinition = NonNullable<SheetRowDefinition["cells"]>[number];
export type WorkbookConditionDefinition = Condition;
export type WorkbookI18n = NonNullable<WorkbookDefinition["i18n"]>;

/** Public convenience alias for the schema `Condition` type. */
export type ConditionDefinition = WorkbookConditionDefinition;

/** Resolved per-field runtime state after applying dependency effects. */
export interface ResolvedFieldState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
  options?: OptionSourceDefinition;
  validations: ValidationDefinition[];
  props: Record<string, unknown>;
  defaultValue?: unknown;
}

export interface WorkbookFieldPluginProps {
  field: FieldDefinition;
  fieldPath: string;
  value: unknown;
  errors: string[];
  disabled?: boolean;
  rowContext?: WorkbookRowContext;
  onChange(nextValue: unknown): void;
  onBlur(): void;
}

export interface WorkbookLayoutPluginProps {
  node: LayoutNodeDefinition;
  rowContext?: WorkbookRowContext;
  children?: ReactNode;
}

export type WorkbookFieldPluginComponent = ComponentType<WorkbookFieldPluginProps>;
export type WorkbookLayoutPluginComponent = ComponentType<WorkbookLayoutPluginProps>;

// ---- Canonical style types (single source: JSON schema) ----

export type {
  CellStyle,
  CharacterStyle,
  ListStyle,
  ParagraphStyle,
  StyleCatalog,
  TableStyle,
} from "../schema/generated-types";

// ---- Plugin registry ----
// Registry types live in `./registry/registry` (framework-agnostic core).

export type {
  CorePluginSlots as CorePluginRegistry,
  WorkbookConditionContext as ConditionContext,
  WorkbookConditionPlugin as ConditionPlugin,
  WorkbookHookContext as HookContext,
  WorkbookHookPlugin as HookPlugin,
  WorkbookOption,
  WorkbookOptionSourceContext as OptionSourceContext,
  WorkbookOptionSourcePlugin as OptionSourcePlugin,
  WorkbookValidationContext as ValidationContext,
  WorkbookValidationPlugin as ValidationPlugin,
} from "./registry/registry";

// ---- Core-only helper types ----

// ---- Path ----

export type PathToken = string | number | "*";

// ---- Dependency effect (convenience alias of the schema inline shape) ----

export interface DependencyEffect {
  visible?: boolean;
  required?: boolean;
  disabled?: boolean;
  options?: OptionSourceDefinition;
  validations?: ValidationDefinition[];
  props?: Record<string, unknown>;
  defaultValue?: unknown;
}

// ---- i18n ----

export type I18nDictionary = Record<string, string | undefined>;

export type I18nResource = Record<string, I18nDictionary | undefined> | undefined;

// ---- Assets ----

export interface WorkbookAsset {
  src?: string;
  type?: string;
}
