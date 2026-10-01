/**
 * Schema Dynamic Loader for @byteforce/workbook.
 *
 * Provides runtime loading of workbook definitions from remote URLs,
 * with caching, timeout, retry, and version negotiation support.
 *
 * Design: framework-agnostic (zero React dependency).
 */

// ---- Types ----

/** Supported caching strategies for schema loading */
export type SchemaCacheStrategy = "none" | "memory" | "session" | "local";

/** Version compatibility policy */
export type SchemaVersionPolicy = "strict" | "compatible" | "latest";

/** Options for loading a workbook schema */
export interface SchemaLoadOptions {
  /** Remote URL or a static workbook definition object */
  source: string | WorkbookDefinition;
  /** Caching strategy (default: "memory") */
  cache?: SchemaCacheStrategy;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 0) */
  retries?: number;
  /** Schema version compatibility policy (default: "compatible") */
  versionPolicy?: SchemaVersionPolicy;
}

/** A minimal workbook definition (matches the shape the runtime expects) */
export interface WorkbookDefinition {
  schemaVersion?: string;
  [key: string]: unknown;
}

/** Callback invoked when a schema is successfully loaded or reloaded */
export type SchemaChangeListener = (workbook: WorkbookDefinition) => void;

// ---- Cache ----

const memoryCache = new Map<string, { data: WorkbookDefinition; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5-minute memory cache TTL

/**
 * Clear schema cache entries.
 * @param scope - which cache layer(s) to clear
 */
export function clearSchemaCache(scope: "memory" | "all" = "all"): void {
  if (scope === "memory" || scope === "all") {
    memoryCache.clear();
  }
  // session/local would be added later for browser persistence
}

// ---- Loader ----

export interface SchemaLoaderOptions {
  /** Supported schema versions for strict version checking */
  supportedVersions?: string[];
}

/**
 * Create a schema loader instance.
 * Each instance maintains its own cache and listener set.
 */
export function createSchemaLoader(loaderOptions: SchemaLoaderOptions = {}) {
  const { supportedVersions = ["4.1.0", "4.1.1"] } = loaderOptions;

  const listeners = new Set<SchemaChangeListener>();

  function notifyListeners(workbook: WorkbookDefinition): void {
    for (const listener of listeners) {
      try {
        listener(workbook);
      } catch {
        // Swallow listener errors — don't break the loading pipeline
      }
    }
  }

  function checkVersion(workbook: WorkbookDefinition, policy: SchemaVersionPolicy): void {
    const version = workbook.schemaVersion;
    if (!version) return; // No version field = skip check

    if (policy === "strict") {
      if (!supportedVersions.includes(version)) {
        throw new Error(
          `Unsupported schema version "${version}". ` +
            `Supported: ${supportedVersions.join(", ")}. ` +
            `Use versionPolicy: "compatible" or "latest" to bypass this check.`,
        );
      }
    }
    // "compatible" and "latest" accept any version
  }

  function isAbortError(err: unknown): boolean {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    if (err instanceof Error && err.name === "AbortError") return true;
    return false;
  }

  async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } catch (err) {
      if (isAbortError(err)) {
        throw new Error(`Schema load timed out after ${timeoutMs}ms: ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchWithRetry(url: string, timeoutMs: number, retries: number): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, timeoutMs);
        if (!response.ok) {
          throw new Error(`Schema load failed with status ${response.status} ${response.statusText}: ${url}`);
        }
        return response;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          // Simple backoff: 200ms * (attempt + 1)
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Schema load failed after ${retries} retries: ${url}. ` + `Last error: ${(lastError as Error).message}`,
    );
  }

  async function loadFromUrl(url: string, options: SchemaLoadOptions): Promise<WorkbookDefinition> {
    const timeout = options.timeout ?? 10_000;
    const retries = options.retries ?? 0;
    const cache = options.cache ?? "memory";

    // Check memory cache
    if (cache !== "none") {
      const cached = memoryCache.get(url);
      if (cached && Date.now() - cached.ts < TTL_MS) {
        return cached.data;
      }
    }

    const response = await fetchWithRetry(url, timeout, retries);
    const data: WorkbookDefinition = await response.json();

    // Store in cache
    if (cache !== "none") {
      memoryCache.set(url, { data, ts: Date.now() });
    }

    return data;
  }

  return {
    /**
     * Load a workbook definition from a URL or a static object.
     */
    async load(options: SchemaLoadOptions): Promise<WorkbookDefinition> {
      const { source, versionPolicy = "compatible" } = options;

      let workbook: WorkbookDefinition;

      if (typeof source === "string") {
        workbook = await loadFromUrl(source, options);
      } else {
        workbook = source;
      }

      checkVersion(workbook, versionPolicy);
      notifyListeners(workbook);

      return workbook;
    },

    /**
     * Register a listener for schema change events.
     * Returns an unsubscribe function.
     */
    onSchemaChange(listener: SchemaChangeListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /**
     * Preload and cache a schema without returning it.
     * Useful for warming the cache before rendering.
     */
    async preload(source: string, options?: SchemaLoadOptions): Promise<void> {
      await loadFromUrl(source, options ?? { source });
    },

    /**
     * Get the list of supported versions (for version negotiation UI).
     */
    getSupportedVersions(): string[] {
      return [...supportedVersions];
    },
  };
}
