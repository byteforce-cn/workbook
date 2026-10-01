/**
 * Unit tests for core/bind/resolveBind.
 */

import { describe, expect, it } from "vitest";
import { bindAllowsRead, bindAllowsWrite, formatBoundValue, resolveBindValue } from "./resolveBind";

describe("formatBoundValue", () => {
  it("returns value unchanged when no format", () => {
    expect(formatBoundValue("hello")).toBe("hello");
  });

  it("uppercases strings", () => {
    expect(formatBoundValue("hello", "upper")).toBe("HELLO");
  });

  it("lowercases strings", () => {
    expect(formatBoundValue("HELLO", "lower")).toBe("hello");
  });

  it("trims strings", () => {
    expect(formatBoundValue("  hello  ", "trim")).toBe("hello");
  });

  it("JSON stringifies objects", () => {
    expect(formatBoundValue({ a: 1 }, "json")).toBe('{"a":1}');
  });

  it("formats dates as ISO", () => {
    const d = new Date("2024-01-15T00:00:00Z");
    expect(formatBoundValue(d, "date")).toBe(d.toISOString());
  });

  it("returns null as-is", () => {
    expect(formatBoundValue(null, "upper")).toBeNull();
  });
});

describe("resolveBindValue", () => {
  const data = { user: { name: "Alice", title: null } };

  it("resolves a simple bind path", () => {
    expect(resolveBindValue({ path: "user.name" }, data)).toBe("Alice");
  });

  it("falls back to placeholder when value is null", () => {
    expect(resolveBindValue({ path: "user.title", placeholder: "Untitled" }, data)).toBe("Untitled");
  });

  it("returns undefined for missing path without placeholder", () => {
    expect(resolveBindValue({ path: "nonexistent" }, data)).toBeUndefined();
  });
});

describe("bindAllowsRead / bindAllowsWrite", () => {
  it("twoWay allows both read and write", () => {
    const bind = { path: "x", mode: "twoWay" as const };
    expect(bindAllowsRead(bind)).toBe(true);
    expect(bindAllowsWrite(bind)).toBe(true);
  });

  it("oneWay allows read only", () => {
    const bind = { path: "x", mode: "oneWay" as const };
    expect(bindAllowsRead(bind)).toBe(true);
    expect(bindAllowsWrite(bind)).toBe(false);
  });

  it("oneWayToData allows write only", () => {
    const bind = { path: "x", mode: "oneWayToData" as const };
    expect(bindAllowsRead(bind)).toBe(false);
    expect(bindAllowsWrite(bind)).toBe(true);
  });

  it("undefined bind allows neither", () => {
    expect(bindAllowsRead(undefined)).toBe(false);
    expect(bindAllowsWrite(undefined)).toBe(false);
  });
});
