import { expect, test } from "@playwright/test";

import { openStory } from "./fixtures";

test.describe("审核中表单只读（formView.config.readOnly）", () => {
  test("只读表单：字段禁用、操作按钮隐藏、明细不可增删", async ({ page }) => {
    await openStory(page, "workbook-readonly--approving-read-only");

    const story = page.locator('[data-testid="workbook-story-readonly-approving"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    // 全部字段禁用
    await expect(story.getByLabel("单据编号")).toBeDisabled();
    await expect(story.getByLabel("单据类型")).toBeDisabled();
    await expect(story.getByLabel("发起人")).toBeDisabled();
    await expect(story.getByLabel("影响金额")).toBeDisabled();
    await expect(story.getByLabel("变更原因")).toBeDisabled();
    await expect(story.getByLabel("变更前")).toBeDisabled();
    await expect(story.getByLabel("变更后")).toBeDisabled();

    // 提交 / 重置按钮不渲染
    await expect(story.getByRole("button", { name: /提交|submit/i })).toHaveCount(0);
    await expect(story.getByRole("button", { name: /重置|reset/i })).toHaveCount(0);

    // repeat 明细的增删按钮禁用（数据含 2 条明细 → 2 个删除按钮）
    await expect(story.getByRole("button", { name: "新增明细" })).toBeDisabled();
    const deleteButtons = story.getByRole("button", { name: "删除明细" });
    await expect(deleteButtons).toHaveCount(2);
    await expect(deleteButtons.first()).toBeDisabled();
    await expect(deleteButtons.nth(1)).toBeDisabled();
  });

  test("草稿可编辑 vs 审核中只读 同屏对比", async ({ page }) => {
    await openStory(page, "workbook-readonly--draft-vs-approving");

    const draft = page.locator('[data-testid="workbook-story-readonly-draft"]');
    const approving = page.locator('[data-testid="workbook-story-readonly-approving-2"]');
    await expect(draft).toBeVisible({ timeout: 15_000 });
    await expect(approving).toBeVisible();

    // 草稿：字段可编辑、含提交按钮
    await expect(draft.getByLabel("单据编号")).toBeEnabled();
    await expect(draft.getByRole("button", { name: /提交|submit/i })).toBeVisible();

    // 审核中：字段禁用、无提交按钮
    await expect(approving.getByLabel("单据编号")).toBeDisabled();
    await expect(approving.getByRole("button", { name: /提交|submit/i })).toHaveCount(0);
  });

  test("Quick API SimpleForm readOnly prop 生效", async ({ page }) => {
    await openStory(page, "workbook-readonly--quick-read-only");

    const story = page.locator('[data-testid="workbook-story-readonly-quick-shell"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    await expect(story.getByLabel("变更标题")).toBeDisabled();
    await expect(story.getByLabel("变更原因")).toBeDisabled();
    await expect(story.getByRole("button", { name: /提交|submit/i })).toHaveCount(0);
  });
});
