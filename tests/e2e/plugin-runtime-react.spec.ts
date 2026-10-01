import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("插件系统", () => {
  test("自定义字段插件渲染 shadcn 分段控件", async ({ page }) => {
    await openStory(page, workbookStoryIds.pluginCustomField);

    const story = page.locator('[data-testid="workbook-story-plugin-field"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByRole("group", { name: "项目状态" })).toBeVisible();
    await expect(story.getByRole("button", { name: "草稿" })).toBeVisible();
    await expect(story.getByRole("button", { name: "复核中" })).toBeVisible();
    await expect(story.getByRole("button", { name: "已批准" })).toBeVisible();

    await story.getByRole("button", { name: "已批准" }).click();
    await expect(story.locator('[data-testid="workbook-story-plugin-field-state"]')).toContainText(
      '"projectStatus": "approved"',
    );
  });

  test("自定义布局插件渲染卡片容器", async ({ page }) => {
    await openStory(page, workbookStoryIds.pluginCustomLayout);

    const story = page.locator('[data-testid="workbook-story-plugin-layout"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByText("交付卡片")).toBeVisible();
    await expect(story.getByLabel("计划名称")).toBeVisible();
    await expect(story.getByLabel("截止日期")).toBeVisible();
    await expect(story.getByLabel("负责人")).toBeVisible();
  });

  test("自定义校验插件校验身份证号", async ({ page }) => {
    await openStory(page, workbookStoryIds.pluginCustomValidation);

    const story = page.locator('[data-testid="workbook-story-plugin-validation"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const idCard = story.getByLabel("身份证号");
    await idCard.fill("123");
    // 插件返回的错误文案优先于 schema message
    await expect(story.getByText("身份证号必须为 18 位（末位可为 X）")).toBeVisible({ timeout: 5_000 });
  });

  test("自定义条件插件隐藏周末会议室", async ({ page }) => {
    await openStory(page, workbookStoryIds.pluginCustomCondition);

    const story = page.locator('[data-testid="workbook-story-plugin-condition"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 初始为工作日（2026-08-05 周二），会议室可见
    await expect(story.getByLabel("会议室")).toBeVisible();

    // 2026-08-09 为周六（周末），会议室隐藏
    await story.getByLabel("会议日期").fill("2026-08-09");
    await expect(story.getByLabel("会议室")).toHaveCount(0, { timeout: 5_000 });
  });
});

test.describe("运行时能力", () => {
  test("i18n 切换语言即时生效", async ({ page }) => {
    await openStory(page, workbookStoryIds.runtimeI18n);

    const story = page.locator('[data-testid="workbook-story-runtime-i18n"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByLabel("用户名称")).toBeVisible();

    await story.getByTestId("workbook-story-runtime-i18n-locale-en").click();
    await expect(story.getByLabel("Username")).toBeVisible({ timeout: 5_000 });

    await story.getByTestId("workbook-story-runtime-i18n-locale-zh-CN").click();
    await expect(story.getByLabel("用户名称")).toBeVisible({ timeout: 5_000 });
  });

  test("条件引擎操作符矩阵实时求值", async ({ page }) => {
    await openStory(page, workbookStoryIds.runtimeConditionEngine);

    const story = page.locator('[data-testid="workbook-story-runtime-condition"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const matrix = story.locator('[data-testid="workbook-story-runtime-condition-matrix"]');
    await expect(matrix.getByTestId("condition-matrix-eq")).toContainText("true");

    // 修改年龄 < 18 后 gt/gte 变 false
    await story.getByLabel("年龄（gt / gte / lt / lte）").fill("10");
    await expect(matrix.getByTestId("condition-matrix-gt")).toContainText("false", { timeout: 5_000 });
    await expect(matrix.getByTestId("condition-matrix-gte")).toContainText("false", { timeout: 5_000 });
  });

  test("Hook 生命周期记录 onMount / onChange / onSubmit", async ({ page }) => {
    await openStory(page, workbookStoryIds.runtimeHookLifecycle);

    const story = page.locator('[data-testid="workbook-story-runtime-hooks"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const logPanel = story.locator('[data-testid="workbook-story-runtime-hooks-log"]');
    await expect(logPanel.getByText(/mount: 审计日志/)).toBeVisible({ timeout: 5_000 });

    await story.getByLabel("单据状态").selectOption("submitted");
    await expect(logPanel.getByText(/API hook → on-change/)).toBeVisible({ timeout: 5_000 });
    await expect(logPanel.getByText(/change: 审计日志/)).toBeVisible({ timeout: 5_000 });

    await story.getByRole("button", { name: "提交" }).click();
    await expect(logPanel.getByText(/API hook → on-submit/)).toBeVisible({ timeout: 5_000 });
    await expect(logPanel.getByText(/onSubmit 回调/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("React 集成层", () => {
  test("DataProvider 多视图共享数据实时联动", async ({ page }) => {
    await openStory(page, workbookStoryIds.reactDataProvider);

    const story = page.locator('[data-testid="workbook-story-react-data-provider"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByText("客户：Alice")).toBeVisible();

    await story.getByLabel("客户名称").fill("Diana");
    await expect(story.getByText("客户：Diana")).toBeVisible({ timeout: 5_000 });
    await expect(story.locator('[data-testid="workbook-story-react-data-provider-state"]')).toContainText(
      '"name": "Diana"',
    );
  });

  test("PluginProvider 作用域隔离互不泄漏", async ({ page }) => {
    await openStory(page, workbookStoryIds.reactPluginProvider);

    const story = page.locator('[data-testid="workbook-story-react-plugin-provider"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByText("作用域 A（namespace: scope-a）")).toBeVisible();
    await expect(story.getByText("作用域 B（namespace: scope-b）")).toBeVisible();
  });

  test("错误边界三级降级", async ({ page }) => {
    await openStory(page, workbookStoryIds.reactErrorBoundary);

    const story = page.locator('[data-testid="workbook-story-react-error-boundary"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 字段级降级
    await story.getByTestId("workbook-story-react-error-boundary-trigger-field").click();
    await expect(story.getByTestId("workbook-story-react-error-boundary-field-fallback")).toBeVisible({
      timeout: 5_000,
    });

    // 全局兜底
    await story.getByTestId("workbook-story-react-error-boundary-trigger-fatal").click();
    await expect(story.getByTestId("workbook-story-react-error-boundary-fatal-fallback")).toBeVisible({
      timeout: 5_000,
    });
  });
});
