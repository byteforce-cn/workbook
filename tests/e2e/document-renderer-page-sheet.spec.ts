import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("DocumentRenderer 只读视图场景", () => {
  test("页面预览 story 渲染 SVG 页面内容", async ({ page }) => {
    await openStory(page, workbookStoryIds.pagePreview);

    const story = page.locator('[data-testid="workbook-story-page-preview"]');
    await expect(story).toBeVisible({ timeout: 15_000 });
    await expect(story.locator("svg")).toBeVisible();
    await expect(story.getByText("Alice")).toBeVisible();
  });

  test("表格预览 story 渲染标题与 canvas", async ({ page }) => {
    await openStory(page, workbookStoryIds.sheetPreview);

    const story = page.locator('[data-testid="workbook-story-sheet-preview"]');
    await expect(story).toBeVisible({ timeout: 15_000 });
    // 标题以 <h2> 渲染（同时存在无障碍表格 <caption>，故用 heading 定位）
    await expect(story.getByRole("heading", { name: "表格预览" })).toBeVisible();
    await expect(story.locator("canvas")).toBeVisible();
  });

  test("自动分页与 PDF 输出 story 渲染多页和字节统计", async ({ page }) => {
    await openStory(page, workbookStoryIds.pagedPrintExport);

    const story = page.locator('[data-testid="workbook-story-paged-print-export"]');
    await expect(story).toBeVisible({ timeout: 15_000 });
    await expect(story.locator("svg").nth(1)).toBeVisible();
    await expect(story.locator('[data-testid="workbook-story-paged-print-export-stats"]')).toContainText("PDF bytes:");
  });

  test("生产级 showcase story 覆盖表单、文档与 sheet 三类视图", async ({ page }) => {
    await openStory(page, workbookStoryIds.productionShowcase);

    const story = page.locator('[data-testid="workbook-story-production-showcase"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const ownerInput = story.getByRole("textbox", { name: "项目负责人" });
    await expect(ownerInput).toBeVisible();
    await expect(ownerInput).toHaveCSS("border-radius", "6px");

    const tagInput = story.getByRole("combobox", { name: "新增交付标签" });
    await expect(tagInput).toBeVisible();
    await tagInput.fill("审计");
    await story.getByRole("button", { name: "添加交付标签" }).click();
    await expect(story.getByRole("button", { name: "移除标签 审计" })).toBeVisible();

    await story.getByRole("button", { name: "文档输出" }).click();
    await expect(story.locator("svg").first()).toBeVisible();
    await expect(story.locator('[data-testid="production-showcase-pdf-bytes"]')).toContainText("PDF bytes:");

    await story.getByRole("button", { name: "Sheet 台账" }).click();
    // 内容宽度 752 + 纵向滚动条预留 15，视口自适应后最后一列不被滚动条裁掉
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("width", "767px");
    await expect(story.locator('[data-testid="bf-sheet-pane-corner"] canvas').first()).toHaveCSS(
      "border-radius",
      "0px",
    );
    await expect(story.locator("canvas").first()).toBeVisible();
  });
});
