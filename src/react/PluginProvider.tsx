/**
 * Scoped Plugin Registry Provider.
 * Replaces the global singleton pattern with React Context-based scoping.
 * Multiple PluginProvider instances can coexist without conflicts.
 */

import { type ComponentType, type PropsWithChildren, useContext } from "react";
import { createPluginRegistry as createCorePluginRegistry } from "../core/registry/registry";
import { PluginRegistryContext } from "./pluginRegistryContext";
import { attachPluginRegistryHelpers, type WorkbookPluginRegistryWithHelpers } from "./registry";
import type { WorkbookFieldPluginProps, WorkbookLayoutPluginProps, WorkbookPluginRegistry } from "./types";

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
export function createPluginRegistry(options: CreatePluginRegistryOptions = {}): WorkbookPluginRegistryWithHelpers {
  const { namespace } = options;

  function ns(id: string): string {
    return namespace ? `${namespace}:${id}` : id;
  }

  // Base registry (core) — carries the standard plugin slots + management API.
  const registry = createCorePluginRegistry<
    ComponentType<WorkbookFieldPluginProps>,
    ComponentType<WorkbookLayoutPluginProps>
  >();

  // Attach the documented `register*` helpers (single implementation lives in
  // ./registry so every factory returns the same surface).
  return attachPluginRegistryHelpers(registry, ns);
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
