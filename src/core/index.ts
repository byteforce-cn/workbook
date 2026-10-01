/**
 * Core module barrel export.
 * Framework-agnostic pure functions — no React dependency.
 * Usable in Node.js, browser, or any JS runtime.
 */

// Assets
export { AssetLoader } from "./assets/assetLoader";
// Bind
export {
  bindAllowsRead,
  bindAllowsWrite,
  formatBoundValue,
  resolveBindValue,
} from "./bind/resolveBind";
// Condition
export { evaluateCondition } from "./condition/evaluate";
export type {
  CellEditingMode,
  DataVolumeMetrics,
  ErrorDisplay,
  FieldSpacing,
  FormRuntimeConfig,
  LogLevel,
  MeasurementPrecision,
  ObservabilityConfig,
  PageFormat,
  PageRendererEngine,
  PageRuntimeConfig,
  PartialRuntimeConfig,
  RenderingConfig,
  RuntimeConfig,
  SheetRendererEngine,
  SheetRuntimeConfig,
  SubmitBehavior,
  ValidateMode,
} from "./config/config";
// Runtime Config (behavior configuration)
export {
  DEFAULT_RUNTIME_CONFIG,
  mergeRuntimeConfig,
  resolveRenderingConfig,
} from "./config/config";
// Data
export {
  deleteValueAtPath,
  getValueAtPath,
  hasRowWildcard,
  materializePath,
  parsePath,
  setValueAtPath,
} from "./data/pathUtils";
// Dependency
export { resolveFieldState } from "./dependency/engine";
// i18n
export { resolveBuiltInText, resolveI18nText, WORKBOOK_I18N_KEYS } from "./i18n/i18n";
export type {
  FetchOptionPageRequest,
  FetchOptionPageResult,
} from "./options/fetchOptions";
// Options
export {
  clearOptionCache,
  fetchOptions,
} from "./options/fetchOptions";
export type {
  CorePluginSlots,
  EnhancedPluginRegistry,
  EnhancedRegistryOptions,
  PluginRegistry,
  PluginRegistryOptions,
  PluginSlot,
  PluginTypeMap,
  RegistrySnapshot,
  WorkbookConditionContext,
  WorkbookConditionPlugin,
  WorkbookHookContext,
  WorkbookHookPlugin,
  WorkbookOption,
  WorkbookOptionSourceContext,
  WorkbookOptionSourcePlugin,
  WorkbookValidationContext,
  WorkbookValidationPlugin,
} from "./registry/registry";
// Plugin Registry
export {
  createEnhancedRegistry,
  createPluginRegistry,
} from "./registry/registry";
// Security
export { sanitizeHtml } from "./sanitize/sanitize";
export type {
  SchemaCacheStrategy,
  SchemaChangeListener,
  SchemaLoadOptions,
  SchemaVersionPolicy,
  WorkbookDefinition,
} from "./schema/loader";
// Schema Loader (dynamic loading)
export {
  clearSchemaCache,
  createSchemaLoader,
} from "./schema/loader";
// Types
export type {
  BindDefinition,
  CellStyle,
  CharacterStyle,
  ConditionContext,
  ConditionDefinition,
  ConditionPlugin,
  CorePluginRegistry,
  DependencyDefinition,
  DependencyEffect,
  FieldDefinition,
  HookContext,
  HookPlugin,
  I18nDictionary,
  I18nResource,
  ListStyle,
  OptionSourceContext,
  OptionSourceDefinition,
  OptionSourcePlugin,
  ParagraphStyle,
  PathToken,
  ResolvedFieldState,
  StyleCatalog,
  TableStyle,
  ValidationContext,
  ValidationDefinition,
  ValidationPlugin,
  WorkbookAsset,
  WorkbookAssetMap,
  WorkbookData,
  WorkbookRowContext,
} from "./types";
// Validation
export { hasAsyncValidations, isAsyncValidation, runValidations, validateValue } from "./validation/validator";
