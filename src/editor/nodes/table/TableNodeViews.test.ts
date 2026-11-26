import type { Node as PMNode } from "@tiptap/pm/model";
import { DecorationSet } from "@tiptap/pm/view";
import { describe, expect, it, vi } from "vitest";
import { editorSchema } from "../../schema/extensions";
import { createColgroupNodeView, createTableNodeView } from "./TableNodeViews";
import type { EditorTableStyleContext } from "./tableStyle";

function context(): EditorTableStyleContext {
  return {
    data: {},
    styleResolver: {
      resolveTableStyle: vi.fn(() => ({ borderWidth: 2, borderColor: "#94a3b8", cellPadding: 10 })),
    } as unknown as EditorTableStyleContext["styleResolver"],
  };
}

function cell(): PMNode {
  return editorSchema.nodes.wbTableCell.create(null, [
    editorSchema.nodes.wbParagraph.create(null, [editorSchema.text("x")]),
  ]);
}

function table(attrs: Record<string, unknown> = {}): PMNode {
  return editorSchema.nodes.wbTable.create(attrs, [
    editorSchema.nodes.wbTableColgroup.create({ widths: ["60%", 120] }),
    editorSchema.nodes.wbTableRow.create(null, [cell(), cell()]),
  ]);
}

describe("table node view", () => {
  it("creates a table element and applies style-driven properties", () => {
    const factory = createTableNodeView(context);
    const view = factory({ node: table({ style: "Grid", width: "80%" }) });

    expect(view.dom).toBeInstanceOf(HTMLTableElement);
    expect((view.dom as HTMLTableElement).dataset.wbTable).toBe("true");
    expect((view.dom as HTMLTableElement).dataset.wbStyle).toBe("Grid");
    expect((view.dom as HTMLElement).style.width).toBe("80%");
    expect((view.dom as HTMLElement).style.getPropertyValue("--bf-table-border-width")).toBe("2px");
    expect((view.dom as HTMLElement).style.getPropertyValue("--bf-table-cell-padding")).toBe("10px");
    expect(view.contentDOM).toBe(view.dom);
  });

  it("renders numeric widths in px and drops a removed style id", () => {
    const factory = createTableNodeView(context);
    const view = factory({ node: table({ style: "Grid", width: 640 }) });
    expect((view.dom as HTMLElement).style.width).toBe("640px");

    const next = table({ width: 320 });
    expect(view.update?.(next, [], DecorationSet.empty)).toBe(true);
    expect((view.dom as HTMLTableElement).dataset.wbStyle).toBeUndefined();
    expect((view.dom as HTMLElement).style.width).toBe("320px");
  });

  it("rejects updates for a different node type", () => {
    const view = createTableNodeView()({ node: table() });
    const paragraph = editorSchema.nodes.wbParagraph.create(null, [editorSchema.text("x")]);
    expect(view.update?.(paragraph, [], DecorationSet.empty)).toBe(false);
  });

  it("works without a runtime context and ignores selection mutations", () => {
    const view = createTableNodeView()({ node: table({ width: "50%" }) });
    expect((view.dom as HTMLElement).style.width).toBe("50%");
    expect((view.dom as HTMLElement).style.getPropertyValue("--bf-table-border-width")).toBe("");
    expect(view.ignoreMutation?.({ type: "selection" } as unknown as MutationRecord)).toBe(true);
    expect(view.ignoreMutation?.({ type: "characterData" } as unknown as MutationRecord)).toBe(false);
  });
});

describe("colgroup node view", () => {
  it("renders pt and percent widths as col elements", () => {
    const colgroup = editorSchema.nodes.wbTableColgroup.create({ widths: ["60%", 120] });
    const view = createColgroupNodeView()({ node: colgroup });

    expect(view.dom).toBeInstanceOf(HTMLElement);
    expect(view.dom.tagName).toBe("COLGROUP");
    expect((view.dom as HTMLElement).dataset.wbColgroup).toBe("true");
    const columns = Array.from((view.dom as HTMLElement).children) as HTMLElement[];
    expect(columns.map((column) => column.tagName)).toEqual(["COL", "COL"]);
    expect(columns[0]?.style.width).toBe("60%");
    expect(columns[1]?.style.width).toBe("120px");
  });

  it("re-renders widths on update and clears malformed widths", () => {
    const view = createColgroupNodeView()({
      node: editorSchema.nodes.wbTableColgroup.create({ widths: ["50%", "50%"] }),
    });

    expect(view.update?.(editorSchema.nodes.wbTableColgroup.create({ widths: [200] }), [], DecorationSet.empty)).toBe(
      true,
    );
    expect((view.dom as HTMLElement).children).toHaveLength(1);
    expect((view.dom as HTMLElement).children[0]?.getAttribute("style")).toContain("200px");

    expect(view.update?.(editorSchema.nodes.wbTableColgroup.create({ widths: "bogus" }), [], DecorationSet.empty)).toBe(
      true,
    );
    expect((view.dom as HTMLElement).children).toHaveLength(0);
  });

  it("rejects updates for a different node type and ignores every mutation", () => {
    const view = createColgroupNodeView()({
      node: editorSchema.nodes.wbTableColgroup.create({ widths: ["50%"] }),
    });
    expect(view.update?.(table(), [], DecorationSet.empty)).toBe(false);
    expect(view.ignoreMutation?.({ type: "attributes" } as unknown as MutationRecord)).toBe(true);
  });
});
