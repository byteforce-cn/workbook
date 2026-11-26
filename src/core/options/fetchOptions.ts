/**
 * Framework-agnostic option source loader.
 * Loads options from static arrays, URLs, GraphQL endpoints, or custom plugins.
 *
 * Supports `$field` parameter binding, dependsOn/debounce, pagination metadata
 * (page/pageSize/total/hasNextPage), memory/session caching and remote
 * valueKey/labelKey mapping.
 */

import type { OptionSourceDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { getValueAtPath } from "../data/pathUtils";
import type { CorePluginSlots, WorkbookOption } from "../registry/registry";

const memoryCache = new Map<string, WorkbookOption[]>();

export interface FetchOptionPageRequest {
  page?: number;
  search?: string;
}

export interface FetchOptionPageResult {
  options: WorkbookOption[];
  page: number;
  pageSize?: number;
  total?: number;
  hasNextPage?: boolean;
}

interface DynamicOptionPagination {
  enabled: boolean;
  pageSize: number;
  totalPath: string;
  pageParam: string;
}

interface DynamicOptionSource {
  [key: string]: unknown;
  type: "url" | "graphql" | "custom";
  endpoint?: string;
  method?: "GET" | "POST";
  query?: string;
  operationName?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  dataPath?: string;
  valueKey?: string;
  labelKey?: string;
  pagination?: DynamicOptionPagination;
  dependsOn?: string[];
  fetchOnMount?: boolean;
  cache?: "none" | "memory" | "session";
  cacheKey?: string;
  searchDebounce?: number;
}

function isDynamicOptionSource(source: OptionSourceDefinition): source is DynamicOptionSource {
  return (
    !Array.isArray(source) &&
    source != null &&
    typeof source === "object" &&
    typeof (source as { type?: unknown }).type === "string"
  );
}

/** Shapes already reported, so a repeated fetch does not flood the console. */
const warnedOptionSourceShapes = new Set<string>();

/**
 * Report an unusable dynamic option source instead of silently resolving to an
 * empty option list. Repeated occurrences of the same shape warn once.
 */
function warnMalformedOptionSource(source: DynamicOptionSource, reason: string): void {
  const legacyUrl = (source as { url?: unknown }).url;
  const hint =
    typeof legacyUrl === "string" && legacyUrl !== ""
      ? `Found \`url: "${legacyUrl}"\`, which is ignored — the request URL key is \`endpoint\`.`
      : "See the Option Source Types section of the schema reference for the expected shape.";
  const key = `${source.type}:${reason}`;

  if (warnedOptionSourceShapes.has(key)) {
    return;
  }
  warnedOptionSourceShapes.add(key);

  console.warn(
    `[workbook] Invalid option source (type: "${source.type}"): ${reason}. ${hint} ` +
      "The option list will stay empty; validate the document against the workbook schema to catch this earlier.",
  );
}

function readRequestMethod(source: DynamicOptionSource): "GET" | "POST" {
  if (source.type === "graphql") {
    return source.method ?? "POST";
  }

  return source.method ?? "GET";
}

function cacheKeyForSource(source: DynamicOptionSource, resolvedParams: Record<string, unknown>): string {
  return JSON.stringify({
    type: source.type,
    endpoint: source.endpoint,
    method: readRequestMethod(source),
    query: source.query,
    operationName: source.operationName,
    params: resolvedParams,
    dataPath: source.dataPath,
    valueKey: source.valueKey,
    labelKey: source.labelKey,
    pagination: source.pagination,
    cacheKey: source.cacheKey,
  });
}

function resolveParamValue(value: unknown, data: WorkbookData, rowContext?: WorkbookRowContext): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if ("$field" in value && typeof (value as { $field?: unknown }).$field === "string") {
    return getValueAtPath(data, (value as { $field: string }).$field, rowContext);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveParamValue(entry, data, rowContext));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, resolveParamValue(nestedValue, data, rowContext)]),
  );
}

function mapOptions(records: unknown[], source: DynamicOptionSource): WorkbookOption[] {
  const valueKey = source.valueKey ?? "value";
  const labelKey = source.labelKey ?? "label";

  return records
    .filter((record) => record != null && typeof record === "object")
    .map((record) => {
      const typedRecord = record as Record<string, unknown>;
      return {
        ...typedRecord,
        value: typedRecord[valueKey],
        label: String(typedRecord[labelKey] ?? typedRecord[valueKey] ?? ""),
      };
    });
}

function resolveRequestParams(
  source: DynamicOptionSource,
  data: WorkbookData,
  rowContext: WorkbookRowContext | undefined,
  request: FetchOptionPageRequest,
): Record<string, unknown> {
  const resolvedParams = Object.fromEntries(
    Object.entries(source.params ?? {}).map(([key, value]) => [key, resolveParamValue(value, data, rowContext)]),
  );

  if (source.pagination?.enabled === true) {
    resolvedParams[source.pagination.pageParam] = request.page ?? 1;
    resolvedParams.pageSize ??= source.pagination.pageSize;
  }

  if (request.search != null && request.search !== "") {
    resolvedParams.search ??= request.search;
  }

  return resolvedParams;
}

function readTotal(payload: Record<string, unknown>, source: DynamicOptionSource): number | undefined {
  if (source.pagination?.enabled !== true) {
    return undefined;
  }

  const rawTotal = getValueAtPath(payload, source.pagination.totalPath);
  return typeof rawTotal === "number" && Number.isFinite(rawTotal) ? rawTotal : undefined;
}

function createPageResult(
  options: WorkbookOption[],
  page: number,
  pageSize?: number,
  total?: number,
): FetchOptionPageResult {
  const hasNextPage =
    pageSize == null ? undefined : total == null ? options.length >= pageSize : page * pageSize < total;

  return {
    options,
    page,
    pageSize,
    total,
    hasNextPage,
  };
}

export async function fetchOptionPage(
  source: OptionSourceDefinition | undefined,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
  signal?: AbortSignal,
  request: FetchOptionPageRequest = {},
): Promise<FetchOptionPageResult> {
  const page = request.page ?? 1;

  if (source == null) {
    return createPageResult([], page);
  }

  if (Array.isArray(source)) {
    const options = source.map((option) => ({
      ...option,
      label: option.label,
      value: option.value,
    }));
    return createPageResult(options, page, undefined, options.length);
  }

  if (!isDynamicOptionSource(source)) {
    return createPageResult([], page);
  }

  if (source.type === "custom") {
    const pluginName =
      typeof source.params?.name === "string"
        ? source.params.name
        : typeof source.params?.source === "string"
          ? source.params.source
          : undefined;

    if (pluginName == null) {
      return createPageResult([], page, source.pagination?.pageSize);
    }

    const optionSourcePlugin = registry.optionSource.get(pluginName);
    const options =
      optionSourcePlugin == null
        ? []
        : await optionSourcePlugin({ source, data, rowContext, signal, page, search: request.search });
    return createPageResult(options, page, source.pagination?.pageSize, options.length);
  }

  const resolvedParams = resolveRequestParams(source, data, rowContext, request);
  const cacheKey = cacheKeyForSource(source, resolvedParams);
  if (source.cache === "memory" && memoryCache.has(cacheKey)) {
    const options = memoryCache.get(cacheKey) ?? [];
    return createPageResult(options, page, source.pagination?.pageSize, undefined);
  }

  if (source.cache === "session" && typeof sessionStorage !== "undefined") {
    const cachedValue = sessionStorage.getItem(cacheKey);
    if (cachedValue != null) {
      const options = JSON.parse(cachedValue) as WorkbookOption[];
      return createPageResult(options, page, source.pagination?.pageSize, undefined);
    }
  }

  const method = readRequestMethod(source);
  const endpoint = source.endpoint ?? "";

  if (endpoint.trim() === "") {
    warnMalformedOptionSource(source, 'missing "endpoint"');
    // Fail fast: without an endpoint `new URL("")` would resolve to the host
    // page itself and fetch (and then fail to parse) the application HTML.
    return createPageResult([], page, source.pagination?.pageSize);
  }

  const requestInit: RequestInit = {
    method,
    headers: source.headers,
    signal,
  };

  const requestUrl = new URL(endpoint, typeof window === "undefined" ? "http://localhost" : window.location.origin);

  if (method === "GET") {
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (value != null) {
        requestUrl.searchParams.set(key, String(value));
      }
    }
  } else if (source.type === "graphql") {
    requestInit.body = JSON.stringify({
      query: source.query ?? "",
      variables: resolvedParams,
      ...(source.operationName != null ? { operationName: source.operationName } : {}),
    });
    requestInit.headers = {
      "content-type": "application/json",
      ...source.headers,
    };
  } else {
    requestInit.body = JSON.stringify(resolvedParams);
    requestInit.headers = {
      "content-type": "application/json",
      ...source.headers,
    };
  }

  const response = await fetch(requestUrl.toString(), requestInit);
  if (!response.ok) {
    throw new Error(
      `Option source fetch failed: ${response.status} ${response.statusText} for ${requestUrl.toString()}`,
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const records = source.dataPath == null ? payload : getValueAtPath(payload, source.dataPath);

  const options = Array.isArray(records) ? mapOptions(records, source) : [];
  const total = readTotal(payload, source);

  if (source.cache === "memory") {
    memoryCache.set(cacheKey, options);
  }

  if (source.cache === "session" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(cacheKey, JSON.stringify(options));
  }

  return createPageResult(options, page, source.pagination?.pageSize, total);
}

export async function fetchOptions(
  source: OptionSourceDefinition | undefined,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
  signal?: AbortSignal,
  request: FetchOptionPageRequest = {},
): Promise<WorkbookOption[]> {
  return (await fetchOptionPage(source, data, registry, rowContext, signal, request)).options;
}

/**
 * Target entries for invalidation: a business `cacheKey` declared on the
 * option source, or a prefix of it.
 */
export type OptionCacheInvalidation = string | { key?: string; prefix?: string };

function matchesInvalidation(cacheKey: string, invalidation: OptionCacheInvalidation | undefined): boolean {
  if (invalidation == null) {
    return true;
  }

  let sourceKey: unknown;
  try {
    sourceKey = (JSON.parse(cacheKey) as { cacheKey?: unknown }).cacheKey;
  } catch {
    sourceKey = undefined;
  }

  if (typeof invalidation === "string") {
    return sourceKey === invalidation;
  }

  if (invalidation.key != null) {
    return sourceKey === invalidation.key;
  }

  if (invalidation.prefix != null) {
    return typeof sourceKey === "string" && sourceKey.startsWith(invalidation.prefix);
  }

  return true;
}

/**
 * Clear cached option data.
 *
 * - `scope`: `"memory"` (default when a filter is supplied), `"session"`,
 *   or `"all"` (memory + sessionStorage).
 * - `invalidation`: a `cacheKey` declared on the option source, or
 *   `{ key }` / `{ prefix }`. Without it every entry in scope is cleared.
 *
 * Returns the number of entries removed so hosts can assert that a business
 * key actually existed.
 *
 * @example
 * clearOptionCache("all", { key: "departments" });
 */
export function clearOptionCache(scope?: "memory" | "session" | "all", invalidation?: OptionCacheInvalidation): number {
  const resolvedScope = scope ?? (invalidation == null ? "all" : "memory");
  let removed = 0;

  if (resolvedScope === "all" || resolvedScope === "memory") {
    for (const cacheKey of [...memoryCache.keys()]) {
      if (matchesInvalidation(cacheKey, invalidation)) {
        memoryCache.delete(cacheKey);
        removed += 1;
      }
    }
  }

  if ((resolvedScope === "all" || resolvedScope === "session") && typeof sessionStorage !== "undefined") {
    try {
      if (invalidation == null) {
        sessionStorage.clear();
      } else {
        for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = sessionStorage.key(index);
          if (key != null && matchesInvalidation(key, invalidation)) {
            sessionStorage.removeItem(key);
            removed += 1;
          }
        }
      }
    } catch {
      // sessionStorage may not be available or may be blocked by policy
    }
  }

  return removed;
}
