import { expect, test } from "@playwright/test";

interface Entry {
  id: string;
  type: string;
}

/**
 * Autodocs pages must mount each story once and keep one heading per section.
 * The default Storybook template renders `<Primary/>` and then `<Stories/>`,
 * which mounted the primary story twice (issue #73 P0-4).
 */
test.describe("Storybook docs 页结构", () => {
  test("每个 docs 页只挂载一次 primary story，且无重复 h2", async ({ page }) => {
    test.setTimeout(300_000);

    const response = await page.request.get("/index.json");
    const entries = Object.values(((await response.json()) as { entries: Record<string, Entry> }).entries);
    const docs = entries.filter((entry) => entry.type === "docs").map((entry) => entry.id);
    expect(docs.length).toBe(16);

    const failures: string[] = [];
    for (const id of docs) {
      await page.goto(`/iframe.html?id=${id}&viewMode=docs`);
      await page.waitForLoadState("networkidle");
      await page.locator("#storybook-docs .sbdocs").first().waitFor({ state: "visible", timeout: 30_000 });

      const result = await page.evaluate(() => {
        const mounts = new Map<string, number>();
        for (const element of document.querySelectorAll("#storybook-docs [data-testid]")) {
          const testId = element.getAttribute("data-testid");
          if (testId == null || !testId.startsWith("workbook-story-") || testId.endsWith("-code")) {
            continue;
          }
          mounts.set(testId, (mounts.get(testId) ?? 0) + 1);
        }
        const duplicatedMounts = Array.from(mounts)
          .filter(([, count]) => count > 1)
          .map(([testId, count]) => `${testId}×${count}`);

        // 并排对比（草稿 vs 审核中、桌面 vs 手机）会有意重复标题，所以按 mount
        // 分组：同一个 story 画布内不允许出现两处同名 h2。
        const perMount = new Map<string, string[]>();
        for (const heading of document.querySelectorAll("#storybook-docs h2")) {
          const text = heading.textContent?.trim() ?? "";
          const mount = heading.closest("[data-testid^='workbook-story-']");
          if (text.length === 0 || mount == null) {
            continue;
          }
          const key = mount.getAttribute("data-testid") as string;
          perMount.set(key, [...(perMount.get(key) ?? []), text]);
        }
        const duplicatedHeadings = Array.from(perMount)
          .flatMap(([mount, texts]) =>
            texts.filter((text, index) => texts.indexOf(text) !== index).map((text) => `${mount}:${text}`),
          )
          .filter((entry, index, all) => all.indexOf(entry) === index);

        return { duplicatedMounts, duplicatedHeadings };
      });

      if (result.duplicatedMounts.length > 0 || result.duplicatedHeadings.length > 0) {
        failures.push(
          `${id}: mounts=[${result.duplicatedMounts.join(", ")}] h2=[${result.duplicatedHeadings.join(", ")}]`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
