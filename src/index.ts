/**
 * @byteforce/workbook — Public API (main entry)
 *
 * Stable, semver-protected exports for the React entry point: the
 * DocumentRenderer, low-level views, device wrappers, print/PDF helpers, and
 * the React runtime (providers / hooks / plugin registry).
 *
 * The surface is intentionally aligned with the documented API in `docs-site/`:
 *   - @byteforce/workbook/core          — framework-agnostic pure functions
 *   - @byteforce/workbook/react         — React binding layer
 *   - @byteforce/workbook/quick         — zero-config SimpleForm
 *   - @byteforce/workbook/adapters/zod  — optional Zod validation adapter
 */

// ---- Core Re-exports (stable, documented) ----
export { evaluateCondition } from "./core/condition/evaluate";
// ---- Security ----
export { sanitizeHtml } from "./core/sanitize/sanitize";
// ---- Public Types ----
export type {
  // Bind
  BindDefinition,
  // Dependency
  DependencyDefinition,
  // Field
  FieldDefinition,
  // Block Definitions
  FormBlockDefinition,
  FormViewDefinition,
  // Layout
  LayoutNodeDefinition,
  // Option Source
  OptionSourceDefinition,
  PageBlockDefinition,
  PageViewDefinition,
  SheetCellDefinition,
  // Sheet
  SheetColumnDefinition,
  SheetRowDefinition,
  SheetViewDefinition,
  // Validation
  ValidationDefinition,
  // Assets & Styles
  WorkbookAssetMap as AssetMap,
  // Condition
  WorkbookConditionDefinition as ConditionDefinition,
  // Data
  WorkbookData,
  WorkbookDefinition,
  // Plugin Component Types
  WorkbookFieldPluginComponent as FieldPluginComponent,
  WorkbookFieldPluginProps as FieldPluginProps,
  // Hooks
  WorkbookHookDefinition as HookDefinition,
  WorkbookLayoutPluginComponent as LayoutPluginComponent,
  WorkbookLayoutPluginProps as LayoutPluginProps,
  // Export
  WorkbookPrintConfig as PrintConfig,
  WorkbookRowContext,
  WorkbookStyleCatalog as StyleCatalog,
  // View Definitions
  WorkbookViewDefinition as ViewDefinition,
} from "./core/types";
// ---- Main Component ----
export { DocumentRenderer } from "./DocumentRenderer";
export {
  DeviceProvider,
  useDevice as useWorkbookDevice,
} from "./device/DeviceContext";
export { detectDeviceFromWidth } from "./device/detectDevice";
// ---- Multi-device (desktop / tablet / mobile) ----
export {
  DesktopRenderer,
  MobileRenderer,
  ResponsiveRenderer,
  TabletRenderer,
} from "./device/ResponsiveRenderer";
export type {
  DeviceBreakpoints,
  DeviceContextValue,
  DeviceMode,
  DeviceType,
} from "./device/types";
export type {
  CreateWorkbookPdfOptions,
  ExportWorkbookPdfOptions,
  PdfFontEntry,
  PdfFontLoader,
  WorkbookPdfResult,
} from "./export/pdf";
export {
  createFetchFontLoader,
  createWorkbookPdfFromLayouts,
  createWorkbookPdfFromPageView,
  exportWorkbookPdf,
  preloadPdfAssets,
} from "./export/pdf";
// ---- Export (print & PDF) ----
export {
  collectWorkbookPrintablePages,
  createWorkbookPrintHtml,
  createWorkbookPrintHtmlFromElement,
  createWorkbookPrintStyles,
  printWorkbookElement,
} from "./export/print";
// ---- React Runtime (Context + Hooks) ----
export { DataProvider, useDataValue, useWorkbookData } from "./react/DataProvider";
export { useWorkbookHooks } from "./react/hooks/useWorkbookHooks";
// ---- Re-export from react binding layer (convenience) ----
export {
  PluginProvider,
  usePluginRegistry,
} from "./react/PluginProvider";
export { useWorkbookRuntime, WorkbookRuntimeProvider } from "./react/RuntimeProvider";
// ---- Plugin Registry ----
export { createPluginRegistry, pluginRegistry } from "./react/registry";
// ---- Rendering Views (low-level, for custom composition) ----
export { FormView as WorkbookFormView } from "./renderers/form/FormView";
export { PageView as WorkbookPageView } from "./renderers/page/PageView";
export { SheetView as WorkbookSheetView } from "./renderers/sheet/SheetView";
export type { WorkbookValidationResult } from "./schema";
// ---- Schema ----
export {
  getWorkbookValidator,
  validateWorkbookDocument,
  workbookSchemaJson,
} from "./schema";
export { workbookSupportMatrix } from "./schema/support-matrix";
// ---- Styles ----
export { applyConditionalStyle } from "./styles/applyConditionalStyle";
