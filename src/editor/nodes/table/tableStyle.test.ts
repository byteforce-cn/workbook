import type { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";
import { applyEditorTableStyle, type EditorTableStyleContext } from "./tableStyle";

function node(attrs: Record<string, unknown>): PMNode {
  return { attrs } as unknown as PMNode;
}

function context(style: Record<string, unknown>): EditorTableStyleContext {
  return {
    data: {},
    styleResolver: {
      resolveTableStyle: vi.fn(() => style),
    } as unknown as EditorTableStyleContext["styleResolver"],
  };
}

describe("editor table style projection", () => {
  it("projects the resolved table style onto the node view custom properties", () => {
    const dom = document.createElement("table");
    const resolved = context({ borderWidth: 2, borderColor: "#94a3b8", cellPadding: 10 });

    applyEditorTableStyle(dom, node({ style: "Grid" }), resolved);

    expect(resolved.styleResolver.resolveTableStyle).toHaveBeenCalledWith("Grid", {});
    expect(dom.style.getPropertyValue("--bf-table-border-width")).toBe("2px");
    expect(dom.style.getPropertyValue("--bf-table-border-style")).toBe("solid");
    expect(dom.style.getPropertyValue("--bf-table-border-color")).toBe("#94a3b8");
    expect(dom.style.getPropertyValue("--bf-table-cell-padding")).toBe("10px");
  });

  it("lets an authored border override the style catalog", () => {
    const dom = document.createElement("table");

    applyEditorTableStyle(dom, node({ border: { style: "none", color: "#111111" } }), context({ cellPadding: 4 }));

    expect(dom.style.getPropertyValue("--bf-table-border-width")).toBe("0px");
    expect(dom.style.getPropertyValue("--bf-table-border-style")).toBe("none");
    expect(dom.style.getPropertyValue("--bf-table-border-color")).toBe("#111111");
  });

  it("uses TableSvg's fallbacks when the catalog has no table style", () => {
    const dom = document.createElement("table");

    applyEditorTableStyle(dom, node({}), context({}));

    expect(dom.style.getPropertyValue("--bf-table-border-width")).toBe("1px");
    expect(dom.style.getPropertyValue("--bf-table-border-color")).toBe("#d1d5db");
    expect(dom.style.getPropertyValue("--bf-table-cell-padding")).toBe("8px");
  });

  it("leaves the DOM untouched without a runtime context", () => {
    const dom = document.createElement("table");
    applyEditorTableStyle(dom, node({ style: "Grid" }));
    expect(dom.getAttribute("style")).toBeNull();
  });
});
