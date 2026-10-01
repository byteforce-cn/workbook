import { expect, test } from "@playwright/test";

import { openStory } from "./fixtures";

const capabilityStoryIds = {
  fields: "workbook-fields--primitive-field-types",
  layout: "workbook-layout--tabs-steps-repeat-and-html",
  dependencies: "workbook-dependencies--visibility-and-disable-state",
  options: "workbook-option-sources--custom-driven-options",
} as const;

test.describe("Workbook 能力级 Storybook 场景", () => {
  test("字段故事覆盖基础字段类型并写回数据树", async ({ page }) => {
    await openStory(page, capabilityStoryIds.fields);

    const story = page.locator('[data-testid="workbook-story-fields"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const ownerInput = story.getByRole("textbox", { name: "负责人" });
    await expect(ownerInput).toBeVisible();
    await expect(story.locator('input[type="number"]')).toBeVisible();
    await expect(story.locator('input[type="checkbox"]')).toBeVisible();
    await expect(story.locator('input[type="date"]')).toBeVisible();
    await expect(story.locator("textarea").first()).toBeVisible();
    await expect(story.locator("select").first()).toBeVisible();

    await ownerInput.fill("Zoe");
    await expect(story.locator('[data-testid="workbook-story-fields-state"]')).toContainText('"owner": "Zoe"');
  });

  test("布局故事覆盖 html、tabs、steps 和 repeat", async ({ page }) => {
    await openStory(page, capabilityStoryIds.layout);

    const story = page.locator('[data-testid="workbook-story-layout"]');
    await expect(story).toBeVisible({ timeout: 15_000 });
    await expect(story.getByText("布局提示：先完成基础信息，再补充审批与交付说明。")).toBeVisible();

    // tabs 具备 ARIA tablist/tab 语义（role="tab"）
    await story.getByRole("tab", { name: "审批配置" }).click();
    await expect(story.getByLabel("审批人")).toBeVisible();

    await story.getByRole("button", { name: "下一步" }).click();
    await expect(story.getByLabel("交付备注")).toBeVisible();

    await story.getByRole("button", { name: "新增里程碑" }).click();
    await expect(story.getByRole("button", { name: "删除里程碑" })).toHaveCount(2);
  });

  test("依赖故事覆盖可见性与禁用态切换", async ({ page }) => {
    await openStory(page, capabilityStoryIds.dependencies);

    const story = page.locator('[data-testid="workbook-story-dependencies"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByLabel("审批原因")).toHaveCount(0);
    await expect(story.getByLabel("预算额度")).toBeDisabled();

    await story.getByLabel("允许编辑预算").check();
    await expect(story.getByLabel("预算额度")).toBeEnabled();

    await story.getByLabel("需要升级审批").check();
    await expect(story.getByLabel("审批原因")).toBeVisible();
  });

  test("选项源故事覆盖静态选项和自定义动态选项", async ({ page }) => {
    await openStory(page, capabilityStoryIds.options);

    const story = page.locator('[data-testid="workbook-story-options"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const region = story.getByLabel("区域");
    const city = story.getByLabel("城市");
    await expect(region).toBeVisible();
    await expect(city).toBeVisible();

    await expect(region.locator('option[value="east"]')).toHaveText("华东");
    await region.selectOption("west");
    await expect(city.locator('option[value="cd"]')).toHaveText("成都");

    await city.selectOption("cd");
    await expect(story.locator('[data-testid="workbook-story-options-state"]')).toContainText('"city": "cd"');
  });
});
