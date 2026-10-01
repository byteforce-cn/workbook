/**
 * @byteforce/workbook/react-native — React Native 渲染适配层
 *
 * Schema 100% 可移植、core 运行时零 DOM 直接复用、插件契约天然兼容 RN。
 * 本入口只新增「视图渲染器」这一层（form 原生渲染），不重写 schema 或引擎。
 *
 * 使用（业务侧）：
 * ```tsx
 * import {
 *   RNWorkbookForm,
 *   WorkbookRuntimeProvider,
 *   DataProvider,
 *   createPluginRegistry,
 * } from "@byteforce/workbook/react-native";
 *
 * const registry = createPluginRegistry();
 * registry.field.set("approval-panel", ApprovalPanelRN);
 *
 * <RNWorkbookForm workbook={workbook} registry={registry} onSubmit={save} />
 * ```
 *
 * 已实现：form 视图（10 字段类型 + 9 布局节点，html 降级忽略）、
 *          page 视图（分页文档，复用 Web 布局引擎 layoutPageView + RN 原生块渲染）。
 * 规划中：sheet（台账简化表格，page 内嵌入式台账已以只读简化表格渲染）。
 */

import { Text } from "react-native";
import type { FormViewDefinition, WorkbookData } from "../core/types";
import { DataProvider } from "../react/DataProvider";
import { WorkbookRuntimeProvider } from "../react/RuntimeProvider";
import type { WorkbookPluginRegistry } from "../react/registry";
import { pluginRegistry } from "../react/registry";
import type { WorkbookDefinition } from "../schema/generated-types";
import { RNFormView } from "./RNFormView";

export type {
  BindDefinition,
  DependencyDefinition,
  FieldDefinition,
  FormViewDefinition,
  LayoutNodeDefinition,
  OptionSourceDefinition,
  PageViewDefinition,
  ValidationDefinition,
  WorkbookConditionDefinition,
  WorkbookData,
  WorkbookFieldPluginProps,
  WorkbookLayoutPluginProps,
  WorkbookRowContext,
} from "../core/types";
// 复用 React Context / 插件注册表（与 Web 同契约）
export { DataProvider, useDataValue, useWorkbookData } from "../react/DataProvider";
export { useWorkbookRuntime, WorkbookRuntimeProvider } from "../react/RuntimeProvider";
export type { WorkbookOption, WorkbookPluginRegistry } from "../react/registry";
export { createPluginRegistry, pluginRegistry } from "../react/registry";
// 复用 schema 校验（AJV，Hermes 可运行）
export { validateWorkbookDocument } from "../schema";
// ---- 类型 ----
export type { WorkbookDefinition } from "../schema/generated-types";
export type { RNBlockRendererProps } from "./RNBlockRenderer";
export { RNBlockRenderer } from "./RNBlockRenderer";
export { RNFieldFactory } from "./RNFieldFactory";
export { RNFormView } from "./RNFormView";
export { RNLayoutRenderer } from "./RNLayoutRenderer";
export { RNPageView } from "./RNPageView";
export { RNWorkbookDocument } from "./RNWorkbookDocument";

/**
 * 便捷封装：WorkbookRuntimeProvider + DataProvider + RNFormView。
 * 自动选择 form 视图（activeViewId 优先，否则取首个 form 视图）。
 */
export interface RNWorkbookFormProps {
  workbook: WorkbookDefinition;
  registry?: WorkbookPluginRegistry;
  locale?: string;
  fallbackLocale?: string;
  /** 指定渲染的 form 视图 id；缺省取首个 form 视图 */
  activeViewId?: string;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}

export function RNWorkbookForm({
  workbook,
  registry,
  locale,
  fallbackLocale,
  activeViewId,
  onSubmit,
}: RNWorkbookFormProps) {
  const formView = workbook.views.find(
    (view): view is FormViewDefinition => view.type === "form" && (activeViewId == null || view.id === activeViewId),
  );

  return (
    <WorkbookRuntimeProvider
      workbook={workbook}
      registry={registry ?? pluginRegistry}
      locale={locale}
      fallbackLocale={fallbackLocale}
    >
      <DataProvider initialData={workbook.data}>
        {formView != null ? (
          <RNFormView view={formView} onSubmit={onSubmit} />
        ) : (
          <Text>当前 workbook 不包含 form 视图（RN 渲染器已实现：form；page/sheet 规划中）</Text>
        )}
      </DataProvider>
    </WorkbookRuntimeProvider>
  );
}
