/**
 * Runtime Behavior Configuration for @byteforce/workbook.
 *
 * Provides config-driven control over rendering behavior,
 * validation strategy, auto-save, observability, and rendering
 * strategy selection based on data volume.
 *
 * Design: framework-agnostic (zero React dependency).
 */

// ---- Types ----

/** Validation trigger mode */
export type ValidateMode = "onSubmit" | "onBlur" | "onChange" | "onMount";

/** Error display strategy */
export type ErrorDisplay = "inline" | "tooltip" | "both";

/** Form submit behavior */
export type SubmitBehavior = "preventDefault" | "allowDefault";

/** Field spacing preset */
export type FieldSpacing = "compact" | "normal" | "relaxed";

/** Page renderer engine */
export type PageRendererEngine = "svg" | "svg-plain";

/** Measurement precision for page layout */
export type MeasurementPrecision = "normal" | "high";

/** Page format */
export type PageFormat = "A4" | "A3" | "Letter" | "Legal";

/** Sheet renderer engine */
export type SheetRendererEngine = "canvas" | "html-table";

/** Sheet cell editing mode */
export type CellEditingMode = "none" | "inline" | "modal";

/** Log level for observability */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/** Form-specific runtime configuration */
export interface FormRuntimeConfig {
  /** When to trigger validation */
  validateMode: ValidateMode;
  /** Auto-save settings */
  autoSave: {
    enabled: boolean;
    /** Debounce delay in milliseconds */
    debounce: number;
  };
  /** How to display validation errors */
  errorDisplay: ErrorDisplay;
  /** Form submit behavior */
  submitBehavior: SubmitBehavior;
  /** Spacing between fields */
  fieldSpacing: FieldSpacing;
}

/** Page-specific runtime configuration */
export interface PageRuntimeConfig {
  /** Rendering engine */
  renderer: PageRendererEngine;
  /** Measurement precision */
  measurementPrecision: MeasurementPrecision;
  /** Enable orphan line control */
  orphanControl: boolean;
  /** Enable widow line control */
  widowControl: boolean;
  /** Repeat table header across page breaks */
  repeatTableHeader: boolean;
  /** Default page format */
  defaultPageFormat: PageFormat;
}

/** Sheet-specific runtime configuration */
export interface SheetRuntimeConfig {
  /** Rendering engine */
  renderer: SheetRendererEngine;
  /** Row count threshold for virtual scrolling */
  virtualScrollThreshold: number;
  /** Default column width in pixels */
  defaultColumnWidth: number;
  /** Cell editing mode (currently read-only) */
  cellEditing: CellEditingMode;
}

/** Observability configuration */
export interface ObservabilityConfig {
  /** Minimum log level */
  logLevel: LogLevel;
  /** Enable performance timing marks (User Timing API) */
  performanceMarks: boolean;
  /** Error reporting endpoint (optional) */
  errorReportingEndpoint?: string;
}

/** Top-level runtime configuration */
export interface RuntimeConfig {
  form: FormRuntimeConfig;
  page: PageRuntimeConfig;
  sheet: SheetRuntimeConfig;
  observability: ObservabilityConfig;
}

/** Partial config for user overrides — all fields at all levels are optional */
export type PartialRuntimeConfig = {
  form?: Partial<FormRuntimeConfig> & {
    autoSave?: Partial<FormRuntimeConfig["autoSave"]>;
  };
  page?: Partial<PageRuntimeConfig>;
  sheet?: Partial<SheetRuntimeConfig>;
  observability?: Partial<ObservabilityConfig>;
};

/** Metrics about the data being rendered, used for strategy selection */
export interface DataVolumeMetrics {
  /** Number of form fields */
  fieldCount: number;
  /** Number of document pages */
  pageCount: number;
  /** Number of sheet rows */
  rowCount: number;
}

/** Resolved rendering strategy with computed flags */
export interface RenderingConfig {
  form: {
    virtualized: boolean;
  };
  page: {
    lazyRender: boolean;
  };
  sheet: {
    renderer: SheetRendererEngine;
  };
}

// ---- Defaults ----

/** Sensible default runtime configuration */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  form: {
    validateMode: "onSubmit",
    autoSave: {
      enabled: false,
      debounce: 1000,
    },
    errorDisplay: "inline",
    submitBehavior: "preventDefault",
    fieldSpacing: "normal",
  },
  page: {
    renderer: "svg",
    measurementPrecision: "normal",
    orphanControl: false,
    widowControl: false,
    repeatTableHeader: false,
    defaultPageFormat: "A4",
  },
  sheet: {
    renderer: "canvas",
    virtualScrollThreshold: 500,
    defaultColumnWidth: 100,
    cellEditing: "none",
  },
  observability: {
    logLevel: "error",
    performanceMarks: false,
  },
};

// ---- Config Merging ----

/**
 * Deep merge user overrides into the default runtime config.
 * Returns a new object — does not mutate inputs.
 */
export function mergeRuntimeConfig(overrides: PartialRuntimeConfig): RuntimeConfig {
  const merged = structuredClone(DEFAULT_RUNTIME_CONFIG);

  if (overrides.form) {
    merged.form = {
      ...merged.form,
      ...overrides.form,
      autoSave: {
        ...merged.form.autoSave,
        ...(overrides.form.autoSave ?? {}),
      },
    };
  }

  if (overrides.page) {
    merged.page = { ...merged.page, ...overrides.page };
  }

  if (overrides.sheet) {
    merged.sheet = { ...merged.sheet, ...overrides.sheet };
  }

  if (overrides.observability) {
    merged.observability = { ...merged.observability, ...overrides.observability };
  }

  return merged;
}

// ---- Rendering Strategy ----

/**
 * Compute rendering strategy flags based on data volume metrics.
 * This is a heuristic engine that can be tuned over time.
 */
export function resolveRenderingConfig(config: RuntimeConfig, metrics: DataVolumeMetrics): RenderingConfig {
  const { fieldCount, pageCount } = metrics;

  return {
    form: {
      /** Enable virtual scrolling when field count exceeds 50 */
      virtualized: fieldCount > 50,
    },
    page: {
      /** Enable lazy (per-page) rendering when page count exceeds 5 */
      lazyRender: pageCount > 5,
    },
    sheet: {
      /** Canvas is the default; HTML table is a planned degraded mode */
      renderer: config.sheet.renderer,
    },
  };
}
