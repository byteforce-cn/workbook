/**
 * The editor projection must accept every page fixture the schema declares
 * valid. Overlay blocks (header / footer / watermark / floating) are filtered
 * the same way the editor does before projecting the flow; their absence from
 * the ProseMirror document is the only allowed diagnostic on the raw view.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PageBlockDefinition, PageViewDefinition } from "../../src/core/types";
import { toProseMirror } from "../../src/editor/codec/toProseMirror";
import { isOverlayBlock } from "../../src/editor/layout/mergeContent";
import type { WorkbookDefinition } from "../../src/schema/generated-types";

const CONFORMANCE_PAGE_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures/conformance/page");

interface Case {
  name: string;
  workbook: WorkbookDefinition;
  views: PageViewDefinition[];
}

function loadCases(): Case[] {
  return readdirSync(CONFORMANCE_PAGE_DIR)
    .filter((file) => file.endsWith(".valid.json"))
    .sort()
    .map((file) => {
      const workbook = JSON.parse(readFileSync(resolve(CONFORMANCE_PAGE_DIR, file), "utf8")) as WorkbookDefinition;
      const views = workbook.views.filter((candidate): candidate is PageViewDefinition => candidate.type === "page");
      if (views.length === 0) {
        throw new Error(`${file} has no page view`);
      }
      return { name: file, workbook, views };
    });
}

function flowContent(view: PageViewDefinition): PageBlockDefinition[] {
  return view.content.filter((block) => !isOverlayBlock(block));
}

const cases = loadCases();

describe("editor projection covers the page conformance fixtures", () => {
  expect(cases.length).toBeGreaterThan(0);

  for (const { name, workbook, views } of cases) {
    for (const [index, view] of views.entries()) {
      const label = `${name} view[${index}]`;

      it(`${label}: only out-of-flow blocks produce diagnostics`, () => {
        const { doc, diagnostics } = toProseMirror(view, {
          styles: workbook.styles ?? undefined,
          registeredComponents: [],
        });

        expect(doc, label).not.toBeNull();
        expect(
          diagnostics.every((diagnostic) => diagnostic.code === "out-of-flow"),
          label,
        ).toBe(true);
      });

      it(`${label}: the editable flow converts without diagnostics`, () => {
        const flowView: PageViewDefinition = { ...view, content: flowContent(view) };
        if (flowView.content.length === 0) {
          return;
        }

        const { doc, diagnostics } = toProseMirror(flowView, {
          styles: workbook.styles ?? undefined,
          registeredComponents: [],
        });

        expect(diagnostics, label).toEqual([]);
        expect(doc, label).not.toBeNull();
      });
    }
  }
});
