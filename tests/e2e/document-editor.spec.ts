import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("Document editor", () => {
  test("编辑 → 保存 → 重新加载 → 打印预览", async ({ page }) => {
    await openStory(page, workbookStoryIds.documentEditorBasic);
    const story = page.locator('[data-testid="workbook-story-document-editor-basic"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const editable = story.locator(".bf-editor-content");
    await expect(editable).toBeVisible();
    await editable.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" 追加条款");
    await expect(editable).toContainText("追加条款");

    await story.getByRole("button", { name: "保存" }).click();
    await expect(story.getByTestId("workbook-story-document-editor-basic-saved")).toContainText("追加条款");

    await story.getByRole("button", { name: "重新加载" }).click();
    await expect(story.locator(".bf-editor-content")).toContainText("追加条款");

    await story.getByRole("button", { name: "打印预览" }).click();
    const preview = story.locator("[data-bf-editor-preview]");
    await expect(preview).toBeVisible();
    await expect(preview.locator('svg[data-workbook-page="true"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(preview).toContainText("北区供应链有限公司 · 采购合同");
    await expect(preview).toContainText("追加条款");
  });

  test("表格与出流层面板可用", async ({ page }) => {
    await openStory(page, workbookStoryIds.documentEditorTable);
    const tableStory = page.locator('[data-testid="workbook-story-document-editor-table"]');
    await expect(tableStory).toBeVisible({ timeout: 15_000 });
    await expect(tableStory.locator(".bf-editor-content table")).toBeVisible();
    await expect(tableStory.locator(".bf-editor-content")).toContainText("96,000");

    await openStory(page, workbookStoryIds.documentEditorOutOfFlow);
    const outStory = page.locator('[data-testid="workbook-story-document-editor-out-of-flow"]');
    await expect(outStory).toBeVisible({ timeout: 15_000 });
    await expect(outStory.getByRole("region", { name: /页眉/ })).toBeVisible();
    await expect(outStory.getByRole("region", { name: "水印" })).toBeVisible();
    await expect(outStory.getByRole("region", { name: "浮动块" })).toBeVisible();
  });
});
