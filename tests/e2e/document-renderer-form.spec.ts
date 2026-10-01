import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("DocumentRenderer 表单场景", () => {
  test("空值提交会显示必填校验，修正后允许继续编辑", async ({ page }) => {
    await openStory(page, workbookStoryIds.formEditable);

    const formStory = page.locator('[data-testid="workbook-story-form-editable"]');
    await expect(formStory).toBeVisible({ timeout: 15_000 });

    const input = formStory.getByLabel("客户姓名");
    await input.fill("");
    await formStory.getByRole("button", { name: "保存" }).click();
    await expect(formStory.getByText("客户姓名不能为空")).toBeVisible();

    await input.fill("Charlie");
    await expect(input).toHaveValue("Charlie");
  });
});
