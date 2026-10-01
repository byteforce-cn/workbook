import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("Page 深度能力", () => {
  test("水印：文本/图片/平铺三态切换", async ({ page }) => {
    await openStory(page, workbookStoryIds.pageWatermarks);

    const story = page.locator('[data-testid="workbook-story-page-watermarks"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 默认文本水印（居中），水印文本是页内第一个 <text>
    await expect(story.locator("svg").first()).toBeVisible();
    await expect(story.locator("svg text").first()).toContainText("机密");

    // 切到文本平铺
    await story.getByTestId("workbook-story-page-watermarks-mode-text-tiled").click();
    await expect(story.locator("svg text").first()).toContainText("BYTEFORCE", { timeout: 5_000 });

    // 切到图片平铺（本地 SVG data-URI 资源）
    await story.getByTestId("workbook-story-page-watermarks-mode-image-tiled").click();
    await expect(story.locator("svg image").first()).toHaveAttribute("href", /^data:image/, { timeout: 5_000 });
  });

  test("页眉页脚：首页/奇偶页差异化规则", async ({ page }) => {
    await openStory(page, workbookStoryIds.pageHeadersFooters);

    const story = page.locator('[data-testid="workbook-story-page-headers-footers"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 3 页文档
    await expect(story.locator('svg[data-workbook-page="true"]')).toHaveCount(3, { timeout: 5_000 });

    // 首页页眉（showOnFirstPage）
    await expect(story.locator("svg").first()).toContainText("首页页眉 · 北区交付台账");
    // 偶数页页眉（showOnEvenPages）
    await expect(story.locator("svg").nth(1)).toContainText("偶数页页眉 · 内部资料");
    // 奇数页页脚（showOnOddPages）出现在第 3 页
    await expect(story.locator("svg").nth(2)).toContainText("奇数页页脚 · 请勿外传");
  });

  test("浮动块：绝对与百分比定位", async ({ page }) => {
    await openStory(page, workbookStoryIds.pageFloatingBlocks);

    const story = page.locator('[data-testid="workbook-story-page-floating-blocks"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.locator("svg").first()).toBeVisible();
    await expect(story.locator("svg").first()).toContainText("绝对定位（x=36, y=48）");
    // 百分比定位图片浮动块使用本地 SVG data-URI 资源
    await expect(story.locator("svg image").first()).toHaveAttribute("href", /^data:image/);
  });

  test("复杂表格：合并单元格与跨页拆分", async ({ page }) => {
    await openStory(page, workbookStoryIds.pageComplexTables);

    const story = page.locator('[data-testid="workbook-story-page-complex-tables"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 40 行明细表强制跨页，页面数 >= 2
    await expect(story.locator('svg[data-workbook-page="true"]').first()).toBeVisible();
    const pageCount = await story.locator('svg[data-workbook-page="true"]').count();
    expect(pageCount).toBeGreaterThanOrEqual(2);

    // 合并单元格文本（colSpan / rowSpan）
    await expect(story.locator("svg").first()).toContainText("合并标题 A");
    await expect(story.locator("svg").first()).toContainText("垂直合并");
  });
});

test.describe("Sheet 深度能力", () => {
  test("冻结窗格：四窗格独立 Canvas 渲染", async ({ page }) => {
    await openStory(page, workbookStoryIds.sheetFrozenPanes);

    const story = page.locator('[data-testid="workbook-story-sheet-frozen-panes"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.locator('[data-testid="bf-sheet-viewport"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-pane-corner"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-pane-top"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-pane-left"]')).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-pane-body"]')).toBeVisible();
  });

  test("公式：单元格引用与聚合函数求值", async ({ page }) => {
    await openStory(page, workbookStoryIds.sheetFormulas);

    const story = page.locator('[data-testid="workbook-story-sheet-formulas"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.locator("canvas").first()).toBeVisible();
    // 无障碍回退表携带公式单元格定义（caption 取 view.label）
    await expect(story.locator("table caption")).toHaveText("公式计算");
    await expect(story.locator("table")).toContainText("=SUM(D2:D5)");

    // 求值对照面板可见
    await expect(story.locator('[data-testid="workbook-story-sheet-formulas-matrix"]')).toContainText("24000");
  });

  test("虚拟滚动：300 行 rowBind 渲染且滚动保持", async ({ page }) => {
    await openStory(page, workbookStoryIds.sheetVirtualScroll);

    const story = page.locator('[data-testid="workbook-story-sheet-virtual-scroll"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const viewport = story.locator('[data-testid="bf-sheet-scroll-viewport"]');
    await expect(viewport).toBeVisible();
    await expect(story.locator('[data-testid="bf-sheet-virtual-canvas"]')).toBeVisible();

    // 无障碍回退表物化全部 300 行
    await expect(story.locator("table tbody tr")).toHaveCount(300, { timeout: 5_000 });

    // 滚动到深处后画布仍在视口中（虚拟化只重绘可见区）
    await viewport.evaluate((node) => node.scrollTo({ top: 4000 }));
    await expect(story.locator('[data-testid="bf-sheet-virtual-canvas"]')).toBeVisible();
  });
});
