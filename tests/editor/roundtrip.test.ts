import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../../src/core/types";
import { fromProseMirror } from "../../src/editor/codec/fromProseMirror";
import { toProseMirror } from "../../src/editor/codec/toProseMirror";
import { isOverlayBlock } from "../../src/editor/layout/mergeContent";
import type { WorkbookDefinition } from "../../src/schema/generated-types";
import { shrinkView } from "./shrink";

const ROUNDTRIP_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures/editor/roundtrip");
const GOLDEN_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures/editor/golden");

interface Case {
  name: string;
  workbook: WorkbookDefinition;
  view: PageViewDefinition;
}

function loadCases(): Case[] {
  if (!existsSync(ROUNDTRIP_DIR)) {
    return [];
  }

  return readdirSync(ROUNDTRIP_DIR)
    .filter((file) => file.endsWith(".workbook.json"))
    .sort()
    .map((file) => {
      const workbook = JSON.parse(readFileSync(resolve(ROUNDTRIP_DIR, file), "utf8")) as WorkbookDefinition;
      const view = workbook.views.find((candidate): candidate is PageViewDefinition => candidate.type === "page");
      if (view == null) {
        throw new Error(`${file} has no page view`);
      }
      return { name: file, workbook, view };
    });
}

function normalizeContent(content: PageViewDefinition["content"]): PageViewDefinition["content"] {
  return content.map((block) => {
    if (block.type !== "paragraph") {
      return block;
    }
    const runs: Array<(typeof block.runs)[number]> = [];
    for (const run of block.runs) {
      const previous = runs[runs.length - 1];
      if (previous?.type === "text" && run.type === "text" && previous.bind == null && run.bind == null) {
        const { text: previousText, ...previousFormat } = previous;
        const { text: runText, ...runFormat } = run;
        if (JSON.stringify(previousFormat) === JSON.stringify(runFormat)) {
          runs[runs.length - 1] = { ...previous, text: `${previousText ?? ""}${runText ?? ""}` };
          continue;
        }
      }
      runs.push(run);
    }
    return { ...block, runs: runs as typeof block.runs };
  }) as PageViewDefinition["content"];
}

function flowContent(view: PageViewDefinition) {
  return normalizeContent(view.content.filter((block) => !isOverlayBlock(block)));
}

const cases = loadCases();

describe("editor round-trip contract", () => {
  expect(cases.length).toBeGreaterThanOrEqual(25);

  for (const { name, view } of cases) {
    it(`${name}: wb → pm → wb is lossless`, () => {
      const { doc, diagnostics } = toProseMirror(view);
      expect(doc, name).not.toBeNull();
      expect(
        diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
        name,
      ).toEqual([]);

      const base: PageViewDefinition = { ...view, content: flowContent(view) };
      const result = fromProseMirror(doc as NonNullable<typeof doc>, base);
      expect(result.view.content, name).toEqual(flowContent(view));
      expect(result.view.id, name).toBe(view.id);
      expect(result.view.pageSettings, name).toBe(view.pageSettings);
    });

    it(`${name}: pm → wb → pm is idempotent`, () => {
      const { doc } = toProseMirror(view);
      const base: PageViewDefinition = { ...view, content: flowContent(view) };
      const first = fromProseMirror(doc as NonNullable<typeof doc>, base);
      const second = toProseMirror(first.view, {
        styles: (cases.find((item) => item.name === name)?.workbook.styles as never) ?? undefined,
      });
      expect(second.doc?.toJSON(), name).toEqual(doc?.toJSON());
    });

    it(`${name}: matches the golden projection`, () => {
      const { doc } = toProseMirror(view);
      const golden = JSON.parse(readFileSync(resolve(GOLDEN_DIR, name.replace(".workbook.json", ".pm.json")), "utf8"));
      expect(doc?.toJSON(), name).toEqual(golden);
    });

    it(`${name}: serialization is deterministic`, () => {
      const first = toProseMirror(cases.find((item) => item.name === name)?.view ?? view);
      const second = toProseMirror(cases.find((item) => item.name === name)?.view ?? view);
      expect(JSON.stringify(second.doc?.toJSON()), name).toBe(JSON.stringify(first.doc?.toJSON()));
    });
  }

  it("minimizes a failing document to at most three blocks", () => {
    const view = cases[0]?.view;
    if (view == null) {
      return;
    }

    const failing = {
      ...view,
      content: [
        ...view.content,
        {
          type: "table",
          columns: ["bogus" as never],
          rows: [{ cells: [{ content: [{ type: "paragraph", runs: [{ type: "text", text: "x" }] }] }] }],
        },
      ] as PageViewDefinition["content"],
    };

    const stillFails = (candidate: PageViewDefinition) => {
      const { doc } = toProseMirror(candidate);
      if (doc == null) {
        return true;
      }
      try {
        fromProseMirror(doc, { ...candidate, content: flowContent(candidate) });
        return false;
      } catch {
        return true;
      }
    };

    const result = shrinkView(failing, stillFails);
    expect(result.view.content.length).toBeLessThanOrEqual(3);
    expect(stillFails(result.view)).toBe(true);
  });
});
