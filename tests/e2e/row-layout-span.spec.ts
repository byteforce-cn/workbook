import { expect, test } from "@playwright/test";

import { openStory, workbookStoryIds } from "./fixtures";

test.describe("row 布局跨列（layoutField.span）", () => {
  test("Web 消费 span：1+1 / 1+2 / 2+1 / 3 混排宽度比例正确", async ({ page }) => {
    await openStory(page, workbookStoryIds.rowFieldSpan);

    const story = page.locator('[data-testid="workbook-story-row-span"]');
    await expect(story).toBeVisible({ timeout: 15_000 });

    const rows = story.locator(".bf-workbook-row");
    await expect(rows).toHaveCount(4);

    const itemWidths = async (rowIndex: number) =>
      rows
        .nth(rowIndex)
        .locator(".bf-workbook-row-item")
        .evaluateAll((items) => items.map((item) => (item as HTMLElement).getBoundingClientRect().width));

    // [A(1), B(1)] → 2 列等宽（基线，与无 span 一致）
    await expect(rows.nth(0)).toHaveAttribute("data-cols", "2");
    await expect(rows.nth(0).locator(".bf-workbook-row-item")).toHaveCount(2);
    const row0 = await itemWidths(0);
    expect(row0[1] / row0[0]).toBeGreaterThan(0.9);
    expect(row0[1] / row0[0]).toBeLessThan(1.1);

    // [C(1), D(2)] → 3 列，D 占 2/3
    await expect(rows.nth(1)).toHaveAttribute("data-cols", "3");
    await expect(rows.nth(1).locator(".bf-workbook-row-item")).toHaveCount(2);
    const row1 = await itemWidths(1);
    expect(row1[1] / row1[0]).toBeGreaterThan(1.9);
    expect(row1[1] / row1[0]).toBeLessThan(2.1);

    // [E(2), F(1)] → 3 列，E 占 2/3
    await expect(rows.nth(2)).toHaveAttribute("data-cols", "3");
    const row2 = await itemWidths(2);
    expect(row2[0] / row2[1]).toBeGreaterThan(1.9);
    expect(row2[0] / row2[1]).toBeLessThan(2.1);

    // [G(3)] → 3 列整行，单一项占满
    await expect(rows.nth(3)).toHaveAttribute("data-cols", "3");
    await expect(rows.nth(3).locator(".bf-workbook-row-item")).toHaveCount(1);
    const row3 = await itemWidths(3);
    expect(row3[0]).toBeGreaterThan(600);

    // 全部字段标签渲染完整
    for (const label of ["短字段A", "短字段B", "短字段C", "宽字段D", "宽字段E", "短字段F", "整行字段G"]) {
      await expect(story.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });
});
