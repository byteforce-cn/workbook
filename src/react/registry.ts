/**
 * React binding layer for the plugin registry.
 *
 * The implementation lives in `src/core/registry/registry.ts` (framework
 * agnostic). This module re-exports it and specializes the `field` /
 * `layout` plugin slots with React component types, plus a shared default
 * registry instance used by the React renderers.
 */

import type { ComponentType } from "react";

import {
  createPluginRegistry as createCorePluginRegistry,
  type PluginRegistry,
  type WorkbookConditionPlugin,
  type WorkbookHookPlugin,
  type WorkbookOptionSourcePlugin,
  type WorkbookValidationPlugin,
} from "../core/registry/registry";
import type { WorkbookFieldPluginProps, WorkbookLayoutPluginProps } from "../core/types";

export * from "../core/registry/registry";

export type WorkbookPluginRegistry = PluginRegistry<
  ComponentType<WorkbookFieldPluginProps>,
  ComponentType<WorkbookLayoutPluginProps>
>;

/**
 * Convenience registration methods, one per plugin slot.
 *
 * These wrap the underlying `Map` slots so callers get ID namespacing and
 * `Map.set` semantics without reaching into the maps directly. They are part
 * of the documented plugin API (`docs-site/api/plugin-system.md`) and are
 * attached to every registry returned by a `createPluginRegistry` factory.
 */
export interface PluginRegistryHelpers {
  registerField(id: string, component: ComponentType<WorkbookFieldPluginProps>): void;
  registerLayout(id: string, component: ComponentType<WorkbookLayoutPluginProps>): void;
  registerCondition(id: string, plugin: WorkbookConditionPlugin): void;
  registerOptionSource(id: string, plugin: WorkbookOptionSourcePlugin): void;
  registerValidation(id: string, plugin: WorkbookValidationPlugin): void;
  registerHook(id: string, plugin: WorkbookHookPlugin): void;
}

/** A React registry including the documented `register*` helper methods. */
export type WorkbookPluginRegistryWithHelpers = WorkbookPluginRegistry & PluginRegistryHelpers;

/**
 * Attach the `register*` helpers to a registry, applying the same ID
 * namespacing as the underlying registry's `register(slot, id, plugin)`.
 */
export function attachPluginRegistryHelpers(
  registry: WorkbookPluginRegistry,
  ns: (id: string) => string = (id) => id,
): WorkbookPluginRegistryWithHelpers {
  return Object.assign(registry, {
    registerField(id: string, component: ComponentType<WorkbookFieldPluginProps>): void {
      registry.field.set(ns(id), component);
    },
    registerLayout(id: string, component: ComponentType<WorkbookLayoutPluginProps>): void {
      registry.layout.set(ns(id), component);
    },
    registerCondition(id: string, plugin: WorkbookConditionPlugin): void {
      registry.condition.set(ns(id), plugin);
    },
    registerOptionSource(id: string, plugin: WorkbookOptionSourcePlugin): void {
      registry.optionSource.set(ns(id), plugin);
    },
    registerValidation(id: string, plugin: WorkbookValidationPlugin): void {
      registry.validation.set(ns(id), plugin);
    },
    registerHook(id: string, plugin: WorkbookHookPlugin): void {
      registry.hook.set(ns(id), plugin);
    },
  });
}

export interface CreateWorkbookPluginRegistryOptions {
  /** Namespace prepended to every plugin ID registered through this registry. */
  namespace?: string;
}

export function createPluginRegistry(
  options: CreateWorkbookPluginRegistryOptions = {},
): WorkbookPluginRegistryWithHelpers {
  const { namespace } = options;
  const registry = createCorePluginRegistry<
    ComponentType<WorkbookFieldPluginProps>,
    ComponentType<WorkbookLayoutPluginProps>
  >();

  return attachPluginRegistryHelpers(registry, namespace ? (id) => `${namespace}:${id}` : undefined);
}

/** Shared registry instance used by the React renderers by default. */
export const pluginRegistry: WorkbookPluginRegistryWithHelpers = createPluginRegistry();
