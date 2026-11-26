import { describe, expect, it } from "vitest";

import type { PageViewDefinition } from "../core/types";
import { fromProseMirror } from "../editor/codec/fromProseMirror";
import { toProseMirror } from "../editor/codec/toProseMirror";
import { createWorkbookPdfFromPageView } from "./pdf";

const pageView: PageViewDefinition = {
  type: "page",
  pageSettings: {
    width: 240,
    height: 160,
    marginTop: 16,
    marginRight: 16,
    marginBottom: 16,
    marginLeft: 16,
    defaultFontSize: 12,
    defaultLineHeight: 1.2,
  },
  content: [
    {
      type: "paragraph",
      runs: [{ type: "text", text: Array.from({ length: 60 }, (_, index) => `pdf${index}`).join(" ") }],
    },
    {
      type: "table",
      columns: [100, 100],
      rows: [
        {
          cells: [
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "left" }] }] },
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "right" }] }] },
          ],
        },
      ],
    },
  ],
};

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("workbook binary pdf export", () => {
  it("creates a standalone PDF byte stream from an auto-paginated page view", () => {
    const result = createWorkbookPdfFromPageView(pageView, { config: { copies: 2, collate: true } });
    const text = decode(result.bytes);

    expect(text.startsWith("%PDF-1.7")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(text).toContain("/Type /Page");
    expect(text).toContain(`/Count ${result.pageCount}`);
    expect(result.pageCount).toBeGreaterThan(1);
    expect(result.bytes.byteLength).toBeGreaterThan(800);
  });

  it("produces identical bytes after an editor round-trip", () => {
    const { doc } = toProseMirror(pageView);
    const roundTripped = fromProseMirror(doc as NonNullable<typeof doc>, pageView).view;

    const original = createWorkbookPdfFromPageView(pageView);
    const edited = createWorkbookPdfFromPageView(roundTripped);

    expect(edited.pageCount).toBe(original.pageCount);
    expect(edited.bytes).toEqual(original.bytes);
  });

  it("resolves bound text before writing PDF content streams", () => {
    const result = createWorkbookPdfFromPageView(
      {
        type: "page",
        pageSettings: { width: 240, height: 160, marginTop: 24, marginRight: 24, marginBottom: 24, marginLeft: 24 },
        content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "project.name", mode: "oneWay" } }] }],
      },
      { data: { project: { name: "Project Alpha" } } },
    );

    expect(decode(result.bytes)).toContain("Project Alpha");
  });
});
