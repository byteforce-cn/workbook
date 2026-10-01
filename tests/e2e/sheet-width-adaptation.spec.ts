import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("Sheet 宽度自适应（widthMode）", () => {
  test("stretch 铺满容器宽度，fixed 保持自然列宽并居中", async ({ page }) => {
    await openStory(page, workbookStoryIds.sheetStretchWidth);

    const story = page.locator('[data-testid="workbook-story-sheet-stretch-width"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 默认 stretch：视口铺满容器 820px（12 行无纵向溢出，无需滚动条预留）
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("width", "820px");
    // body pane 恰好铺满，无横向滚动
    await expect(story.locator('[data-testid="bf-sheet-pane-body"]')).toHaveCSS("overflow-x", "hidden");

    // 切到 fixed：恢复自然列宽 610px 并居中
    await story.getByRole("button", { name: "fixed（固定列宽）" }).click();
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("width", "610px");
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("margin-left", "0px");
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("margin-right", "0px");

    // 再切回 stretch 恢复铺满
    await story.getByRole("button", { name: "stretch（铺满容器）" }).click();
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toHaveCSS("width", "820px");
  });
});
