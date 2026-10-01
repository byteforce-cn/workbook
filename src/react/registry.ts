/**
 * React binding layer for the plugin registry.
 *
 * The implementation lives in `src/core/registry/registry.ts` (framework
 * agnostic). This module re-exports it and specializes the `field` /
 * `layout` plugin slots with React component types, plus a shared default
 * registry instance used by the React renderers.
 */

import type { ComponentType } from "react";

import type { PluginRegistry } from "../core/registry/registry";
import { createPluginRegistry as createCorePluginRegistry } from "../core/registry/registry";
import type { WorkbookFieldPluginProps, WorkbookLayoutPluginProps } from "../core/types";

export * from "../core/registry/registry";

export type WorkbookPluginRegistry = PluginRegistry<
  ComponentType<WorkbookFieldPluginProps>,
  ComponentType<WorkbookLayoutPluginProps>
>;

export function createPluginRegistry(): WorkbookPluginRegistry {
  return createCorePluginRegistry<ComponentType<WorkbookFieldPluginProps>, ComponentType<WorkbookLayoutPluginProps>>();
}

/** Shared registry instance used by the React renderers by default. */
export const pluginRegistry: WorkbookPluginRegistry = createPluginRegistry();
