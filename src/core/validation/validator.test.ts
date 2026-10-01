/**
 * Unit tests for core/validation/validator.
 */

import { describe, expect, it } from "vitest";
import type { CorePluginRegistry, WorkbookData } from "../types";
import { hasAsyncValidations, isAsyncValidation, runValidations, validateValue } from "./validator";

function emptyRegistry(): CorePluginRegistry {
  return {
    condition: new Map(),
    optionSource: new Map(),
    validation: new Map(),
    hook: new Map(),
  };
}

const registry = emptyRegistry();
const data: WorkbookData = {};

describe("validateValue", () => {
  it("required passes for non-empty value", async () => {
    expect(await validateValue("hello", { type: "required", message: "Required" }, data, registry)).toBeUndefined();
  });

  it("required fails for empty string", async () => {
    expect(await validateValue("", { type: "required", message: "Required" }, data, registry)).toBe("Required");
  });

  it("required fails for null", async () => {
    expect(await validateValue(null, { type: "required", message: "Required" }, data, registry)).toBe("Required");
  });

  it("min passes when value >= min", async () => {
    expect(await validateValue(10, { type: "min", params: 5, message: "Too small" }, data, registry)).toBeUndefined();
  });

  it("min fails when value < min", async () => {
    expect(await validateValue(3, { type: "min", params: 5, message: "Too small" }, data, registry)).toBe("Too small");
  });

  it("max passes when value <= max", async () => {
    expect(await validateValue(5, { type: "max", params: 10, message: "Too large" }, data, registry)).toBeUndefined();
  });

  it("max fails when value > max", async () => {
    expect(await validateValue(15, { type: "max", params: 10, message: "Too large" }, data, registry)).toBe(
      "Too large",
    );
  });

  it("minLength checks string length", async () => {
    expect(await validateValue("hi", { type: "minLength", params: 3, message: "Too short" }, data, registry)).toBe(
      "Too short",
    );
  });

  it("maxLength passes for short enough string", async () => {
    expect(
      await validateValue("ok", { type: "maxLength", params: 5, message: "Too long" }, data, registry),
    ).toBeUndefined();
  });

  it("pattern matches regex", async () => {
    expect(
      await validateValue("abc123", { type: "pattern", params: "^[a-z]+$", message: "Invalid" }, data, registry),
    ).toBe("Invalid");
  });

  it("skips validation when condition is not met", async () => {
    expect(
      await validateValue(
        "",
        {
          type: "required",
          message: "Required",
          condition: { op: "eq", path: "mode", value: "strict" },
        },
        { mode: "loose" },
        registry,
      ),
    ).toBeUndefined();
  });

  it("custom validation uses registered plugin", async () => {
    const reg = emptyRegistry();
    reg.validation.set("custom", async (ctx: { value: unknown }) => (ctx.value === "bad" ? "Value is bad" : undefined));
    expect(await validateValue("bad", { type: "custom", message: "Bad" }, data, reg)).toBe("Value is bad");
    expect(await validateValue("good", { type: "custom", message: "Bad" }, data, reg)).toBeUndefined();
  });

  it("delegates custom validation types to the registry", async () => {
    const reg = emptyRegistry();
    reg.validation.set("company:mustStartWithA", ({ value }) =>
      typeof value === "string" && value.startsWith("A") ? undefined : "必须以 A 开头",
    );
    expect(await validateValue("Bob", { type: "company:mustStartWithA", message: "unused" }, data, reg)).toBe(
      "必须以 A 开头",
    );
  });
});

describe("runValidations", () => {
  it("returns all error messages", async () => {
    const errors = await runValidations(
      "",
      [
        { type: "required", message: "Required" },
        { type: "minLength", params: 3, message: "Min 3 chars" },
      ],
      data,
      registry,
    );
    expect(errors).toEqual(["Required", "Min 3 chars"]);
  });

  it("returns empty array when all pass", async () => {
    const errors = await runValidations("hello", [{ type: "required", message: "Required" }], data, registry);
    expect(errors).toEqual([]);
  });
});

describe("isAsyncValidation", () => {
  it("returns true when async flag is set", () => {
    expect(isAsyncValidation({ type: "required", message: "x", async: true })).toBe(true);
  });

  it("returns false when async flag is false", () => {
    expect(isAsyncValidation({ type: "required", message: "x", async: false })).toBe(false);
  });

  it("returns false when async flag is undefined", () => {
    expect(isAsyncValidation({ type: "required", message: "x" })).toBe(false);
  });
});

describe("hasAsyncValidations", () => {
  it("returns true when any validation is async", () => {
    expect(
      hasAsyncValidations([
        { type: "required", message: "x" },
        { type: "min", params: 1, message: "y", async: true },
      ]),
    ).toBe(true);
  });

  it("returns false when no validation is async", () => {
    expect(
      hasAsyncValidations([
        { type: "required", message: "x" },
        { type: "min", params: 1, message: "y" },
      ]),
    ).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasAsyncValidations([])).toBe(false);
  });
});

describe("sync vs async validation path", () => {
  it("returns sync result for sync validators", () => {
    const result = runValidations("", [{ type: "required", message: "Required" }], data, registry);
    // Should return synchronously (not a Promise) when all validators are sync
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["Required"]);
  });

  it("returns Promise for async validators", () => {
    const result = runValidations("", [{ type: "required", message: "Required", async: true }], data, registry);
    // Should return a Promise when any validator is async
    expect(result).toBeInstanceOf(Promise);
  });

  it("returns Promise for custom validators", () => {
    const reg = emptyRegistry();
    reg.validation.set("custom", () => undefined);
    const result = runValidations("test", [{ type: "custom", message: "x" }], data, reg);
    // Custom validators always go through Promise path
    expect(result).toBeInstanceOf(Promise);
  });

  it("mixes sync and async validators correctly", async () => {
    const errors = await runValidations(
      "",
      [
        { type: "required", message: "Required" },
        { type: "minLength", params: 3, message: "Min 3 chars", async: true },
      ],
      data,
      registry,
    );
    expect(errors).toContain("Required");
    expect(errors).toContain("Min 3 chars");
  });
});
