import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { storyUrl, workbookStoryIds } from "./fixtures";

interface Entry {
  id: string;
  type: string;
}

const CORE_STORIES = [
  workbookStoryIds.documentEditorBasic,
  workbookStoryIds.productionShowcase,
  "workbook-readonly--draft-vs-approving",
] as const;

async function analyze(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
}

function format(violations: Awaited<ReturnType<typeof analyze>>["violations"]): string[] {
  return violations.map(
    (violation) =>
      `${violation.impact ?? "unknown"} ${violation.id}: ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
}

test.describe("Storybook 无障碍门禁", () => {
  test("三个核心 story 无 WCAG A/AA 违规", async ({ page }) => {
    test.setTimeout(180_000);
    const failures: string[] = [];
    for (const id of CORE_STORIES) {
      await page.goto(storyUrl(id));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const { violations } = await analyze(page);
      for (const line of format(violations)) {
        failures.push(`${id} → ${line}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test("全部 docs 页无 WCAG A/AA 违规", async ({ page }) => {
    test.setTimeout(600_000);
    const response = await page.request.get("/index.json");
    const entries = Object.values(((await response.json()) as { entries: Record<string, Entry> }).entries);
    const docs = entries.filter((entry) => entry.type === "docs").map((entry) => entry.id);
    expect(docs.length).toBe(16);

    const failures: string[] = [];
    for (const id of docs) {
      await page.goto(`/iframe.html?id=${id}&viewMode=docs`);
      await page.waitForLoadState("networkidle");
      await page.locator("#storybook-docs .sbdocs").first().waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(300);
      const { violations } = await analyze(page);
      for (const line of format(violations)) {
        failures.push(`${id} → ${line}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

test.describe("Storybook docs 资源", () => {
  test("docs 页无 404 资源，且正文字体不是浏览器默认衬线体", async ({ page }) => {
    const failures: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on("requestfailed", (request) => {
      failures.push(`failed ${request.url()}`);
    });

    await page.goto("/iframe.html?id=getting-started--docs&viewMode=docs");
    await page.waitForLoadState("networkidle");
    await page.locator("#storybook-docs .sbdocs").first().waitFor({ state: "visible", timeout: 30_000 });

    const fontFamily = await page.evaluate(() => {
      const paragraph = document.querySelector("#storybook-docs .sbdocs p");
      return paragraph == null ? "" : getComputedStyle(paragraph).fontFamily;
    });
    expect(fontFamily.toLowerCase()).not.toContain("times");
    expect(fontFamily.length).toBeGreaterThan(0);
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
