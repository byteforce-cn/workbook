/**
 * Unit tests for core/options/fetchOptions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CorePluginSlots } from "../registry/registry";
import { createPluginRegistry } from "../registry/registry";
import type { WorkbookData } from "../types";
import { clearOptionCache, fetchOptionPage, fetchOptions } from "./fetchOptions";

function emptyRegistry(): CorePluginSlots {
  return {
    condition: new Map(),
    optionSource: new Map(),
    validation: new Map(),
    hook: new Map(),
  };
}

function createJsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

beforeEach(() => {
  clearOptionCache("all");
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("fetchOptions", () => {
  it("returns static array options directly", async () => {
    const result = await fetchOptions(
      [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ],
      {},
      emptyRegistry(),
    );
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Option A");
  });

  it("resolves $field parameters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createJsonResponse([{ id: 1, name: "Dept A" }]));

    const data: WorkbookData = { companyId: "c123" };
    const result = await fetchOptions(
      {
        type: "url",
        endpoint: "https://api.example.com/depts",
        method: "GET",
        params: { companyId: { $field: "companyId" } },
        valueKey: "id",
        labelKey: "name",
      },
      data,
      emptyRegistry(),
    );

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toContain("companyId=c123");
    expect(result[0].label).toBe("Dept A");
  });

  it("uses custom option source plugin", async () => {
    const reg = emptyRegistry();
    reg.optionSource.set("myLoader", async () => [{ value: 1, label: "Custom" }]);

    const result = await fetchOptions({ type: "custom", params: { name: "myLoader" } }, {}, reg);
    expect(result[0].label).toBe("Custom");
  });

  it("returns empty options for unregistered custom source", async () => {
    const result = await fetchOptions({ type: "custom", params: { name: "nonexistent" } }, {}, emptyRegistry());
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(
      fetchOptions({ type: "url", endpoint: "https://api.example.com/fail", method: "GET" }, {}, emptyRegistry()),
    ).rejects.toThrow("Option source fetch failed");
  });

  it("extracts options using valueKey/labelKey", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createJsonResponse([{ code: "US", title: "United States" }]));

    const result = await fetchOptions(
      {
        type: "url",
        endpoint: "https://api.example.com/countries",
        method: "GET",
        valueKey: "code",
        labelKey: "title",
      },
      {},
      emptyRegistry(),
    );

    expect(result[0]).toMatchObject({
      value: "US",
      label: "United States",
    });
  });
});

describe("fetchOptions remote sources", () => {
  it("resolves nested $field params for url sources, maps remote records, and reuses memory cache when unrelated data changes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      createJsonResponse({
        payload: {
          records: [{ id: "sh", name: "上海站" }],
        },
      }),
    );

    const registry = createPluginRegistry();
    const source = {
      type: "url",
      endpoint: "https://workbook.example/api/cities",
      method: "POST",
      cache: "memory",
      params: {
        context: {
          region: { $field: "region" },
        },
        paging: {
          size: 20,
        },
      },
      dataPath: "payload.records",
      valueKey: "id",
      labelKey: "name",
    } as const;

    const firstData = { region: "east", remarks: "alpha" };
    const secondData = { region: "east", remarks: "beta" };

    const first = await fetchOptions(source, firstData, registry);
    const second = await fetchOptions(source, secondData, registry);

    expect(first).toEqual([{ id: "sh", name: "上海站", value: "sh", label: "上海站" }]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      context: { region: "east" },
      paging: { size: 20 },
    });
  });

  it("sends GraphQL query with variables, maps nested response data, and reuses session cache", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      createJsonResponse({
        data: {
          assignees: {
            nodes: [{ code: "u1", displayName: "张三" }],
          },
        },
      }),
    );

    const registry = createPluginRegistry();
    const source = {
      type: "graphql",
      endpoint: "https://workbook.example/graphql",
      query: "query Assignees($mode: String!) { assignees(mode: $mode) { nodes { code displayName } } }",
      cache: "session",
      params: {
        mode: { $field: "delivery.mode" },
      },
      dataPath: "data.assignees.nodes",
      valueKey: "code",
      labelKey: "displayName",
    } as const;

    const first = await fetchOptions(source, { delivery: { mode: "standard" }, remark: "one" }, registry);
    const second = await fetchOptions(source, { delivery: { mode: "standard" }, remark: "two" }, registry);

    expect(first).toEqual([{ code: "u1", displayName: "张三", value: "u1", label: "张三" }]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe("https://workbook.example/graphql");
    expect(requestInit?.method).toBe("POST");
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      query: "query Assignees($mode: String!) { assignees(mode: $mode) { nodes { code displayName } } }",
      variables: { mode: "standard" },
    });
  });

  it("adds pagination params and reports total page state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      createJsonResponse({
        payload: {
          total: 21,
          records: [{ id: "a1", name: "第一页数据" }],
        },
      }),
    );

    const registry = createPluginRegistry();
    const source = {
      type: "url",
      endpoint: "https://workbook.example/api/paged-options",
      method: "POST",
      params: {
        region: { $field: "region" },
      },
      pagination: {
        enabled: true,
        pageSize: 10,
        totalPath: "payload.total",
        pageParam: "page",
      },
      dataPath: "payload.records",
      valueKey: "id",
      labelKey: "name",
    } as const;

    const page = await fetchOptionPage(source, { region: "east" }, registry, undefined, undefined, { page: 2 });

    expect(page).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 21,
      hasNextPage: true,
      options: [{ id: "a1", name: "第一页数据", value: "a1", label: "第一页数据" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      region: "east",
      page: 2,
      pageSize: 10,
    });
  });
});
