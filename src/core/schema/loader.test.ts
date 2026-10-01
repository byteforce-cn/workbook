/**
 * Tests for core/schema/loader — Schema Dynamic Loader.
 *
 * Covers:
 * - Loading from URL with caching strategies
 * - Request timeout handling
 * - Retry on failure
 * - Version negotiation (strict / compatible / latest)
 * - Schema validation
 * - Static definition passthrough
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSchemaCache, createSchemaLoader } from "./loader";

// ---------- helpers ----------

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function mockFetch(response: unknown, status = 200, statusText = "OK"): typeof fetch {
  return vi.fn<FetchLike>().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => response,
  } as unknown as Response) as unknown as typeof fetch;
}

function mockFetchWithDelay(response: unknown, delayMs: number): typeof fetch {
  return vi.fn<FetchLike>().mockImplementation(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            statusText: "OK",
            json: async () => response,
          } as unknown as Response);
        }, delayMs);

        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new DOMException("The operation was aborted", "AbortError");
            reject(err);
          });
        }
      }),
  ) as unknown as typeof fetch;
}

const minimalWorkbook = {
  schemaVersion: "4.1.1",
  views: [],
};

// ---------- tests ----------

describe("createSchemaLoader", () => {
  beforeEach(() => {
    clearSchemaCache("all");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- static passthrough ----

  it("returns a static WorkbookDefinition directly when source is an object", async () => {
    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: minimalWorkbook,
    });

    expect(workbook.schemaVersion).toBe("4.1.1");
    expect(workbook.views).toEqual([]);
  });

  // ---- URL loading ----

  it("loads a workbook definition from a URL", async () => {
    globalThis.fetch = mockFetch(minimalWorkbook);

    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: "https://cdn.example.com/workbook.json",
    });

    expect(workbook.schemaVersion).toBe("4.1.1");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toBe("https://cdn.example.com/workbook.json");
  });

  // ---- caching ----

  it("caches responses in memory by default", async () => {
    globalThis.fetch = mockFetch(minimalWorkbook);

    const loader = createSchemaLoader();
    await loader.load({ source: "https://cdn.example.com/wb.json" });
    await loader.load({ source: "https://cdn.example.com/wb.json" });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // second call hits cache
  });

  it("does not cache when cache is 'none'", async () => {
    globalThis.fetch = mockFetch(minimalWorkbook);

    const loader = createSchemaLoader();
    await loader.load({
      source: "https://cdn.example.com/wb.json",
      cache: "none",
    });
    await loader.load({
      source: "https://cdn.example.com/wb.json",
      cache: "none",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("clears memory cache with clearSchemaCache", async () => {
    globalThis.fetch = mockFetch(minimalWorkbook);

    const loader = createSchemaLoader();
    await loader.load({ source: "https://cdn.example.com/wb.json" });

    clearSchemaCache("memory");
    await loader.load({ source: "https://cdn.example.com/wb.json" });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  // ---- timeout ----

  it("throws on timeout", async () => {
    globalThis.fetch = mockFetchWithDelay(minimalWorkbook, 200);

    const loader = createSchemaLoader();
    await expect(
      loader.load({
        source: "https://cdn.example.com/wb.json",
        timeout: 50,
        retries: 0,
      }),
    ).rejects.toThrow(/timed out/);
  });

  it("succeeds when response arrives before timeout", async () => {
    globalThis.fetch = mockFetchWithDelay(minimalWorkbook, 50);

    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: "https://cdn.example.com/wb.json",
      timeout: 500,
    });

    expect(workbook.schemaVersion).toBe("4.1.1");
  });

  // ---- retries ----

  it("retries on failure up to the specified count", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => minimalWorkbook,
      });

    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: "https://cdn.example.com/wb.json",
      retries: 3,
    });

    expect(workbook.schemaVersion).toBe("4.1.1");
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting retries", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const loader = createSchemaLoader();
    await expect(
      loader.load({
        source: "https://cdn.example.com/wb.json",
        retries: 2,
      }),
    ).rejects.toThrow(/failed after 2 retries/i);
  });

  // ---- non-ok response ----

  it("throws on non-2xx response", async () => {
    globalThis.fetch = mockFetch({ error: "Not Found" }, 404, "Not Found");

    const loader = createSchemaLoader();
    await expect(loader.load({ source: "https://cdn.example.com/wb.json" })).rejects.toThrow(/404/);
  });

  // ---- version policy ----

  it("accepts any version under 'compatible' policy", async () => {
    globalThis.fetch = mockFetch({ ...minimalWorkbook, schemaVersion: "4.1.0" });

    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: "https://cdn.example.com/wb.json",
      versionPolicy: "compatible",
    });

    expect(workbook.schemaVersion).toBe("4.1.0");
  });

  it("accepts any version under 'latest' policy", async () => {
    globalThis.fetch = mockFetch({ ...minimalWorkbook, schemaVersion: "5.0.0" });

    const loader = createSchemaLoader();
    const workbook = await loader.load({
      source: "https://cdn.example.com/wb.json",
      versionPolicy: "latest",
    });

    expect(workbook.schemaVersion).toBe("5.0.0");
  });

  it("rejects mismatched version under 'strict' policy", async () => {
    globalThis.fetch = mockFetch({ ...minimalWorkbook, schemaVersion: "3.0.0" });

    const loader = createSchemaLoader({ supportedVersions: ["4.1.0", "4.1.1"] });
    await expect(
      loader.load({
        source: "https://cdn.example.com/wb.json",
        versionPolicy: "strict",
      }),
    ).rejects.toThrow(/unsupported schema version/i);
  });

  // ---- onSchemaChange callback ----

  it("calls onSchemaChange after successful load", async () => {
    globalThis.fetch = mockFetch(minimalWorkbook);
    const onChangeCalls: unknown[] = [];

    const loader = createSchemaLoader();
    loader.onSchemaChange((wb) => {
      onChangeCalls.push(wb);
    });

    await loader.load({ source: "https://cdn.example.com/wb.json" });
    await loader.load({ source: minimalWorkbook });

    expect(onChangeCalls).toHaveLength(2);
  });
});
