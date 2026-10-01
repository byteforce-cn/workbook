import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("多端渲染器（desktop / tablet / mobile）", () => {
  test("表单：强制设备切换驱动 row 列数收敛", async ({ page }) => {
    await openStory(page, workbookStoryIds.deviceForm);

    const story = page.locator('[data-testid="workbook-story-device-form"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 默认 desktop：4 字段 row 保持 4 列
    await expect(story.locator('[data-device="desktop"]')).toBeVisible();
    await expect(story.locator(".bf-workbook-row[data-cols='4']").first()).toBeVisible();

    // 切到 tablet：4 字段 row 收敛为 2 列，无 mobile 操作栏
    await story.getByTestId("device-tablet").click();
    await expect(story.locator('[data-device="tablet"]')).toBeVisible();
    await expect(story.locator(".bf-workbook-row[data-cols='2']").first()).toBeVisible();
    await expect(story.locator(".bf-workbook-form-actions--mobile")).toHaveCount(0);

    // 切到 mobile：全部 row 单列堆叠，操作栏吸底全宽，触控目标 44px
    await story.getByTestId("device-mobile").click();
    await expect(story.locator('[data-device="mobile"]')).toBeVisible();
    await expect(story.locator(".bf-workbook-row[data-cols='1']").first()).toBeVisible();
    await expect(story.locator(".bf-workbook-form-actions--mobile")).toBeVisible();
    await expect(story.locator(".bf-workbook-field input").first()).toHaveCSS("min-height", "44px");

    // 切回 desktop 恢复 4 列
    await story.getByTestId("device-desktop").click();
    await expect(story.locator(".bf-workbook-row[data-cols='4']").first()).toBeVisible();
    await expect(story.locator(".bf-workbook-form-actions--mobile")).toHaveCount(0);
  });

  test("分页文档：强制设备设置 data-device 且页面等比缩放", async ({ page }) => {
    await openStory(page, workbookStoryIds.devicePage);

    const story = page.locator('[data-testid="workbook-story-device-page"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 默认 auto：Chromium 1280 视口 → desktop
    await expect(story.locator('[data-device="desktop"]')).toBeVisible();
    await expect(story.locator("svg[data-workbook-page='true']").first()).toBeVisible();

    // 强制 mobile：页面仍渲染，data-device 切换
    await story.getByTestId("device-mobile").click();
    await expect(story.locator('[data-device="mobile"]')).toBeVisible();
    await expect(story.locator('[data-testid="device-frame-mobile"]')).toBeVisible();
  });

  test("Sheet 台账：强制设备切换不破坏冻结窗格渲染", async ({ page }) => {
    await openStory(page, workbookStoryIds.deviceSheet);

    const story = page.locator('[data-testid="workbook-story-device-sheet"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.locator('[data-device="desktop"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toBeVisible();

    // 强制 mobile：sheet 仍渲染四窗格，视口收窄后横向滚动可用
    await story.getByTestId("device-mobile").click();
    await expect(story.locator('[data-device="mobile"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-pane-body"]')).toBeVisible();
  });

  test("Auto 自适应：视口宽度变化自动切换设备", async ({ page }) => {
    await openStory(page, workbookStoryIds.deviceAuto);

    const story = page.locator('[data-testid="workbook-story-device-auto"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 默认 1280 视口 → desktop：4 列 row + data-workbook-responsive-mode="auto"
    await expect(story.locator('[data-workbook-responsive-mode="auto"]')).toBeVisible();
    await expect(story.locator('[data-device="desktop"]').first()).toBeVisible();
    await expect(story.locator(".bf-workbook-row[data-cols='4']").first()).toBeVisible();

    // 收窄到 390px → mobile：row 单列
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(story.locator('[data-device="mobile"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(story.locator(".bf-workbook-row[data-cols='1']").first()).toBeVisible();
    await expect(story.locator(".bf-workbook-form-actions--mobile").first()).toBeVisible();
  });
});
