/**
 * Theme token gate.
 *
 * `docs-site/guides/theming.md` documents the `--bf-*` custom properties as the
 * supported theming surface. This gate keeps that documentation honest:
 *
 *  1. every token used by the stylesheet is documented,
 *  2. every documented token is used — unless it is explicitly marked
 *     "reserved" (documented surface, not yet consumed by the theme),
 *  3. the documented default matches the `var()` fallback in the stylesheet,
 *  4. the theme carries no `data:`/`url()` image references, so it renders
 *     under a strict `default-src 'self'` CSP without an `img-src` relaxation.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname ?? __dirname, "../..");
const CSS_PATH = resolve(ROOT, "src/styles/workbook-theme.css");
const DOC_PATH = resolve(ROOT, "docs-site/guides/theming.md");

const css = readFileSync(CSS_PATH, "utf8");
const doc = readFileSync(DOC_PATH, "utf8");

/** Token usages plus their inline fallbacks, in source order. */
function collectUsages(source: string): Map<string, string[]> {
  const usages = new Map<string, string[]>();
  const pattern = /var\(\s*(--bf-[a-z0-9-]+)\s*,/g;

  for (let match = pattern.exec(source); match != null; match = pattern.exec(source)) {
    const [, token] = match;
    // Walk a paren-balanced window to the end of the fallback expression.
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    for (; index < source.length && depth > 0; index++) {
      const char = source[index];
      if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
      }
    }
    const list = usages.get(token) ?? [];
    list.push(normalize(source.slice(start, index - 1)));
    usages.set(token, list);
  }

  return usages;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Rows of the token reference tables: | `--bf-x` | meaning | default | */
function collectDocumented(): Map<string, { reserved: boolean; default?: string }> {
  const documented = new Map<string, { reserved: boolean; default?: string }>();
  for (const line of doc.split("\n")) {
    if (!line.startsWith("|")) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim());
    const tokenCell = cells[1] ?? "";
    const tokenMatch = tokenCell.match(/^`(--bf-[a-z0-9-]+)`$/);
    if (!tokenMatch) {
      continue;
    }
    const meaning = cells[2] ?? "";
    const defaultCell = cells[3] ?? "";
    const defaultValue = defaultCell.match(/^`(.+)`$/)?.[1];
    documented.set(tokenMatch[1], { reserved: meaning.includes("reserved"), default: defaultValue });
  }
  return documented;
}

const usages = collectUsages(css);
const documented = collectDocumented();

describe("D8: theme tokens", () => {
  it("documents every token the stylesheet consumes", () => {
    const undocumented = [...usages.keys()].filter((token) => !documented.has(token));
    expect(undocumented).toEqual([]);
  });

  it("uses every documented token, except those marked reserved", () => {
    const inert = [...documented.entries()]
      .filter(([token, meta]) => !meta.reserved && !usages.has(token))
      .map(([token]) => token);
    expect(inert).toEqual([]);
  });

  it("keeps reserved tokens out of the stylesheet", () => {
    const wired = [...documented.entries()]
      .filter(([token, meta]) => meta.reserved && usages.has(token))
      .map(([token]) => token);
    expect(wired).toEqual([]);
  });

  it("documents the default the stylesheet actually falls back to", () => {
    const mismatched: string[] = [];
    for (const [token, meta] of documented) {
      if (meta.default == null || meta.reserved) {
        continue;
      }
      const fallbacks = usages.get(token) ?? [];
      if (!fallbacks.includes(normalize(meta.default))) {
        mismatched.push(`${token}: docs say "${meta.default}", css has ${JSON.stringify(fallbacks)}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it("renders without data: images (strict CSP, no img-src relaxation needed)", () => {
    expect(css).not.toMatch(/url\(\s*["']?data:/);
  });
});
