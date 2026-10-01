/**
 * Plugin registry for @byteforce/workbook.
 *
 * Framework-agnostic core: pure plugin slots (condition / optionSource /
 * validation / hook) plus scoped management (register / replace / batch /
 * namespace / snapshot & restore).
 *
 * The React layer adds typed `field` / `layout` component slots — see
 * `src/react/registry.ts` for the React-specialized registry.
 */

import type {
  OptionSourceDefinition,
  ValidationDefinition,
  WorkbookConditionDefinition,
  WorkbookData,
  WorkbookHookDefinition,
  WorkbookRowContext,
} from "../../core/types";

// ---- Option type ----

/** A workbook option (select / multiselect). */
export interface WorkbookOption {
  value: unknown;
  label: string;
  disabled?: boolean;
  group?: string;
  [key: string]: unknown;
}

// ---- Plugin contexts ----

export interface WorkbookConditionContext {
  condition: WorkbookConditionDefinition;
  data: WorkbookData;
  rowContext?: WorkbookRowContext;
}

export interface WorkbookOptionSourceContext {
  source: OptionSourceDefinition;
  data: WorkbookData;
  rowContext?: WorkbookRowContext;
  signal?: AbortSignal;
  page?: number;
  search?: string;
}

export interface WorkbookValidationContext {
  validation: ValidationDefinition;
  value: unknown;
  data: WorkbookData;
  rowContext?: WorkbookRowContext;
}

export interface WorkbookHookContext {
  hook: WorkbookHookDefinition;
  data: WorkbookData;
  signal?: AbortSignal;
  dispatch?: (eventName: string, payload?: unknown) => void;
}

// ---- Plugin function types ----

export type WorkbookConditionPlugin = (context: WorkbookConditionContext) => boolean;
export type WorkbookOptionSourcePlugin = (context: WorkbookOptionSourceContext) => Promise<WorkbookOption[]>;
export type WorkbookValidationPlugin = (
  context: WorkbookValidationContext,
) => string | undefined | Promise<string | undefined>;
export type WorkbookHookPlugin = (context: WorkbookHookContext) => unknown | Promise<unknown>;

/** Generic plugin type — union of all pure plugin signatures. */
export type AnyPlugin =
  | WorkbookConditionPlugin
  | WorkbookOptionSourcePlugin
  | WorkbookValidationPlugin
  | WorkbookHookPlugin;

/** Pure plugin slot identifiers. */
export type PluginSlot = "condition" | "optionSource" | "validation" | "hook";

/** Map of plugin slot to plugin type. */
export interface PluginTypeMap {
  condition: WorkbookConditionPlugin;
  optionSource: WorkbookOptionSourcePlugin;
  validation: WorkbookValidationPlugin;
  hook: WorkbookHookPlugin;
}

// ---- Registry types ----

/** The four framework-agnostic plugin slots. */
export interface CorePluginSlots {
  condition: Map<string, WorkbookConditionPlugin>;
  optionSource: Map<string, WorkbookOptionSourcePlugin>;
  validation: Map<string, WorkbookValidationPlugin>;
  hook: Map<string, WorkbookHookPlugin>;
}

/** Serializable snapshot of registry state. */
export interface RegistrySnapshot {
  condition: Record<string, WorkbookConditionPlugin>;
  optionSource: Record<string, WorkbookOptionSourcePlugin>;
  validation: Record<string, WorkbookValidationPlugin>;
  hook: Record<string, WorkbookHookPlugin>;
}

export interface PluginRegistryOptions {
  /** Namespace for plugin ID isolation. */
  namespace?: string;
}

/**
 * Scoped plugin registry.
 *
 * `FieldPlugin` / `LayoutPlugin` stay generic so this module has zero React
 * dependency; the React layer specializes them with component types.
 */
export interface PluginRegistry<FieldPlugin = unknown, LayoutPlugin = unknown> extends CorePluginSlots {
  field: Map<string, FieldPlugin>;
  layout: Map<string, LayoutPlugin>;

  /**
   * Register a plugin in a given slot.
   * @param slot - plugin category
   * @param id - unique plugin ID (will be namespaced if a namespace is set)
   * @param plugin - plugin function
   */
  register<K extends PluginSlot>(slot: K, id: string, plugin: PluginTypeMap[K]): void;

  /**
   * Hot-replace a plugin. Returns the previously registered plugin (if any).
   * If no plugin was previously registered under this ID, sets the new one and returns undefined.
   */
  replace<K extends PluginSlot>(slot: K, id: string, plugin: PluginTypeMap[K]): PluginTypeMap[K] | undefined;

  /** Register multiple pure-slot plugins at once. */
  registerBatch(batch: {
    condition?: Record<string, WorkbookConditionPlugin>;
    optionSource?: Record<string, WorkbookOptionSourcePlugin>;
    validation?: Record<string, WorkbookValidationPlugin>;
    hook?: Record<string, WorkbookHookPlugin>;
  }): void;

  /**
   * Unregister a plugin by slot and ID.
   * @returns true if the plugin existed and was removed
   */
  unregister(slot: PluginSlot, id: string): boolean;

  /** List all registered plugin IDs for a given slot. */
  list(slot: PluginSlot): string[];

  /** Clear plugins in a given slot, or all pure slots. */
  clear(slot: PluginSlot | "all"): void;

  /** Create a snapshot of the current pure-slot registry state (independent copy). */
  snapshot(): RegistrySnapshot;

  /** Restore registry state from a previous snapshot (replaces all pure slots). */
  restore(snapshot: RegistrySnapshot): void;
}

// ---- Factory ----

/**
 * Create a scoped plugin registry.
 * Each call returns an independent instance.
 */
export function createPluginRegistry<FieldPlugin = unknown, LayoutPlugin = unknown>(
  options: PluginRegistryOptions = {},
): PluginRegistry<FieldPlugin, LayoutPlugin> {
  const { namespace } = options;

  /** Apply namespace prefix to plugin IDs. */
  function ns(id: string): string {
    return namespace ? `${namespace}:${id}` : id;
  }

  const registry: PluginRegistry<FieldPlugin, LayoutPlugin> = {
    condition: new Map(),
    optionSource: new Map(),
    validation: new Map(),
    hook: new Map(),
    field: new Map(),
    layout: new Map(),

    register(slot, id, plugin) {
      const key = ns(id);
      (registry[slot] as Map<string, unknown>).set(key, plugin);
    },

    replace(slot, id, plugin) {
      const key = ns(id);
      const old = registry[slot].get(key) as PluginTypeMap[typeof slot] | undefined;
      (registry[slot] as Map<string, unknown>).set(key, plugin);
      return old;
    },

    registerBatch(batch) {
      if (batch.condition) {
        for (const [id, plugin] of Object.entries(batch.condition)) {
          registry.condition.set(ns(id), plugin);
        }
      }
      if (batch.optionSource) {
        for (const [id, plugin] of Object.entries(batch.optionSource)) {
          registry.optionSource.set(ns(id), plugin);
        }
      }
      if (batch.validation) {
        for (const [id, plugin] of Object.entries(batch.validation)) {
          registry.validation.set(ns(id), plugin);
        }
      }
      if (batch.hook) {
        for (const [id, plugin] of Object.entries(batch.hook)) {
          registry.hook.set(ns(id), plugin);
        }
      }
    },

    unregister(slot, id) {
      const key = ns(id);
      return registry[slot].delete(key);
    },

    list(slot) {
      return Array.from(registry[slot].keys());
    },

    clear(slot) {
      if (slot === "all") {
        registry.condition.clear();
        registry.optionSource.clear();
        registry.validation.clear();
        registry.hook.clear();
      } else {
        registry[slot].clear();
      }
    },

    snapshot() {
      return {
        condition: Object.fromEntries(registry.condition),
        optionSource: Object.fromEntries(registry.optionSource),
        validation: Object.fromEntries(registry.validation),
        hook: Object.fromEntries(registry.hook),
      };
    },

    restore(snapshot) {
      registry.condition = new Map(Object.entries(snapshot.condition));
      registry.optionSource = new Map(Object.entries(snapshot.optionSource));
      registry.validation = new Map(Object.entries(snapshot.validation));
      registry.hook = new Map(Object.entries(snapshot.hook));
    },
  };

  return registry;
}

// ---- Compatibility aliases (pre-1.0 internal API) ----

export type EnhancedRegistryOptions = PluginRegistryOptions;
export type EnhancedPluginRegistry = PluginRegistry;
export const createEnhancedRegistry = createPluginRegistry;
