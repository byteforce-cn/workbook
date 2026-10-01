import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("DocumentRenderer 联动场景", () => {
  test("表单编辑会同步到页面预览和表格视图", async ({ page }) => {
    await openStory(page, workbookStoryIds.allViews);

    const story = page.locator('[data-testid="workbook-story-all-views"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const input = story.getByLabel("客户姓名");
    await input.fill("Bob");

    await expect(story.getByText("Bob")).toBeVisible();
    await expect(story.locator("canvas")).toBeVisible();
  });
});
