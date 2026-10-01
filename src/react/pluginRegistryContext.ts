/**
 * Scoped plugin registry context — single source of truth for registry scoping.
 *
 * Defined in the React binding layer so that every consumer (main-entry
 * `DocumentRenderer`, react-native renderers, plugin providers) resolves
 * the registry through the same context. `PluginProvider` writes into this
 * context; providers read from it as an optional fallback (explicit
 * `registry` prop always wins).
 */

import { createContext, useContext } from "react";

import type { WorkbookPluginRegistry } from "./registry";

export const PluginRegistryContext = createContext<WorkbookPluginRegistry | null>(null);

/**
 * Returns the current scoped plugin registry, or `null` when the component is
 * rendered outside a `<PluginProvider>`. Never throws.
 */
export function useOptionalPluginRegistry(): WorkbookPluginRegistry | null {
  return useContext(PluginRegistryContext);
}
