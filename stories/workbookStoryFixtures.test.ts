import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../src/core/types";
import { createWorkbookPdfFromPageView } from "../src/export/pdf";
import { createPluginRegistry } from "../src/react/registry";
import { layoutPageView } from "../src/renderers/page/pageLayout";
import { validateWorkbookDocument } from "../src/schema";
import { createStyleCatalogResolver } from "../src/styles/catalog";
import { createProductionShowcaseWorkbook } from "./workbookStoryFixtures";

describe("workbook story fixtures", () => {
  it("keeps the production showcase schema-valid and export-ready", () => {
    const workbook = createProductionShowcaseWorkbook();
    const validation = validateWorkbookDocument(workbook);
    expect(validation.valid).toBe(true);

    expect(workbook.views.map((view) => view.type)).toEqual(["form", "page", "sheet"]);
    expect(Object.keys(workbook.styles?.paragraphStyles ?? {})).toContain("reportTitle");
    expect(Object.keys(workbook.styles?.cellStyles ?? {})).toContain("sheetCritical");
    const formView = workbook.views.find((view) => view.type === "form");
    expect(formView?.fields.find((field) => field.name === "tags")?.props).toMatchObject({ widget: "tags" });

    const pageView = workbook.views.find((view): view is PageViewDefinition => view.type === "page");
    expect(pageView).toBeDefined();
    if (pageView == null) {
      throw new Error("production showcase is missing page view");
    }

    const registry = createPluginRegistry();
    const styleResolver = createStyleCatalogResolver(workbook.styles, registry);
    const layout = layoutPageView(pageView, { data: workbook.data, registry, styleResolver });
    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    expect(
      layout.pages.every((page) =>
        page.flowBlocks.every((block) => block.y >= page.contentTop && block.y + block.height <= page.contentBottom),
      ),
    ).toBe(true);

    const pdf = createWorkbookPdfFromPageView(pageView, {
      data: workbook.data,
      config: workbook.printConfig,
      registry,
      styleResolver,
    });
    expect(pdf.bytes.byteLength).toBeGreaterThan(1_000);
    expect(pdf.pageCount).toBe(layout.pages.length);
  });
});
