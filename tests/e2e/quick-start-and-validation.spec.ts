import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("Quick Start 入口 — SimpleForm", () => {
  test("基础表单渲染 5 类字段并可交互", async ({ page }) => {
    await openStory(page, workbookStoryIds.quickBasics);

    const story = page.locator('[data-testid="workbook-story-quick-basics"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByLabel("客户名称")).toBeVisible();
    await expect(story.getByLabel("联系邮箱")).toBeVisible();
    await expect(story.getByLabel("订单金额")).toBeVisible();
    await expect(story.getByLabel("交付日期")).toBeVisible();
    await expect(story.getByLabel("备注")).toBeVisible();

    // 能力标签 + 代码面板
    await expect(story.getByText("Quick Start API")).toBeVisible();
    await expect(story.getByText("查看示例代码")).toBeVisible();

    // 空提交触发必填校验
    await story.getByRole("button", { name: "提交", exact: true }).click();
    await expect(story.getByText("客户名称 为必填项")).toBeVisible({ timeout: 5_000 });
  });

  test("下拉与多选 story 实时写回数据树", async ({ page }) => {
    await openStory(page, workbookStoryIds.quickSelect);

    const story = page.locator('[data-testid="workbook-story-quick-select"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await story.getByLabel("所属区域").selectOption("west");
    await expect(story.locator('[data-testid="workbook-story-quick-select-state"]')).toContainText('"region": "west"');
  });

  test("三种布局均渲染", async ({ page }) => {
    await openStory(page, workbookStoryIds.quickLayouts);

    const story = page.locator('[data-testid="workbook-story-quick-layouts"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.locator('[data-testid="workbook-story-quick-layout-vertical"]')).toBeVisible();
    await expect(story.locator('[data-testid="workbook-story-quick-layout-horizontal"]')).toBeVisible();
    await expect(story.locator('[data-testid="workbook-story-quick-layout-grid"]')).toBeVisible();
  });
});

test.describe("校验系统", () => {
  test("内置同步校验规则实时报错", async ({ page }) => {
    await openStory(page, workbookStoryIds.syncValidators);

    const story = page.locator('[data-testid="workbook-story-validation-sync"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // validateMode=onChange：值变化即触发校验
    const account = story.getByLabel("账号");
    await account.fill("a"); // 与原值不同，触发校验（minLength: 3）
    await expect(story.getByText("账号至少 3 个字符")).toBeVisible({ timeout: 5_000 });

    const note = story.getByLabel("备注");
    await note.fill("换一段同样超长的不同文案用于触发最大长度校验规则");
    await expect(story.getByText("备注不能超过 20 个字符")).toBeVisible({ timeout: 5_000 });

    const mobile = story.getByLabel("手机号");
    await mobile.fill("1380000"); // 与原值不同，仍不满足 11 位手机号规则
    await expect(story.getByText("手机号格式不正确")).toBeVisible({ timeout: 5_000 });
  });

  test("异步校验命中 mock 已占用名单", async ({ page }) => {
    await openStory(page, workbookStoryIds.asyncValidation);

    const story = page.locator('[data-testid="workbook-story-validation-async"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const username = story.getByLabel("用户名");
    await username.fill("taken");
    await username.blur();

    // 字段错误以 <small> 渲染，避免命中 inspector 提示文案
    await expect(story.locator("small", { hasText: "用户名已被占用" })).toBeVisible({ timeout: 5_000 });
  });

  test("条件校验：金额超过阈值才要求原因", async ({ page }) => {
    await openStory(page, workbookStoryIds.conditionalValidation);

    const story = page.locator('[data-testid="workbook-story-validation-conditional"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const amount = story.getByLabel("金额", { exact: true });
    await amount.fill("800");
    await amount.blur();
    await expect(story.getByText("大额需填写原因")).toBeVisible({ timeout: 5_000 });

    // 金额超过阈值后，「原因」参与必填校验（validateMode=onBlur，失焦触发）
    const reason = story.getByRole("textbox", { name: "原因" });
    await reason.focus();
    await reason.blur();
    await expect(story.getByText("原因不能为空")).toBeVisible({ timeout: 5_000 });
  });
});
