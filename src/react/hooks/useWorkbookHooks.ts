/**
 * React hook for workbook lifecycle hook execution.
 * Wraps the core condition evaluation and hook dispatch.
 */

import { useCallback, useMemo, useRef } from "react";

import { evaluateCondition } from "../../core/condition/evaluate";
import type { WorkbookData, WorkbookHookDefinition } from "../../core/types";
import type { WorkbookPluginRegistry } from "../registry";

export type WorkbookHookTrigger = WorkbookHookDefinition["trigger"];

export interface RunWorkbookHooksOptions {
  hooks?: WorkbookHookDefinition[];
  trigger: WorkbookHookTrigger;
  data: WorkbookData;
  registry: WorkbookPluginRegistry;
  signal?: AbortSignal;
  dispatch?: (eventName: string, payload?: unknown) => void;
}

async function executeSingleHook(
  hook: WorkbookHookDefinition,
  data: WorkbookData,
  registry: WorkbookPluginRegistry,
  signal?: AbortSignal,
  dispatch?: (eventName: string, payload?: unknown) => void,
): Promise<void> {
  if (hook.condition != null && !evaluateCondition(hook.condition, data, registry)) {
    return;
  }

  if (hook.type === "api") {
    const endpoint =
      typeof hook.config?.endpoint === "string"
        ? hook.config.endpoint
        : typeof hook.config?.url === "string"
          ? hook.config.url
          : undefined;
    if (endpoint == null) return;

    await fetch(endpoint, {
      method: typeof hook.config?.method === "string" ? hook.config.method : "POST",
      headers: typeof hook.config?.headers === "object" ? (hook.config.headers as HeadersInit) : undefined,
      body: JSON.stringify({ data, config: hook.config }),
      signal,
    });
    return;
  }

  if (hook.type === "dispatch") {
    const eventName =
      typeof hook.config?.event === "string"
        ? hook.config.event
        : typeof hook.config?.name === "string"
          ? hook.config.name
          : undefined;
    if (eventName != null) {
      dispatch?.(eventName, hook.config?.payload);
    }
    return;
  }

  const handlerName =
    typeof hook.config?.name === "string"
      ? hook.config.name
      : typeof hook.config?.handler === "string"
        ? hook.config.handler
        : undefined;

  if (handlerName == null) return;

  const handler = registry.hook.get(handlerName);
  if (handler == null) return;

  await handler({ hook, data, signal, dispatch });
}

export async function runWorkbookHooks(options: RunWorkbookHooksOptions): Promise<void> {
  for (const hook of options.hooks ?? []) {
    if (hook.trigger !== options.trigger) continue;
    await executeSingleHook(hook, options.data, options.registry, options.signal, options.dispatch);
  }
}

export function useWorkbookHooks(
  registry: WorkbookPluginRegistry,
  hooks: WorkbookHookDefinition[] | undefined,
  data: WorkbookData,
) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const runTrigger = useCallback(
    async (trigger: WorkbookHookTrigger, dispatch?: (eventName: string, payload?: unknown) => void) => {
      for (const hook of hooks ?? []) {
        if (hook.trigger !== trigger) continue;

        const task = () => executeSingleHook(hook, data, registry, undefined, dispatch);

        if (hook.debounce == null || hook.debounce <= 0) {
          await task();
          continue;
        }

        const timerKey = `${trigger}:${hook.description ?? hook.type ?? "hook"}`;
        const existingTimer = timersRef.current.get(timerKey);
        if (existingTimer != null) {
          globalThis.clearTimeout(existingTimer);
        }

        await new Promise<void>((resolve) => {
          const timerId = globalThis.setTimeout(async () => {
            timersRef.current.delete(timerKey);
            await task();
            resolve();
          }, hook.debounce);
          timersRef.current.set(timerKey, timerId);
        });
      }
    },
    [data, hooks, registry],
  );

  return useMemo(() => ({ runTrigger }), [runTrigger]);
}
