/**
 * React binding layer for @byteforce/workbook.
 * Provides React Context providers and hooks that wrap the framework-agnostic core.
 */

// Providers
export { DataProvider, useDataValue, useWorkbookData } from "./DataProvider";
export type {
  BlockErrorBoundaryProps,
  ErrorSeverity,
  FieldErrorBoundaryProps,
  WorkbookErrorBoundaryProps,
} from "./ErrorBoundary";
// Error Boundaries
export {
  BlockErrorBoundary,
  FieldErrorBoundary,
  WorkbookErrorBoundary,
} from "./ErrorBoundary";
// Hooks
// (single implementation lives in this React layer — re-exported for the React entry)
export { useWorkbookHooks } from "./hooks/useWorkbookHooks";
export {
  createPluginRegistry,
  PluginProvider,
  usePluginRegistry,
} from "./PluginProvider";
export {
  useWorkbookRuntime,
  WorkbookRuntimeProvider,
} from "./RuntimeProvider";
// Types
export type {
  WorkbookConditionContext,
  WorkbookConditionPlugin,
  WorkbookHookContext,
  WorkbookHookPlugin,
  WorkbookOption,
  WorkbookOptionSourceContext,
  WorkbookOptionSourcePlugin,
  WorkbookPluginRegistry,
  WorkbookValidationContext,
  WorkbookValidationPlugin,
} from "./types";
