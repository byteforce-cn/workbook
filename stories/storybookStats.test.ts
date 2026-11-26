import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { specCount, storyCount, testCount } from "./storybookStats";

const repoRoot = join(__dirname, "..");

/** Counts `export const X: Story|StoryObj` declarations in every story file. */
function countStories(): number {
  const files = readdirSync(join(repoRoot, "stories")).filter((name) => name.endsWith(".stories.tsx"));
  return files.reduce((total, file) => {
    const source = readFileSync(join(repoRoot, "stories", file), "utf8");
    return total + (source.match(/^export const [A-Za-z0-9_]+: (?:Story|StoryObj)/gm)?.length ?? 0);
  }, 0);
}

/** Counts e2e spec files and top-level `test(...)` calls. */
function countE2e(): { specs: number; tests: number } {
  const files = readdirSync(join(repoRoot, "tests/e2e")).filter((name) => name.endsWith(".spec.ts"));
  const tests = files.reduce((total, file) => {
    const source = readFileSync(join(repoRoot, "tests/e2e", file), "utf8");
    return total + (source.match(/^\s*test\(/gm)?.length ?? 0);
  }, 0);
  return { specs: files.length, tests };
}

describe("Storybook 首页的统计数字", () => {
  it("story 数量与 stories/*.stories.tsx 一致", () => {
    expect(storyCount).toBe(countStories());
  });

  it("e2e spec 与用例数量与 tests/e2e 一致", () => {
    const { specs, tests } = countE2e();
    expect(specCount).toBe(specs);
    expect(testCount).toBe(tests);
  });
});
