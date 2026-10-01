/**
 * Unit tests for core/condition/evaluate.
 */

import { describe, expect, it } from "vitest";
import type { WorkbookConditionDefinition } from "../../core/types";
import type { CorePluginRegistry, WorkbookData } from "../types";
import { evaluateCondition } from "./evaluate";

function emptyRegistry(): CorePluginRegistry {
  return {
    condition: new Map(),
    optionSource: new Map(),
    validation: new Map(),
    hook: new Map(),
  };
}

const registry = emptyRegistry();
const data: WorkbookData = {
  user: { name: "Alice", age: 30, role: "admin", active: true },
  items: ["apple", "banana", "cherry"],
  emptyStr: "",
  emptyArr: [],
  emptyObj: {},
  nullVal: null,
};

function evalOp(op: WorkbookConditionDefinition["op"], path: string, value?: unknown): boolean {
  return evaluateCondition({ op, path, value }, data, registry);
}

describe("evaluateCondition", () => {
  describe("eq", () => {
    it("matches equal values", () => {
      expect(evalOp("eq", "user.name", "Alice")).toBe(true);
    });
    it("rejects different values", () => {
      expect(evalOp("eq", "user.name", "Bob")).toBe(false);
    });
  });

  describe("neq", () => {
    it("rejects equal values", () => {
      expect(evalOp("neq", "user.name", "Alice")).toBe(false);
    });
    it("matches different values", () => {
      expect(evalOp("neq", "user.name", "Bob")).toBe(true);
    });
  });

  describe("gt / gte / lt / lte", () => {
    it("gt compares numbers", () => {
      expect(evalOp("gt", "user.age", 25)).toBe(true);
      expect(evalOp("gt", "user.age", 30)).toBe(false);
    });
    it("gte compares numbers", () => {
      expect(evalOp("gte", "user.age", 30)).toBe(true);
    });
    it("lt compares numbers", () => {
      expect(evalOp("lt", "user.age", 40)).toBe(true);
    });
    it("lte compares numbers", () => {
      expect(evalOp("lte", "user.age", 30)).toBe(true);
    });
  });

  describe("in", () => {
    it("checks if value is in array", () => {
      expect(evalOp("in", "user.name", ["Alice", "Bob"])).toBe(true);
    });
    it("returns false when not in array", () => {
      expect(evalOp("in", "user.name", ["Charlie"])).toBe(false);
    });
    it("returns false when value is not an array", () => {
      expect(evalOp("in", "user.name", "not-an-array")).toBe(false);
    });
  });

  describe("contains", () => {
    it("checks if array contains value", () => {
      expect(evalOp("contains", "items", "banana")).toBe(true);
    });
    it("returns false when array does not contain value", () => {
      expect(evalOp("contains", "items", "grape")).toBe(false);
    });
    it("checks if string contains substring", () => {
      expect(evalOp("contains", "user.name", "Ali")).toBe(true);
    });
  });

  describe("isEmpty", () => {
    it("detects empty string", () => {
      expect(evalOp("isEmpty", "emptyStr")).toBe(true);
    });
    it("detects empty array", () => {
      expect(evalOp("isEmpty", "emptyArr")).toBe(true);
    });
    it("detects empty object", () => {
      expect(evalOp("isEmpty", "emptyObj")).toBe(true);
    });
    it("detects null", () => {
      expect(evalOp("isEmpty", "nullVal")).toBe(true);
    });
    it("returns false for non-empty value", () => {
      expect(evalOp("isEmpty", "user.name")).toBe(false);
    });
  });

  describe("and", () => {
    it("all conditions must be true", () => {
      expect(
        evaluateCondition(
          {
            op: "and",
            conditions: [
              { op: "eq", path: "user.name", value: "Alice" },
              { op: "gt", path: "user.age", value: 25 },
            ],
          },
          data,
          registry,
        ),
      ).toBe(true);
    });
    it("returns false if any condition is false", () => {
      expect(
        evaluateCondition(
          {
            op: "and",
            conditions: [
              { op: "eq", path: "user.name", value: "Alice" },
              { op: "gt", path: "user.age", value: 100 },
            ],
          },
          data,
          registry,
        ),
      ).toBe(false);
    });
  });

  describe("or", () => {
    it("returns true if any condition is true", () => {
      expect(
        evaluateCondition(
          {
            op: "or",
            conditions: [
              { op: "eq", path: "user.name", value: "Bob" },
              { op: "gt", path: "user.age", value: 25 },
            ],
          },
          data,
          registry,
        ),
      ).toBe(true);
    });
    it("returns false if all conditions are false", () => {
      expect(
        evaluateCondition(
          {
            op: "or",
            conditions: [
              { op: "eq", path: "user.name", value: "Bob" },
              { op: "gt", path: "user.age", value: 100 },
            ],
          },
          data,
          registry,
        ),
      ).toBe(false);
    });
  });

  describe("not", () => {
    it("inverts a true condition", () => {
      expect(
        evaluateCondition({ op: "not", condition: { op: "eq", path: "user.name", value: "Alice" } }, data, registry),
      ).toBe(false);
    });
    it("inverts a false condition", () => {
      expect(
        evaluateCondition({ op: "not", condition: { op: "eq", path: "user.name", value: "Bob" } }, data, registry),
      ).toBe(true);
    });
  });

  describe("custom", () => {
    it("uses registered custom condition evaluator", () => {
      const reg = emptyRegistry();
      reg.condition.set("isAdmin", (ctx) => (ctx.data.user as { role?: string } | undefined)?.role === "admin");
      expect(evaluateCondition({ op: "custom", name: "isAdmin" }, data, reg)).toBe(true);
    });
    it("returns false for unregistered custom condition", () => {
      expect(evaluateCondition({ op: "custom", name: "unknown" }, data, registry)).toBe(false);
    });
  });
});
