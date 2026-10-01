import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../src/core/types";
import { layoutPageView } from "../src/renderers/page/pageLayout";
import { validateWorkbookDocument } from "../src/schema";
import {
  createComplexTablesWorkbook,
  createFloatingBlocksWorkbook,
  createFormulasWorkbook,
  createFrozenPanesWorkbook,
  createHeadersFootersWorkbook,
  createStretchWorkbook,
  createVirtualScrollWorkbook,
  createWatermarkWorkbook,
} from "./workbookPageSheetFixtures";

function singlePageView(workbook: ReturnType<typeof createHeadersFootersWorkbook>): PageViewDefinition {
  const view = workbook.views.find((entry): entry is PageViewDefinition => entry.type === "page");
  if (view == null) {
    throw new Error("workbook is missing a page view");
  }
  return view;
}

describe("page/sheet story fixtures", () => {
  it("keeps all page story workbooks schema-valid", () => {
    const workbooks = [
      createWatermarkWorkbook("text-single"),
      createWatermarkWorkbook("text-tiled"),
      createWatermarkWorkbook("image-tiled"),
      createHeadersFootersWorkbook(),
      createFloatingBlocksWorkbook(),
      createComplexTablesWorkbook(),
    ];

    for (const workbook of workbooks) {
      const validation = validateWorkbookDocument(workbook);
      expect(validation.valid, JSON.stringify(validation.errors)).toBe(true);
    }
  });

  it("lays out headers/footers into 3 pages and complex tables across multiple pages", () => {
    const headersFootersLayout = layoutPageView(singlePageView(createHeadersFootersWorkbook()), { data: {} });
    expect(headersFootersLayout.pages.length).toBe(3);

    const complexTablesLayout = layoutPageView(singlePageView(createComplexTablesWorkbook()), { data: {} });
    expect(complexTablesLayout.pages.length).toBeGreaterThanOrEqual(2);
    expect(complexTablesLayout.pages.every((page) => page.flowBlocks.length > 0)).toBe(true);
  });

  it("keeps all sheet story workbooks schema-valid", () => {
    const workbooks = [
      createFrozenPanesWorkbook(),
      createFormulasWorkbook(),
      createVirtualScrollWorkbook(),
      createStretchWorkbook("fixed"),
      createStretchWorkbook("stretch"),
    ];

    for (const workbook of workbooks) {
      const validation = validateWorkbookDocument(workbook);
      expect(validation.valid, JSON.stringify(validation.errors)).toBe(true);
    }
  });
});
