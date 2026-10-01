/**
 * Unit tests for core/dependency/engine.
 */

import { describe, expect, it } from "vitest";
import type { CorePluginRegistry, FieldDefinition, WorkbookData } from "../types";
import { resolveFieldState } from "./engine";

function emptyRegistry(): CorePluginRegistry {
  return {
    condition: new Map(),
    optionSource: new Map(),
    validation: new Map(),
    hook: new Map(),
  };
}

const registry = emptyRegistry();

describe("resolveFieldState", () => {
  const simpleField: FieldDefinition = {
    name: "email",
    type: "string",
    label: "Email",
  };

  it("returns default visible/required/disabled for a field with no dependencies", () => {
    const state = resolveFieldState(simpleField, {}, registry);
    expect(state.visible).toBe(true);
    expect(state.required).toBe(false);
    expect(state.disabled).toBe(false);
  });

  it("merges effect when condition matches", () => {
    const field: FieldDefinition = {
      ...simpleField,
      dependencies: [
        {
          targetField: "email",
          condition: { op: "eq", path: "mode", value: "advanced" },
          effect: { visible: true, required: true },
          otherwise: { visible: false },
        },
      ],
    };
    const data: WorkbookData = { mode: "advanced" };
    const state = resolveFieldState(field, data, registry);
    expect(state.visible).toBe(true);
    expect(state.required).toBe(true);
  });

  it("merges otherwise when condition does not match", () => {
    const field: FieldDefinition = {
      ...simpleField,
      dependencies: [
        {
          targetField: "email",
          condition: { op: "eq", path: "mode", value: "advanced" },
          effect: { visible: true },
          otherwise: { visible: false, disabled: true },
        },
      ],
    };
    const data: WorkbookData = { mode: "basic" };
    const state = resolveFieldState(field, data, registry);
    expect(state.visible).toBe(false);
    expect(state.disabled).toBe(true);
  });

  it("respects field-level disabled", () => {
    const field: FieldDefinition = { ...simpleField, disabled: true };
    const state = resolveFieldState(field, {}, registry);
    expect(state.disabled).toBe(true);
  });

  it("preserves field validations", () => {
    const field: FieldDefinition = {
      ...simpleField,
      validations: [{ type: "required", message: "Required" }],
    };
    const state = resolveFieldState(field, {}, registry);
    expect(state.validations).toHaveLength(1);
    expect(state.validations[0].type).toBe("required");
  });

  it("applies multiple dependencies in order", () => {
    const field: FieldDefinition = {
      ...simpleField,
      dependencies: [
        {
          targetField: "email",
          condition: { op: "eq", path: "a", value: true },
          effect: { visible: false },
        },
        {
          targetField: "email",
          condition: { op: "eq", path: "b", value: true },
          effect: { visible: true },
        },
      ],
    };
    // First dep hides it, second dep shows it again
    const state = resolveFieldState(field, { a: true, b: true }, registry);
    expect(state.visible).toBe(true);
  });
});
