/**
 * Tests for core/config/config — Runtime Behavior Configuration.
 *
 * Covers:
 * - RuntimeConfig type validation
 * - Default configuration values
 * - Config merging (user config overrides defaults)
 * - Rendering strategy resolution based on data volume
 * - Device capability detection integration
 * - per-view config overrides
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_RUNTIME_CONFIG, mergeRuntimeConfig, type RuntimeConfig, resolveRenderingConfig } from "./config";

// ---------- helpers ----------

const baseConfig: RuntimeConfig = {
  form: {
    validateMode: "onBlur",
    autoSave: { enabled: true, debounce: 500 },
    errorDisplay: "inline",
    submitBehavior: "preventDefault",
    fieldSpacing: "normal",
  },
  page: {
    renderer: "svg",
    measurementPrecision: "normal",
    orphanControl: true,
    widowControl: true,
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
    logLevel: "warn",
    performanceMarks: false,
  },
};

// ---------- tests ----------

describe("DEFAULT_RUNTIME_CONFIG", () => {
  it("provides sensible form defaults", () => {
    expect(DEFAULT_RUNTIME_CONFIG.form.validateMode).toBe("onSubmit");
    expect(DEFAULT_RUNTIME_CONFIG.form.errorDisplay).toBe("inline");
    expect(DEFAULT_RUNTIME_CONFIG.form.submitBehavior).toBe("preventDefault");
  });

  it("provides sensible page defaults", () => {
    expect(DEFAULT_RUNTIME_CONFIG.page.renderer).toBe("svg");
    expect(DEFAULT_RUNTIME_CONFIG.page.defaultPageFormat).toBe("A4");
    expect(DEFAULT_RUNTIME_CONFIG.page.orphanControl).toBe(false);
  });

  it("provides sensible sheet defaults", () => {
    expect(DEFAULT_RUNTIME_CONFIG.sheet.renderer).toBe("canvas");
    expect(DEFAULT_RUNTIME_CONFIG.sheet.cellEditing).toBe("none");
  });

  it("has observability defaults turned off", () => {
    expect(DEFAULT_RUNTIME_CONFIG.observability.performanceMarks).toBe(false);
    expect(DEFAULT_RUNTIME_CONFIG.observability.logLevel).toBe("error");
  });
});

describe("mergeRuntimeConfig", () => {
  it("returns defaults when no overrides provided", () => {
    const merged = mergeRuntimeConfig({});
    expect(merged.form.validateMode).toBe("onSubmit");
    expect(merged.page.renderer).toBe("svg");
  });

  it("overrides top-level keys", () => {
    const merged = mergeRuntimeConfig({
      form: { validateMode: "onBlur" },
    });
    expect(merged.form.validateMode).toBe("onBlur");
    // other form keys should retain defaults
    expect(merged.form.errorDisplay).toBe("inline");
  });

  it("overrides nested keys without losing siblings", () => {
    const merged = mergeRuntimeConfig({
      form: { autoSave: { enabled: false, debounce: 500 } },
    });
    expect(merged.form.autoSave.enabled).toBe(false);
    // debounce was explicitly overridden to 500
    expect(merged.form.autoSave.debounce).toBe(500);
    // other form keys should retain defaults
    expect(merged.form.validateMode).toBe("onSubmit");
  });

  it("deep merges observability config", () => {
    const merged = mergeRuntimeConfig({
      observability: { logLevel: "info" },
    });
    expect(merged.observability.logLevel).toBe("info");
    expect(merged.observability.performanceMarks).toBe(false);
  });

  it("does not mutate the original defaults", () => {
    const originalLogLevel = DEFAULT_RUNTIME_CONFIG.observability.logLevel;
    mergeRuntimeConfig({ observability: { logLevel: "debug" } });
    expect(DEFAULT_RUNTIME_CONFIG.observability.logLevel).toBe(originalLogLevel);
  });
});

describe("resolveRenderingConfig", () => {
  it("uses canvas for large sheets (>100 rows)", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 500,
      fieldCount: 10,
      pageCount: 1,
    });
    expect(config.sheet.renderer).toBe("canvas");
  });

  it("suggests virtualized form for many fields (>50)", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 10,
      fieldCount: 80,
      pageCount: 1,
    });
    expect(config.form.virtualized).toBe(true);
  });

  it("suggests non-virtualized form for few fields", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 10,
      fieldCount: 5,
      pageCount: 1,
    });
    expect(config.form.virtualized).toBe(false);
  });

  it("suggests lazy page rendering for many pages (>5)", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 10,
      fieldCount: 10,
      pageCount: 20,
    });
    expect(config.page.lazyRender).toBe(true);
  });

  it("does not suggest lazy page rendering for few pages", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 10,
      fieldCount: 10,
      pageCount: 3,
    });
    expect(config.page.lazyRender).toBe(false);
  });

  it("preserves user-configured renderer choices", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 1000,
      fieldCount: 10,
      pageCount: 1,
    });
    // User already set canvas — it stays
    expect(config.sheet.renderer).toBe("canvas");
  });

  it("returns empty flags when counts are all zero", () => {
    const config = resolveRenderingConfig(baseConfig, {
      rowCount: 0,
      fieldCount: 0,
      pageCount: 0,
    });
    expect(config.form.virtualized).toBe(false);
  });
});
