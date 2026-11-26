import { describe, expect, it } from "vitest";
import type { PageBlockDefinition } from "../../core/types";
import { layoutPageView } from "../../renderers/page/pageLayout";
import { moveFloatingBlock, parseMeasurement, resizeFloatingBlock } from "./floating";
import { mergeEditorContent } from "./mergeContent";

type FloatingBlock = Extract<PageBlockDefinition, { type: "floating" }>;

const paragraph = (text: string): PageBlockDefinition => ({
  type: "paragraph",
  runs: [{ type: "text", text }],
});

function floating(x: number | string, y: number | string): FloatingBlock {
  return {
    type: "floating",
    layout: { x, y, width: "30%", height: 80 },
    content: { type: "paragraph", runs: [{ type: "text", text: "float" }] },
  };
}

describe("floating geometry", () => {
  it("moves pt blocks in pt and percent blocks in percent", () => {
    const points = moveFloatingBlock(floating(10, 20), 20, 10, 0.5, 600, 800);
    expect(points.layout.x).toBe(50);
    expect(points.layout.y).toBe(40);

    const percent = moveFloatingBlock(floating("10%", "20%"), 30, 40, 0.5, 600, 800);
    expect(percent.layout.x).toBe("20%");
    expect(percent.layout.y).toBe("30%");
  });

  it("resizes while preserving units", () => {
    const resized = resizeFloatingBlock(floating(10, 20), 10, 20, 0.5, 600, 800);
    expect(resized.layout.width).toBe("33.3%");
    expect(resized.layout.height).toBe(120);
  });

  it("matches the page layout rects (single geometry source)", () => {
    const block = floating(40, "10%");
    const result = layoutPageView({
      type: "page",
      pageSettings: { width: 600, height: 800 },
      content: [block],
    });
    const placed = result.pages[0].floatingBlocks[0];
    expect(placed.x).toBe(40);
    expect(placed.y).toBe(80);
    expect(placed.width).toBe(180);
    expect(placed.height).toBe(80);
  });

  it("parses measurements and rejects invalid input", () => {
    expect(parseMeasurement("30%")).toBe("30%");
    expect(parseMeasurement("12.5")).toBe(12.5);
    expect(parseMeasurement("-1")).toBeNull();
    expect(parseMeasurement("abc")).toBeNull();
  });
});

describe("content merge", () => {
  it("keeps out-of-flow blocks at their original relative slots", () => {
    const header = {
      type: "header" as const,
      content: [{ type: "paragraph" as const, runs: [{ type: "text" as const, text: "H" }] }],
    } as PageBlockDefinition;
    const base = [paragraph("a"), header, paragraph("b")];
    const merged = mergeEditorContent(
      base,
      [paragraph("A"), paragraph("B")],
      [
        {
          ...header,
          content: [{ type: "paragraph", runs: [{ type: "text", text: "H2" }] }],
        } as PageBlockDefinition,
      ],
    );
    expect(merged.map((block) => block.type)).toEqual(["paragraph", "header", "paragraph"]);
    expect((merged[1] as { content: Array<{ runs: Array<{ text?: string }> }> }).content[0].runs[0].text).toBe("H2");
  });

  it("appends new flow blocks after the existing slots and drops deleted overlays", () => {
    const header = {
      type: "header" as const,
      content: [{ type: "paragraph" as const, runs: [{ type: "text" as const, text: "H" }] }],
    } as PageBlockDefinition;
    const merged = mergeEditorContent([header, paragraph("a")], [paragraph("A"), paragraph("B")], []);
    expect(merged.map((block) => block.type)).toEqual(["paragraph", "paragraph"]);
  });
});
