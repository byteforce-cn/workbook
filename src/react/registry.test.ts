/**
 * The `register*` helpers are the documented plugin API
 * (`docs-site/api/plugin-system.md`). They were previously attached at runtime
 * but missing from the published type declarations, so consumers following the
 * docs could not compile. These tests pin both the runtime slots and the
 * documented import path.
 */

import { describe, expect, it } from "vitest";

import { createPluginRegistry as createFromReactEntry } from "./index";
import { createPluginRegistry as createFromProviderModule } from "./PluginProvider";
import { createPluginRegistry } from "./registry";

const DummyField = () => null;
const DummyLayout = () => null;
const DummyPageBlock = () => null;

describe("plugin registry register* helpers", () => {
  it("exposes every documented helper on the main-entry registry", () => {
    const registry = createPluginRegistry();

    expect(typeof registry.registerField).toBe("function");
    expect(typeof registry.registerLayout).toBe("function");
    expect(typeof registry.registerPageBlock).toBe("function");
    expect(typeof registry.registerCondition).toBe("function");
    expect(typeof registry.registerOptionSource).toBe("function");
    expect(typeof registry.registerValidation).toBe("function");
    expect(typeof registry.registerHook).toBe("function");
  });

  it("exposes the helpers through the `@byteforce/workbook/react` entry", () => {
    const registry = createFromReactEntry();

    expect(typeof registry.registerField).toBe("function");
    expect(typeof registry.registerLayout).toBe("function");
  });

  it("registers each plugin into its documented slot", () => {
    const registry = createPluginRegistry();
    const condition = () => true;
    const optionSource = () => Promise.resolve([]);
    const validation = () => undefined;
    const hook = () => undefined;

    registry.registerField("richText", DummyField);
    registry.registerLayout("card", DummyLayout);
    registry.registerPageBlock("flowStepper", DummyPageBlock);
    registry.registerCondition("isVIP", condition);
    registry.registerOptionSource("departments", optionSource);
    registry.registerValidation("strongPassword", validation);
    registry.registerHook("onSubmit", hook);

    expect(registry.field.get("richText")).toBe(DummyField);
    expect(registry.layout.get("card")).toBe(DummyLayout);
    expect(registry.pageBlock.get("flowStepper")).toBe(DummyPageBlock);
    expect(registry.condition.get("isVIP")).toBe(condition);
    expect(registry.optionSource.get("departments")).toBe(optionSource);
    expect(registry.validation.get("strongPassword")).toBe(validation);
    expect(registry.hook.get("onSubmit")).toBe(hook);
  });

  it("applies the namespace to helper registrations on both factories", () => {
    for (const create of [createPluginRegistry, createFromProviderModule]) {
      const registry = create({ namespace: "my-app" });

      registry.registerField("richText", DummyField);
      registry.registerCondition("isVIP", () => true);
      registry.registerPageBlock("flowStepper", DummyPageBlock);

      expect(registry.field.get("my-app:richText")).toBe(DummyField);
      expect(registry.field.has("richText")).toBe(false);
      expect(registry.condition.has("my-app:isVIP")).toBe(true);
      expect(registry.pageBlock.get("my-app:flowStepper")).toBe(DummyPageBlock);
      expect(registry.pageBlock.has("flowStepper")).toBe(false);
    }
  });

  it("keeps registries isolated from each other", () => {
    const registryA = createPluginRegistry({ namespace: "scope-a" });
    const registryB = createPluginRegistry({ namespace: "scope-b" });

    registryA.registerField("status", DummyField);
    registryB.registerField("status", DummyLayout);

    expect(registryA.field.get("scope-a:status")).toBe(DummyField);
    expect(registryB.field.get("scope-b:status")).toBe(DummyLayout);
  });
});
