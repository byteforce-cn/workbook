/**
 * Unit tests for core/i18n/i18n.
 */

import { describe, expect, it } from "vitest";
import { resolveI18nText } from "./i18n";

const dictionary = {
  "zh-CN": { greeting: "你好", farewell: "再见" },
  "en-US": { greeting: "Hello", farewell: "Goodbye" },
};

describe("resolveI18nText", () => {
  it("returns non-i18n strings unchanged", () => {
    expect(resolveI18nText("Plain text", "en-US", dictionary)).toBe("Plain text");
  });

  it("resolves @:key in the active locale", () => {
    expect(resolveI18nText("@:greeting", "zh-CN", dictionary)).toBe("你好");
  });

  it("falls back to the fallback locale", () => {
    expect(resolveI18nText("@:greeting", "fr-FR", dictionary)).toBe("Hello");
  });

  it("returns the original @:key if not found in any locale", () => {
    expect(resolveI18nText("@:unknown", "en-US", dictionary)).toBe("@:unknown");
  });

  it("returns undefined for undefined input", () => {
    expect(resolveI18nText(undefined, "en-US", dictionary)).toBeUndefined();
  });
});
