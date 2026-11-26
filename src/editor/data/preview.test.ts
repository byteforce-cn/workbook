import { describe, expect, it } from "vitest";
import type { WorkbookData } from "../../core/types";
import {
  bindChipLabel,
  bindFromAttrs,
  bindPlaceholderText,
  resolveBindPreview,
  resolveEditorPreviewData,
} from "./preview";

describe("editor preview data", () => {
  it("prefers explicit preview data over the live tree", () => {
    const live: WorkbookData = { customer: { name: "Alice" } };
    const preview: WorkbookData = { customer: { name: "Bob" } };

    expect(resolveEditorPreviewData(preview, live)).toBe(preview);
    expect(resolveEditorPreviewData(undefined, live)).toBe(live);
  });

  it("projects bind attrs without inventing fields", () => {
    expect(bindFromAttrs({ path: "customer.name" })).toEqual({ path: "customer.name" });
    expect(bindFromAttrs({ path: "total", format: "upper", placeholder: "—" })).toEqual({
      path: "total",
      format: "upper",
      placeholder: "—",
    });
    expect(bindFromAttrs({})).toEqual({ path: "" });
  });

  it("renders the chip label with and without a format", () => {
    expect(bindChipLabel({ path: "customer.name" })).toBe("{{customer.name}}");
    expect(bindChipLabel({ path: "customer.name", format: "upper" })).toBe("{{customer.name | upper}}");
    expect(bindChipLabel({ path: "customer.name", format: "" })).toBe("{{customer.name}}");
    expect(bindChipLabel({})).toBe("{{}}");
  });

  it("only uses string placeholders as popover input values", () => {
    expect(bindPlaceholderText({ placeholder: "n/a" })).toBe("n/a");
    expect(bindPlaceholderText({ placeholder: { type: "text" } })).toBe("");
    expect(bindPlaceholderText({})).toBe("");
  });

  it("resolves preview values, formats and empty paths", () => {
    const data: WorkbookData = {
      customer: { name: "Alice" },
      when: new Date("2026-01-02T03:04:05.000Z"),
      empty: null,
    };

    expect(resolveBindPreview({ path: "customer.name", format: "upper" }, data)).toBe("ALICE");
    expect(resolveBindPreview({ path: "when", format: "date" }, data)).toBe("2026-01-02T03:04:05.000Z");
    expect(resolveBindPreview({ path: "customer.name", placeholder: "—" }, {})).toBe("—");
    expect(resolveBindPreview({ path: "missing" }, data)).toBeUndefined();
    expect(resolveBindPreview({ path: "empty" }, data)).toBeUndefined();
  });
});
