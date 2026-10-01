/**
 * React RuntimeProvider — wires up all runtime services from the core layer.
 * Provides locale, i18n, plugin registry, asset loader, and style resolver.
 */

import { createContext, type PropsWithChildren, useContext, useMemo } from "react";
import { AssetLoader } from "../core/assets/assetLoader";
import type { WorkbookDefinition } from "../schema/generated-types";
import { createStyleCatalogResolver } from "../styles/catalog";
import { useOptionalPluginRegistry } from "./pluginRegistryContext";
import type { WorkbookPluginRegistry } from "./registry";
import { pluginRegistry } from "./registry";

export interface WorkbookRuntimeValue {
  locale: string;
  fallbackLocale: string;
  i18n: WorkbookDefinition["i18n"] | undefined;
  hooks: WorkbookDefinition["hooks"] | undefined;
  registry: WorkbookPluginRegistry;
  assetLoader: AssetLoader;
  styleResolver: ReturnType<typeof createStyleCatalogResolver>;
}

const WorkbookRuntimeContext = createContext<WorkbookRuntimeValue | null>(null);

export interface WorkbookRuntimeProviderProps extends PropsWithChildren {
  workbook: WorkbookDefinition;
  registry?: WorkbookPluginRegistry;
  locale?: string;
  fallbackLocale?: string;
}

export function WorkbookRuntimeProvider({
  children,
  workbook,
  registry: registryProp,
  locale,
  fallbackLocale = "en-US",
}: WorkbookRuntimeProviderProps) {
  const parentRegistry = useOptionalPluginRegistry();

  // Resolution order: explicit prop > <PluginProvider> context > global singleton.
  const registry = registryProp ?? parentRegistry ?? pluginRegistry;

  const value = useMemo<WorkbookRuntimeValue>(
    () => ({
      locale: locale ?? workbook.locale ?? fallbackLocale,
      fallbackLocale,
      i18n: workbook.i18n,
      hooks: workbook.hooks,
      registry,
      assetLoader: new AssetLoader(workbook.assets ?? {}),
      styleResolver: createStyleCatalogResolver(workbook.styles, registry),
    }),
    [
      fallbackLocale,
      locale,
      registry,
      workbook.assets,
      workbook.i18n,
      workbook.locale,
      workbook.styles,
      workbook.hooks,
    ],
  );

  return <WorkbookRuntimeContext.Provider value={value}>{children}</WorkbookRuntimeContext.Provider>;
}

export function useWorkbookRuntime(): WorkbookRuntimeValue {
  const context = useContext(WorkbookRuntimeContext);
  if (context == null) {
    throw new Error("useWorkbookRuntime must be used inside <WorkbookRuntimeProvider>.");
  }
  return context;
}
