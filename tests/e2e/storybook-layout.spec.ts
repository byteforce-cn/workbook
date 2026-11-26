import { expect, test } from "@playwright/test";

import { openStory, storyUrl } from "./fixtures";
import { docsUrl, loadIndex, measureOverflow, waitForDocs } from "./layout-helpers";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

test.describe("Storybook 布局门禁", () => {
  test("docs 页在 1440 / 390 下不横向溢出", async ({ page }) => {
    test.setTimeout(600_000);
    const index = await loadIndex(page);
    expect(index.docs.length).toBe(16);

    const failures: string[] = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const id of index.docs) {
        await page.goto(docsUrl(id));
        await waitForDocs(page);
        const { scrollWidth, innerWidth, offenders } = await measureOverflow(page);
        if (scrollWidth > innerWidth + 1 || offenders.length > 0) {
          failures.push(
            `${id}@${viewport.name} scrollWidth=${scrollWidth}/${innerWidth} offenders=${offenders.slice(0, 5).join(" ")}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test("全部 story 在 390 下不横向溢出", async ({ page }) => {
    test.setTimeout(600_000);
    const index = await loadIndex(page);
    expect(index.stories.length).toBe(48);

    const failures: string[] = [];
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of index.stories) {
      await page.goto(storyUrl(id));
      await page.waitForLoadState("networkidle");
      const { scrollWidth, offenders } = await measureOverflow(page);
      if (scrollWidth > 391 || offenders.length > 0) {
        failures.push(`${id} scrollWidth=${scrollWidth} offenders=${offenders.slice(0, 5).join(" ")}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test("DraftVsApproving 在 1440 / 1024 / 390 下都看得到两个面板", async ({ page }) => {
    test.setTimeout(180_000);
    for (const viewport of [
      { name: "1440", width: 1440, height: 900 },
      { name: "1024", width: 1024, height: 900 },
      { name: "390", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openStory(page, "workbook-readonly--draft-vs-approving");

      const draft = page.locator('[data-testid="workbook-story-readonly-draft"]');
      const approving = page.locator('[data-testid="workbook-story-readonly-approving-2"]');
      await expect(draft).toBeVisible({ timeout: 15_000 });
      await expect(approving).toBeVisible();

      const boxes = [await draft.boundingBox(), await approving.boundingBox()];
      for (const [position, box] of boxes.entries()) {
        expect(box, `panel ${position} @${viewport.name} missing box`).not.toBeNull();
        expect(box!.x, `panel ${position} @${viewport.name} left edge`).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width, `panel ${position} @${viewport.name} right edge`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
      }

      if (viewport.width <= 1024) {
        // 窄屏必须上下堆叠，否则读者看不到第二块面板
        expect(boxes[1]!.y, `@${viewport.name} panels should stack`).toBeGreaterThanOrEqual(
          boxes[0]!.y + boxes[0]!.height,
        );
      }
    }
  });

  test("docs 页 1280 / 1920：story 画布不越界", async ({ page }) => {
    test.setTimeout(180_000);
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(docsUrl("workbook-documenteditor--docs"));
      await waitForDocs(page);
      const shell = page.locator('[data-testid="workbook-story-document-editor-basic"]').first();
      const box = await shell.boundingBox();
      expect(box, `@${width} shell missing`).not.toBeNull();
      expect(box!.x, `@${width} left edge`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `@${width} right edge`).toBeLessThanOrEqual(width + 1);
      const { scrollWidth, offenders } = await measureOverflow(page);
      expect({ width, scrollWidth, offenders }).toEqual({ width, scrollWidth: width, offenders: [] });
    }
  });

  test("story 视图：宽度受 maxWidth 约束且水平居中", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await openStory(page, "workbook-documenteditor--basic");
    const shell = page.locator('[data-testid="workbook-story-document-editor-basic"]');
    await expect(shell).toBeVisible({ timeout: 15_000 });
    const box = await shell.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1280);
    const leftGap = box!.x;
    const rightGap = 1920 - (box!.x + box!.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
  });
});
