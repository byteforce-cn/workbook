import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../../core/types";
import { createPluginRegistry } from "../../react/registry";
import { createStyleCatalogResolver } from "../../styles/catalog";
import { layoutPageView } from "./pageLayout";

function createBasePage(content: PageViewDefinition["content"]): PageViewDefinition {
  return {
    type: "page",
    pageSettings: {
      width: 240,
      height: 160,
      marginTop: 16,
      marginRight: 16,
      marginBottom: 16,
      marginLeft: 16,
      defaultFontSize: 12,
      defaultLineHeight: 1.2,
    },
    content,
  };
}

describe("page layout pagination", () => {
  it("splits long paragraphs across pages without overflowing the content box", () => {
    const text = Array.from({ length: 80 }, (_, index) => `word${index}`).join(" ");
    const layout = layoutPageView(
      createBasePage([
        {
          type: "paragraph",
          lineHeight: 1.2,
          runs: [{ type: "text", text }],
        },
      ]),
    );

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(
      layout.pages.every((page) => page.flowBlocks.every((block) => block.y + block.height <= page.contentBottom)),
    ).toBe(true);

    const renderedText = layout.pages
      .flatMap((page) => page.flowBlocks)
      .map((block) => block.block)
      .filter(
        (block): block is Extract<PageViewDefinition["content"][number], { type: "paragraph" }> =>
          block.type === "paragraph",
      )
      .flatMap((block) => block.runs)
      .filter(
        (
          run,
        ): run is Extract<PageViewDefinition["content"][number], { type: "paragraph" }>["runs"][number] & {
          type: "text";
        } => run.type === "text",
      )
      .map((run) => run.text ?? "")
      .join(" ");

    expect(renderedText.replace(/\s+/g, " ").trim()).toBe(text);
  });

  it("splits table rows across pages and preserves row order", () => {
    const layout = layoutPageView(
      createBasePage([
        {
          type: "table",
          columns: [100, 100],
          rows: Array.from({ length: 9 }, (_, index) => ({
            height: 34,
            cells: [
              { content: [{ type: "paragraph", runs: [{ type: "text", text: `row-${index}` }] }] },
              { content: [{ type: "paragraph", runs: [{ type: "text", text: `value-${index}` }] }] },
            ],
          })) as unknown as Extract<PageViewDefinition["content"][number], { type: "table" }>["rows"],
        },
      ]),
    );

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(
      layout.pages.every((page) => page.flowBlocks.every((block) => block.y + block.height <= page.contentBottom)),
    ).toBe(true);

    const rowLabels = layout.pages
      .flatMap((page) => page.flowBlocks)
      .map((block) => block.block)
      .filter(
        (block): block is Extract<PageViewDefinition["content"][number], { type: "table" }> => block.type === "table",
      )
      .flatMap((table) => table.rows)
      .map((row) => row.cells[0]?.content[0])
      .filter(
        (block): block is Extract<PageViewDefinition["content"][number], { type: "paragraph" }> =>
          block?.type === "paragraph",
      )
      .map((paragraph) => paragraph.runs[0])
      .filter(
        (
          run,
        ): run is Extract<PageViewDefinition["content"][number], { type: "paragraph" }>["runs"][number] & {
          type: "text";
        } => run?.type === "text",
      )
      .map((run) => run.text);

    expect(rowLabels).toEqual(Array.from({ length: 9 }, (_, index) => `row-${index}`));
  });

  it("reserves screen layout space for headers and footers even with small page margins", () => {
    const layout = layoutPageView(
      createBasePage([
        {
          type: "header",
          alignment: "center",
          content: [{ type: "paragraph", runs: [{ type: "text", text: "页眉" }] }],
        },
        {
          type: "paragraph",
          runs: [{ type: "text", text: "正文内容" }],
        },
        {
          type: "footer",
          alignment: "right",
          content: [{ type: "paragraph", runs: [{ type: "text", text: "页脚" }] }],
        },
      ]),
    );

    const firstPage = layout.pages[0];
    const firstHeader = firstPage.headerBlocks[0];
    const firstFlow = firstPage.flowBlocks[0];
    const firstFooter = firstPage.footerBlocks[0];

    expect(firstFlow.y).toBeGreaterThanOrEqual(firstHeader.y + firstHeader.height + 8);
    expect(firstFlow.y + firstFlow.height).toBeLessThanOrEqual(firstFooter.y - 8);
  });

  it("measures paragraph layout with resolved paragraph styles", () => {
    const styleResolver = createStyleCatalogResolver(
      {
        paragraphStyles: {
          title: { fontSize: 28, lineHeight: 1.2, spaceBefore: 12, spaceAfter: 10 },
        },
      },
      createPluginRegistry(),
    );
    const layout = layoutPageView(
      createBasePage([
        {
          type: "paragraph",
          style: "title",
          runs: [{ type: "text", text: "交付验收报告" }],
        },
        {
          type: "paragraph",
          runs: [{ type: "text", text: "摘要" }],
        },
      ]),
      { styleResolver },
    );

    const [titleBlock, nextBlock] = layout.pages[0].flowBlocks;
    expect(titleBlock.height).toBeGreaterThan(50);
    expect(nextBlock.y).toBeGreaterThanOrEqual(titleBlock.y + titleBlock.height + 16);
  });
});
