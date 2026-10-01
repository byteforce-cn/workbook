import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("Workbook 远端选项源场景", () => {
  test("url 选项源会解析 $field 参数、映射返回数据，并在无关字段变化时命中 memory cache", async ({ page }) => {
    await openStory(page, workbookStoryIds.remoteOptions);

    const story = page.locator('[data-testid="workbook-story-remote-options"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const city = story.getByLabel("远端城市");
    const remarks = story.getByLabel("备注");
    const requestLog = story.locator('[data-testid="workbook-story-remote-options-log"]');

    await expect(city.locator('option[value="sh"]')).toHaveText("上海站");
    await expect(requestLog).toContainText('"urlCalls": 1');
    await expect(requestLog).toContainText('"context": {');
    await expect(requestLog).toContainText('"region": "east"');

    await remarks.fill("只改备注，不该触发城市远端重取");
    await expect(requestLog).toContainText('"urlCalls": 1');

    await story.getByLabel("区域").selectOption("west");
    await expect(city.locator('option[value="cd"]')).toHaveText("成都站");
    await expect(requestLog).toContainText('"urlCalls": 2');

    await story.getByLabel("区域").selectOption("east");
    await expect(city.locator('option[value="sh"]')).toHaveText("上海站");
    await expect(requestLog).toContainText('"urlCalls": 2');
  });

  test("graphql 选项源会发送 query+variables，请求结果可映射并命中 session cache", async ({ page }) => {
    await openStory(page, workbookStoryIds.remoteOptions);

    const story = page.locator('[data-testid="workbook-story-remote-options"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const assignee = story.getByLabel("远端负责人");
    const requestLog = story.locator('[data-testid="workbook-story-remote-options-log"]');

    await expect(assignee.locator('option[value="u1"]')).toHaveText("张三");
    await expect(requestLog).toContainText('"graphqlCalls": 1');
    await expect(requestLog).toContainText('"query": "query Assignees');
    await expect(requestLog).toContainText('"mode": "standard"');

    await story.getByLabel("交付模式").selectOption("rush");
    await expect(assignee.locator('option[value="u3"]')).toHaveText("赵六");
    await expect(requestLog).toContainText('"graphqlCalls": 2');

    await story.getByLabel("交付模式").selectOption("standard");
    await expect(assignee.locator('option[value="u1"]')).toHaveText("张三");
    await expect(requestLog).toContainText('"graphqlCalls": 2');
  });
});
