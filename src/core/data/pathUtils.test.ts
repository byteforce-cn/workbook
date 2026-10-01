/**
 * Unit tests for core/data/pathUtils — framework-agnostic path utilities.
 */

import { describe, expect, it } from "vitest";
import {
  deleteValueAtPath,
  getValueAtPath,
  hasRowWildcard,
  materializePath,
  parsePath,
  setValueAtPath,
} from "./pathUtils";

describe("parsePath", () => {
  it("parses a simple dot path", () => {
    expect(parsePath("a.b.c")).toEqual(["a", "b", "c"]);
  });

  it("parses bracket notation", () => {
    expect(parsePath("items[0].name")).toEqual(["items", 0, "name"]);
  });

  it("parses wildcard bracket", () => {
    expect(parsePath("items[*].name")).toEqual(["items", "*", "name"]);
  });

  it("parses nested brackets", () => {
    expect(parsePath("matrix[1][2]")).toEqual(["matrix", 1, 2]);
  });

  it("handles empty path", () => {
    expect(parsePath("")).toEqual([]);
  });
});

describe("hasRowWildcard", () => {
  it("detects wildcard in path", () => {
    expect(hasRowWildcard("items[*].name")).toBe(true);
  });

  it("returns false for path without wildcard", () => {
    expect(hasRowWildcard("items[0].name")).toBe(false);
  });
});

describe("materializePath", () => {
  it("materializes wildcard with row context", () => {
    expect(materializePath("items[*].name", { index: 3 })).toBe("items[3].name");
  });

  it("throws when wildcard needs row context but none provided", () => {
    expect(() => materializePath("items[*].name")).toThrow("row context");
  });

  it("returns path unchanged when no wildcard", () => {
    expect(materializePath("user.name")).toBe("user.name");
  });
});

describe("getValueAtPath", () => {
  const data = {
    user: { name: "Alice", age: 30 },
    items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    deep: { nested: { value: "found" } },
  };

  it("reads a top-level value", () => {
    expect(getValueAtPath(data, "user")).toEqual({ name: "Alice", age: 30 });
  });

  it("reads a nested value", () => {
    expect(getValueAtPath(data, "user.name")).toBe("Alice");
  });

  it("reads an array element", () => {
    expect(getValueAtPath(data, "items[0].id")).toBe(1);
  });

  it("reads with row context wildcard", () => {
    expect(getValueAtPath(data, "items[*].id", { index: 2 })).toBe(3);
  });

  it("returns undefined for missing path", () => {
    expect(getValueAtPath(data, "nonexistent.path")).toBeUndefined();
  });

  it("returns undefined when intermediate is null", () => {
    expect(getValueAtPath({ a: null }, "a.b.c")).toBeUndefined();
  });

  it("reads deeply nested value", () => {
    expect(getValueAtPath(data, "deep.nested.value")).toBe("found");
  });
});

describe("setValueAtPath", () => {
  it("sets a top-level value", () => {
    const data: Record<string, unknown> = {};
    setValueAtPath(data, "name", "Bob");
    expect(data.name).toBe("Bob");
  });

  it("sets a nested value creating intermediate objects", () => {
    const data: Record<string, unknown> = {};
    setValueAtPath(data, "user.profile.name", "Charlie");
    expect(data).toEqual({ user: { profile: { name: "Charlie" } } });
  });

  it("sets an array element", () => {
    const data: Record<string, unknown> = { items: [{ id: 1 }, { id: 2 }] };
    setValueAtPath(data, "items[0].id", 99);
    expect((data.items as Array<{ id: number }>)[0].id).toBe(99);
  });

  it("sets with row context wildcard", () => {
    const data: Record<string, unknown> = {
      items: [{ name: "a" }, { name: "b" }],
    };
    setValueAtPath(data, "items[*].name", "updated", { index: 1 });
    expect((data.items as Array<{ name: string }>)[1].name).toBe("updated");
  });

  it("creates intermediate arrays for numeric tokens", () => {
    const data: Record<string, unknown> = { items: [{ qty: 1 }] };
    setValueAtPath(data, "items[1].qty", 5);
    expect(data).toEqual({ items: [{ qty: 1 }, { qty: 5 }] });
  });

  it("creates nested arrays when all intermediate tokens are numeric", () => {
    const data: Record<string, unknown> = {};
    setValueAtPath(data, "matrix[0][1]", "x");
    expect(data).toEqual({ matrix: [[undefined, "x"]] });
  });
});

describe("deleteValueAtPath", () => {
  it("deletes a top-level value", () => {
    const data: Record<string, unknown> = { name: "Alice", age: 30 };
    deleteValueAtPath(data, "name");
    expect(data).toEqual({ age: 30 });
  });

  it("deletes a nested value", () => {
    const data: Record<string, unknown> = { user: { name: "Alice", age: 30 } };
    deleteValueAtPath(data, "user.age");
    expect(data).toEqual({ user: { name: "Alice" } });
  });

  it("removes an array element with splice semantics", () => {
    const data: Record<string, unknown> = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    deleteValueAtPath(data, "items[1]");
    expect(data).toEqual({ items: [{ id: 1 }, { id: 3 }] });
  });

  it("is a no-op for non-existent path", () => {
    const data: Record<string, unknown> = { a: 1 };
    deleteValueAtPath(data, "b.c.d");
    expect(data).toEqual({ a: 1 });
  });
});
