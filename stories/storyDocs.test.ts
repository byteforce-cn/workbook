import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Docs coverage gate for the Storybook pages.
 *
 * Every story must carry a `parameters.docs.description.story` note (rendered as
 * the "what to look at" paragraph under the story heading) and every story file
 * must describe its component once. Checked against the sources so a newly
 * added story cannot land undocumented; the rendering itself is covered by the
 * e2e docs-page sweep.
 */
const repoRoot = join(__dirname, "..");
const storyFiles = readdirSync(join(repoRoot, "stories")).filter((name) => name.endsWith(".stories.tsx"));

interface StoryBlock {
  file: string;
  name: string;
  body: string;
}

function collectStoryBlocks(): StoryBlock[] {
  return storyFiles.flatMap((file) => {
    const source = readFileSync(join(repoRoot, "stories", file), "utf8");
    return source
      .split(/^export const /m)
      .slice(1)
      .flatMap((chunk) => {
        const equals = chunk.indexOf("=");
        const header = chunk.slice(0, equals).trim();
        const match = /^([A-Za-z0-9_]+): (?:Story|StoryObj)$/.exec(header);
        return match == null ? [] : [{ file, name: match[1], body: chunk }];
      });
  });
}

describe("Storybook 文档文案覆盖", () => {
  it("每个 story 都有「该看什么」描述", () => {
    const missing = collectStoryBlocks()
      .filter((block) => !/parameters: storyNote\(/.test(block.body))
      .map((block) => `${block.file} → ${block.name}`);
    expect(missing).toEqual([]);
  });

  it("每个 story 文件都描述了对应的组件", () => {
    const missing = storyFiles.filter((file) => {
      const source = readFileSync(join(repoRoot, "stories", file), "utf8");
      return !/description: { component: componentDocs }/.test(source);
    });
    expect(missing).toEqual([]);
  });

  it("story 数量与 storybookStats 常量一致", () => {
    expect(collectStoryBlocks()).toHaveLength(48);
  });
});
