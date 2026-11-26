import type { Page } from "@playwright/test";

/**
 * Helpers for asserting that Storybook docs/story pages do not push content
 * outside the viewport. Used by the layout, docs-content and a11y specs.
 */

export interface StorybookIndex {
  /** Docs entry ids (e.g. `workbook-documenteditor--docs`). */
  docs: string[];
  /** Story entry ids (e.g. `workbook-documenteditor--basic`). */
  stories: string[];
}

export interface OverflowReport {
  scrollWidth: number;
  innerWidth: number;
  /**
   * Elements whose right edge exceeds the viewport and which cannot be reached
   * by scrolling: every scrollable (auto/scroll) ancestor either does not
   * scroll horizontally or the overflow sits in a `hidden`/`clip` container.
   */
  offenders: string[];
}

/** Reads the dev/preview server entry index (no static build required). */
export async function loadIndex(page: Page): Promise<StorybookIndex> {
  const response = await page.request.get("/index.json");
  if (!response.ok()) {
    throw new Error(`GET /index.json failed: ${response.status()}`);
  }
  const payload = (await response.json()) as {
    entries?: Record<string, { id?: string; type?: string }>;
  };
  const entries = Object.values(payload.entries ?? {});
  return {
    docs: entries.filter((entry) => entry.type === "docs").map((entry) => entry.id as string),
    stories: entries.filter((entry) => entry.type === "story").map((entry) => entry.id as string),
  };
}

/** URL of a docs page rendered inside the preview iframe (no manager chrome). */
export function docsUrl(id: string): string {
  return `/iframe.html?id=${id}&viewMode=docs`;
}

/** Waits until the docs page has rendered its content blocks. */
export async function waitForDocs(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.locator("#storybook-docs .sbdocs").first().waitFor({ state: "visible", timeout: 30_000 });
}

/** Measures horizontal overflow of the current iframe document. */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    /** True for `.sr-only`-style nodes: clipped to nothing via `clip`/`clip-path`. */
    const isVisuallyHidden = (element: Element): boolean => {
      const style = getComputedStyle(element);
      const clipped = style.clip !== "auto" && style.clip !== "" && style.clip !== "none";
      return clipped || (style.clipPath !== "none" && style.clipPath !== "");
    };

    const describe = (element: Element): string => {
      const testId = element.getAttribute("data-testid");
      const tag = element.tagName.toLowerCase();
      const id = element.id.length > 0 ? `#${element.id}` : "";
      return testId == null ? `${tag}${id}` : `${tag}[data-testid="${testId}"]`;
    };

    const offenders: string[] = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        continue;
      }
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.right <= window.innerWidth + 1) {
        continue;
      }

      // Walk up: content contained by any non-`visible` overflow ancestor is
      // clipped or scrollable by design (sheet panes, sr-only fallbacks, code
      // blocks), so it is not "content escaping the layout". The page-level
      // `scrollWidth` check below still catches a document that scrolls sideways.
      let contained = element.tagName === "CANVAS" || isVisuallyHidden(element);
      for (let ancestor = element.parentElement; ancestor != null && !contained; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (
          ancestorStyle.overflowX !== "visible" ||
          ancestorStyle.overflowY !== "visible" ||
          isVisuallyHidden(ancestor)
        ) {
          contained = true;
        }
      }
      if (!contained) {
        offenders.push(describe(element));
      }
    }

    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      offenders: Array.from(new Set(offenders)).slice(0, 30),
    };
  });
}
