/**
 * Scoped Plugin Registry Provider.
 * Replaces the global singleton pattern with React Context-based scoping.
 * Multiple PluginProvider instances can coexist without conflicts.
 */

import { type ComponentType, type PropsWithChildren, useContext } from "react";
import { createPluginRegistry as createCorePluginRegistry } from "../core/registry/registry";
import { PluginRegistryContext } from "./pluginRegistryContext";
import type {
  WorkbookConditionPlugin,
  WorkbookFieldPluginProps,
  WorkbookHookPlugin,
  WorkbookLayoutPluginProps,
  WorkbookOptionSourcePlugin,
  WorkbookPluginRegistry,
  WorkbookValidationPlugin,
} from "./types";

// Re-export the shared core hook (single source of truth for registry scoping).
export { useOptionalPluginRegistry } from "./pluginRegistryContext";

export interface CreatePluginRegistryOptions {
  /** Namespace for isolation (prepended to plugin IDs) */
  namespace?: string;
  /** Enable error boundary for plugin errors */
  errorBoundary?: boolean;
  /** Enable dev tools logging */
  devTools?: boolean;
}

/**
 * Create a new scoped plugin registry (no global singleton).
 * Each call returns an independent registry instance.
 */
export function createPluginRegistry(options: CreatePluginRegistryOptions = {}): WorkbookPluginRegistry {
  const { namespace } = options;

  function ns(id: string): string {
    return namespace ? `${namespace}:${id}` : id;
  }

  // Base registry (core) — carries the standard plugin slots + management API.
  const registry = createCorePluginRegistry<
    ComponentType<WorkbookFieldPluginProps>,
    ComponentType<WorkbookLayoutPluginProps>
  >();

  // Attach helper methods (convenience wrappers kept for compatibility).
  return Object.assign(registry, {
    registerCondition(id: string, plugin: WorkbookConditionPlugin): void {
      registry.condition.set(ns(id), plugin);
    },
    registerOptionSource(id: string, plugin: WorkbookOptionSourcePlugin): void {
      registry.optionSource.set(ns(id), plugin);
    },
    registerField(id: string, component: ComponentType<WorkbookFieldPluginProps>): void {
      registry.field.set(ns(id), component);
    },
    registerLayout(id: string, component: ComponentType<WorkbookLayoutPluginProps>): void {
      registry.layout.set(ns(id), component);
    },
    registerValidation(id: string, plugin: WorkbookValidationPlugin): void {
      registry.validation.set(ns(id), plugin);
    },
    registerHook(id: string, plugin: WorkbookHookPlugin): void {
      registry.hook.set(ns(id), plugin);
    },
  });
}

export interface PluginProviderProps extends PropsWithChildren {
  registry: WorkbookPluginRegistry;
}

/**
 * Provider that injects a scoped plugin registry into the React tree.
 * Nested PluginProviders can override the registry for subtree isolation.
 */
export function PluginProvider({ children, registry }: PluginProviderProps) {
  return <PluginRegistryContext.Provider value={registry}>{children}</PluginRegistryContext.Provider>;
}

/**
 * Hook to access the current scoped plugin registry.
 * Throws if used outside a PluginProvider.
 */
export function usePluginRegistry(): WorkbookPluginRegistry {
  const context = useContext(PluginRegistryContext);
  if (context == null) {
    throw new Error("usePluginRegistry must be used inside <PluginProvider>.");
  }
  return context;
}
