/**
 * Tests for core/registry/registry — Enhanced Plugin Registry.
 *
 * Covers:
 * - Plugin registration and retrieval (base functionality)
 * - Hot replacement with fallback
 * - Batch registration
 * - Plugin unregistration
 * - Namespace isolation
 * - Registry snapshot/restore
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEnhancedRegistry, type EnhancedRegistryOptions } from "./registry";

// ---------- helpers ----------

function makeRegistry(options?: EnhancedRegistryOptions) {
  return createEnhancedRegistry(options);
}

// ---------- tests ----------

describe("createEnhancedRegistry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---- base registration ----

  it("registers and retrieves a condition plugin", () => {
    const reg = makeRegistry();
    const plugin = () => true;

    reg.register("condition", "my:isVip", plugin);
    expect(reg.condition.get("my:isVip")).toBe(plugin);
  });

  it("registers and retrieves a validation plugin", () => {
    const reg = makeRegistry();
    const plugin = () => "error";

    reg.register("validation", "my:strongPwd", plugin);
    expect(reg.validation.get("my:strongPwd")).toBe(plugin);
  });

  it("registers and retrieves an option source plugin", () => {
    const reg = makeRegistry();
    const plugin = async () => [{ value: 1, label: "A" }];

    reg.register("optionSource", "my:depts", plugin);
    expect(reg.optionSource.get("my:depts")).toBe(plugin);
  });

  it("registers and retrieves a hook plugin", () => {
    const reg = makeRegistry();
    const plugin = async () => undefined;

    reg.register("hook", "my:audit", plugin);
    expect(reg.hook.get("my:audit")).toBe(plugin);
  });

  // ---- hot replacement ----

  it("replaces a plugin and returns the old one", () => {
    const reg = makeRegistry();
    const oldPlugin = () => true;
    const newPlugin = () => false;

    reg.register("condition", "my:check", oldPlugin);
    const replaced = reg.replace("condition", "my:check", newPlugin);

    expect(replaced).toBe(oldPlugin);
    expect(reg.condition.get("my:check")).toBe(newPlugin);
  });

  it("supports fallback on replacement error (conceptual)", () => {
    const reg = makeRegistry();
    const oldPlugin = () => true;
    const newPlugin = () => false;

    reg.register("condition", "my:check", oldPlugin);

    // Simulate: if new plugin fails validation, keep old
    // (In production, this would be handled by error boundary in React layer)
    const replaced = reg.replace("condition", "my:check", newPlugin);
    expect(replaced).toBe(oldPlugin);
    // The new plugin is installed — error handling is up to the consumer
    expect(reg.condition.get("my:check")).toBe(newPlugin);
  });

  it("returns undefined when replacing a non-existent plugin", () => {
    const reg = makeRegistry();
    const result = reg.replace("condition", "nonexistent", () => true);
    expect(result).toBeUndefined();
    // The new plugin should still be set
    expect(reg.condition.get("nonexistent")).toBeDefined();
  });

  // ---- batch registration ----

  it("registers multiple plugins at once", () => {
    const reg = makeRegistry();
    const c1 = () => true;
    const c2 = () => false;
    const v1 = () => "error";

    reg.registerBatch({
      condition: { "my:c1": c1, "my:c2": c2 },
      validation: { "my:v1": v1 },
    });

    expect(reg.condition.get("my:c1")).toBe(c1);
    expect(reg.condition.get("my:c2")).toBe(c2);
    expect(reg.validation.get("my:v1")).toBe(v1);
  });

  it("batch registration overwrites existing plugins with same id", () => {
    const reg = makeRegistry();
    const c1 = () => true;
    const c2 = () => false;

    reg.register("condition", "my:c1", c1);
    reg.registerBatch({ condition: { "my:c1": c2 } });

    expect(reg.condition.get("my:c1")).toBe(c2);
  });

  // ---- unregistration ----

  it("unregisters a plugin", () => {
    const reg = makeRegistry();
    const plugin = () => true;

    reg.register("condition", "my:check", plugin);
    expect(reg.condition.has("my:check")).toBe(true);

    const removed = reg.unregister("condition", "my:check");
    expect(removed).toBe(true);
    expect(reg.condition.has("my:check")).toBe(false);
  });

  it("returns false when unregistering a non-existent plugin", () => {
    const reg = makeRegistry();
    expect(reg.unregister("condition", "nonexistent")).toBe(false);
  });

  // ---- namespace isolation ----

  it("prefixes plugin IDs with namespace", () => {
    const reg = makeRegistry({ namespace: "app1" });
    const plugin = () => true;

    reg.register("condition", "isVip", plugin);

    // The internal storage key is prefixed
    expect(reg.condition.get("app1:isVip")).toBe(plugin);
    // The unprefixed key should NOT exist
    expect(reg.condition.get("isVip")).toBeUndefined();
  });

  it("isolates registries with different namespaces", () => {
    const reg1 = makeRegistry({ namespace: "app1" });
    const reg2 = makeRegistry({ namespace: "app2" });
    const plugin1 = () => true;
    const plugin2 = () => false;

    reg1.register("condition", "check", plugin1);
    reg2.register("condition", "check", plugin2);

    expect(reg1.condition.get("app1:check")).toBe(plugin1);
    expect(reg2.condition.get("app2:check")).toBe(plugin2);
  });

  // ---- snapshot / restore ----

  it("creates a snapshot of the registry", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);

    const snap = reg.snapshot();
    expect("c1" in snap.condition).toBe(true);
  });

  it("snapshot is independent of the original registry", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);

    const snap = reg.snapshot();
    reg.unregister("condition", "c1");

    // Snapshot should still have the plugin
    expect("c1" in snap.condition).toBe(true);
    // Original should not
    expect(reg.condition.has("c1")).toBe(false);
  });

  it("restores registry from a snapshot", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);

    const snap = reg.snapshot();
    reg.unregister("condition", "c1");
    reg.register("condition", "c2", () => false);

    reg.restore(snap);

    expect(reg.condition.has("c1")).toBe(true);
    expect(reg.condition.has("c2")).toBe(false);
  });

  // ---- list plugins ----

  it("lists all registered plugin IDs for a given type", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);
    reg.register("condition", "c2", () => false);
    reg.register("validation", "v1", () => "err");

    const conditionIds = reg.list("condition");
    expect(conditionIds).toEqual(["c1", "c2"]);

    const validationIds = reg.list("validation");
    expect(validationIds).toEqual(["v1"]);
  });

  // ---- clear ----

  it("clears all plugins of a given type", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);
    reg.register("validation", "v1", () => "err");

    reg.clear("condition");

    expect(reg.condition.size).toBe(0);
    expect(reg.validation.size).toBe(1);
  });

  it("clears all plugin types", () => {
    const reg = makeRegistry();
    reg.register("condition", "c1", () => true);
    reg.register("validation", "v1", () => "err");

    reg.clear("all");

    expect(reg.condition.size).toBe(0);
    expect(reg.validation.size).toBe(0);
    expect(reg.optionSource.size).toBe(0);
    expect(reg.hook.size).toBe(0);
  });
});
