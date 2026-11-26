import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import type { PageViewDefinition, WorkbookStyleCatalog } from "../../core/types";
import { pluginRegistry } from "../../react/registry";
import { fromProseMirror } from "../codec/fromProseMirror";
import { toProseMirror } from "../codec/toProseMirror";
import { editorExtensions } from "../schema/extensions";
import { applyTextFormat, clearTextFormatting } from "./applyFormat";
import { createConditionalVisibilityExtension, createStyleBadgeExtension } from "./conditionalVisibility";
import {
  clearDirectFormatting,
  DIRECT_FORMAT_KEYS,
  mergeFormatAttrs,
  styleHasConditionalRules,
  styleOptions,
} from "./textFormat";

const catalog: WorkbookStyleCatalog = {
  paragraphStyles: {
    Body: { fontSize: 12 },
    Conditional: {
      fontSize: 11,
      conditional: [{ condition: { op: "eq", path: "status", value: "open" }, style: { color: "#ff0000" } }],
    },
  },
  characterStyles: {
    Emphasis: { fontWeight: "bold" },
    Quiet: { color: "#6b7280" },
  },
};

const view: PageViewDefinition = {
  type: "page",
  pageSettings: { width: 595, height: 842 },
  content: [
    {
      type: "paragraph",
      style: "Body",
      runs: [{ type: "text", text: "Hello", style: "Emphasis" }],
    },
  ],
};

describe("named-style-first formatting", () => {
  it("keeps the style id when direct formatting is applied", () => {
    const merged = mergeFormatAttrs({ style: "Emphasis", color: "#111111" }, { fontSize: 18 });
    expect(merged).toEqual({ style: "Emphasis", color: "#111111", fontSize: 18 });
  });

  it("clears only direct formatting", () => {
    const cleared = clearDirectFormatting({ style: "Emphasis", fontWeight: "bold", color: "#111111" });
    expect(cleared.style).toBe("Emphasis");
    for (const key of DIRECT_FORMAT_KEYS) {
      expect(cleared[key]).toBeNull();
    }
  });

  it("sorts style options by id", () => {
    expect(styleOptions(catalog, "characterStyles").map((option) => option.id)).toEqual(["Emphasis", "Quiet"]);
  });

  it("detects conditional style rules", () => {
    expect(styleHasConditionalRules(catalog, "paragraphStyles", "Conditional")).toBe(true);
    expect(styleHasConditionalRules(catalog, "paragraphStyles", "Body")).toBe(false);
  });

  it("applies a format patch without dropping per-run style ids", () => {
    const multiple = {
      ...view,
      content: [
        {
          type: "paragraph" as const,
          runs: [
            { type: "text" as const, text: "A", style: "Emphasis" },
            { type: "text" as const, text: "B", style: "Quiet" },
          ],
        },
      ],
    } as PageViewDefinition;
    const { doc } = toProseMirror(multiple);
    const editor = new Editor({ extensions: editorExtensions, content: doc?.toJSON() });
    editor.commands.selectAll();
    expect(applyTextFormat(editor, { fontSize: 16 })).toBe(true);

    const result = fromProseMirror(editor.state.doc, multiple);
    const paragraph = result.view.content[0];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type === "paragraph") {
      expect(paragraph.runs[0]).toMatchObject({ style: "Emphasis", fontSize: 16 });
      expect(paragraph.runs[1]).toMatchObject({ style: "Quiet", fontSize: 16 });
    }
    editor.destroy();
  });

  it("clears direct formatting on the selected runs and keeps their style ids", () => {
    const multiple = {
      ...view,
      content: [
        {
          type: "paragraph" as const,
          runs: [
            { type: "text" as const, text: "A", style: "Emphasis", fontWeight: "bold" as const, color: "#111111" },
            { type: "text" as const, text: "B", style: "Quiet", fontSize: 20 },
            { type: "text" as const, text: "C", fontWeight: "bold" as const },
          ],
        },
      ],
    } as PageViewDefinition;
    const { doc } = toProseMirror(multiple);
    const editor = new Editor({ extensions: editorExtensions, content: doc?.toJSON() });
    editor.commands.selectAll();

    expect(clearTextFormatting(editor)).toBe(true);
    const result = fromProseMirror(editor.state.doc, multiple);
    const paragraph = result.view.content[0];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type === "paragraph") {
      expect(paragraph.runs).toEqual([
        { type: "text", text: "A", style: "Emphasis" },
        { type: "text", text: "B", style: "Quiet" },
        { type: "text", text: "C" },
      ]);
    }
    editor.destroy();
  });

  it("reports no change when the selection is collapsed", () => {
    const { doc } = toProseMirror(view);
    const editor = new Editor({ extensions: editorExtensions, content: doc?.toJSON() });
    editor.commands.setTextSelection(2);

    expect(applyTextFormat(editor, { fontSize: 18 })).toBe(false);
    expect(clearTextFormatting(editor)).toBe(false);
    editor.destroy();
  });

  it("returns false when the schema has no wbText mark", () => {
    const editor = {
      state: { selection: { from: 1, to: 1 }, schema: { marks: {} } },
    } as unknown as import("@tiptap/core").Editor;

    expect(applyTextFormat(editor, { fontSize: 18 })).toBe(false);
    expect(clearTextFormatting(editor)).toBe(false);
  });

  it("keeps named style and direct override in the saved run", () => {
    const { doc } = toProseMirror(view);
    const editor = new Editor({ extensions: editorExtensions, content: doc?.toJSON() });
    editor.commands.selectAll();
    const current = editor.getAttributes("wbText") as Record<string, unknown>;
    editor.commands.setMark("wbText", mergeFormatAttrs(current, { fontSize: 18 }));

    let runs: unknown;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "wbParagraph") {
        runs = node.toJSON().content;
      }
    });
    const firstText = (runs as Array<{ marks: Array<{ attrs: Record<string, unknown> }> }>)[0];
    expect(firstText.marks[0].attrs).toMatchObject({ style: "Emphasis", fontSize: 18 });
  });
});

describe("conditional presentation", () => {
  const content = [
    {
      type: "paragraph",
      visible: { op: "eq", path: "status", value: "open" },
      runs: [{ type: "text", text: "conditional" }],
    },
    {
      type: "paragraph",
      style: "Conditional",
      runs: [{ type: "text", text: "styled" }],
    },
  ] as PageViewDefinition["content"];

  const page: PageViewDefinition = { type: "page", pageSettings: { width: 595, height: 842 }, content };

  function decorations(simulate: boolean) {
    const { doc } = toProseMirror(page);
    const editor = new Editor({
      extensions: [
        ...editorExtensions,
        createConditionalVisibilityExtension(() => ({
          data: { status: "closed" },
          simulate,
          registry: pluginRegistry,
          styles: catalog,
        })),
        createStyleBadgeExtension(() => ({ styles: catalog })),
      ],
      content: doc?.toJSON(),
    });
    const all = editor.state.plugins.flatMap((plugin) => {
      const source = plugin.props.decorations;
      if (typeof source !== "function") {
        return [];
      }
      const decorationSource = source.call(plugin, editor.state);
      if (decorationSource == null || typeof decorationSource === "string") {
        return [];
      }
      return [...(decorationSource as import("@tiptap/pm/view").DecorationSet).find()].map((decoration) => ({
        from: decoration.from,
        attrs: decoration.spec as Record<string, string>,
      }));
    });
    const json = JSON.stringify(editor.getJSON());
    editor.destroy();
    return { all, json };
  }

  it("marks conditional blocks without mutating them", () => {
    const initial = JSON.stringify(toProseMirror(page).doc?.toJSON());
    const off = decorations(false);
    expect(initial).toBe(off.json);
    expect(off.all.some((decoration) => decoration.attrs.class === "bf-editor-block--conditional")).toBe(true);
    expect(off.all.some((decoration) => decoration.attrs["data-bf-condition-hidden"] === "true")).toBe(false);

    const on = decorations(true);
    expect(on.json).toBe(initial);
    expect(on.all.some((decoration) => decoration.attrs["data-bf-condition-hidden"] === "true")).toBe(true);
  });

  it("badges read-only conditional styles", () => {
    const { all } = decorations(false);
    expect(all.some((decoration) => decoration.attrs["data-bf-conditional-style"] === "true")).toBe(true);
  });
});
