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

  test("条件样式徽标不会盖住正文首行", async ({ page }) => {
    await openStory(page, workbookStoryIds.documentEditorBasic);
    const story = page.locator('[data-testid="workbook-story-document-editor-basic"]');
    const content = story.locator(".bf-editor-content");
    await expect(content).toBeVisible({ timeout: 15_000 });

    const overlap = await content.evaluate((root) => {
      const heading = root.querySelector("p");
      const conditional = root.querySelector("[data-bf-conditional-style]");
      if (heading == null || conditional == null) {
        throw new Error("conditional-style paragraph missing");
      }

      const rect = heading.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + 4, rect.top + 2);
      return {
        headingText: heading.textContent?.trim() ?? "",
        hitIsBadge: hit != null && conditional.contains(hit),
      };
    });

    expect(overlap.headingText).toContain("第一条");
    expect(overlap.hitIsBadge).toBe(false);
  });

  test("表格边框与内边距在编辑态和预览态一致", async ({ page }) => {
    await openStory(page, workbookStoryIds.documentEditorTable);
    const story = page.locator('[data-testid="workbook-story-document-editor-table"]');
    await expect(story.locator(".bf-editor-content table")).toBeVisible({ timeout: 15_000 });

    await story.getByRole("button", { name: "打印预览" }).click();
    await expect(story.locator("[data-bf-editor-preview] td").first()).toBeVisible({ timeout: 10_000 });

    const styles = await page.evaluate(() => {
      const editorCell = document.querySelector(
        '[data-testid="workbook-story-document-editor-table"] .bf-editor-content td',
      );
      const previewCell = document.querySelector(
        '[data-testid="workbook-story-document-editor-table"] [data-bf-editor-preview] td',
      );
      if (editorCell == null || previewCell == null) {
        throw new Error("table cell missing");
      }

      const properties = [
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "borderTopStyle",
        "borderTopColor",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ] as const;
      const read = (element: Element) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(properties.map((property) => [property, style[property]]));
      };

      return { editor: read(editorCell), preview: read(previewCell) };
    });

    expect(styles.editor).toEqual(styles.preview);
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

test.describe("Document editor · 快照面板真的工作", () => {
  test("快照计数递增、JSON 可读、重新加载回到快照", async ({ page }) => {
    await openStory(page, workbookStoryIds.documentEditorBasic);
    const story = page.locator('[data-testid="workbook-story-document-editor-basic"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const base = "workbook-story-document-editor-basic";
    const count = story.getByTestId(`${base}-snapshot-count`);
    await expect(count).toContainText("已快照 0 次");
    await expect(story.getByTestId(`${base}-copy`)).toBeVisible();

    const editable = story.locator(".bf-editor-content");
    await editable.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" 快照点一");

    await story.getByTestId(`${base}-snapshot`).click();
    await expect(count).toContainText("已快照 1 次");

    // JSON 面板必须是多行可读的，不是一行塞满
    const saved = story.getByTestId(`${base}-saved`);
    await expect(saved).toContainText("快照点一");
    const lines = (await saved.innerText()).split("\n").filter((line) => line.trim().length > 0);
    expect(lines.length).toBeGreaterThan(3);

    // 再改一次，然后重新加载应回到快照，而不是保留新改动
    await editable.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" 快照后改动");
    await expect(editable).toContainText("快照后改动");

    await story.getByRole("button", { name: "重新加载" }).click();
    const reloaded = story.locator(".bf-editor-content");
    await expect(reloaded).toContainText("快照点一");
    await expect(reloaded).not.toContainText("快照后改动");
    await expect(story.getByTestId(`${base}-restored`)).toBeVisible();
  });
});
