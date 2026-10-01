import { describe, expect, it, vi } from "vitest";
import type { PageViewDefinition } from "../core/types";
import type { WorkbookDefinition } from "../schema/generated-types";
import { createMinimalTtf } from "./fonts/__fixtures__/minimalTtf";
import { createFetchFontLoader, createWorkbookPdfFromPageView, exportWorkbookPdf } from "./pdf";

const cjkPageView: PageViewDefinition = {
  type: "page",
  pageSettings: { width: 595, height: 842, marginTop: 40, marginRight: 40, marginBottom: 40, marginLeft: 40 },
  content: [
    { type: "paragraph", runs: [{ type: "text", text: "中文测试" }] },
    {
      type: "table",
      columns: [200, 200],
      rows: [
        {
          cells: [
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "中" }] }] },
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "ASCII" }] }] },
          ],
        },
      ],
    },
  ],
};

function toLatin1(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return result;
}

describe("workbook pdf font embedding", () => {
  it("embeds a TrueType font and encodes CJK text as glyph ids", () => {
    const result = createWorkbookPdfFromPageView(cjkPageView, {
      font: { id: "TestFont", bytes: createMinimalTtf() },
    });
    const text = toLatin1(result.bytes);

    expect(text.startsWith("%PDF-1.7")).toBe(true);
    // Embedded font chain
    expect(text).toContain("/FontFile2");
    expect(text).toContain("/Subtype /CIDFontType2");
    expect(text).toContain("/Encoding /Identity-H");
    expect(text).toContain("/CIDToGIDMap /Identity");
    expect(text).toContain("/ToUnicode");
    expect(text).toContain("/BaseFont /TestFont");
    // Content stream: 中 (U+4E2D) → gid 2, 文 (U+6587) → gid 3;
    // 测/试 are not in the font so they fall back to gid 0 (.notdef)
    expect(text).toContain("<0002000300000000>");
    expect(text).toContain("<0002>");
    // ASCII text still uses Helvetica
    expect(text).toContain("(ASCII)");
    // Widths are in 1000-unit text space: advance 500 / unitsPerEm 1000 * 1000 = 500.
    // Used glyphs: .notdef(0) for 测/试, 中(2), 文(3). ASCII text goes through /F1.
    expect(text).toContain("0 [500]");
    expect(text).toContain("2 [500]");
    expect(text).toContain("3 [500]");
    // ToUnicode maps glyph ids back to unicode for copy/search
    expect(text).toContain("<0002> <4E2D>");
    expect(text).toContain("<0003> <6587>");
  });

  it("writes byte-accurate xref offsets with an embedded binary font", () => {
    const result = createWorkbookPdfFromPageView(cjkPageView, {
      font: { id: "TestFont", bytes: createMinimalTtf() },
    });
    const text = toLatin1(result.bytes);

    const startxref = Number(/startxref\s+(\d+)/.exec(text)?.[1]);
    expect(startxref).toBeGreaterThan(0);

    const xrefIndex = text.indexOf("\nxref\n", startxref - 20);
    expect(xrefIndex).toBeGreaterThan(0);
    const xrefLines = text.slice(xrefIndex + 1).split("\n");
    const total = Number(xrefLines[1]?.trim().split(" ")[1]);
    const entries = xrefLines.slice(2, 2 + total);

    entries.forEach((line, index) => {
      const offset = Number(line.split(" ")[0]);
      if (index === 0) {
        expect(offset).toBe(0); // free-list head
        return;
      }
      // The offset must point at the start of "<index> 0 obj"
      const marker = `${index} 0 obj`;
      expect(text.slice(offset, offset + marker.length)).toBe(marker);
    });
  });

  it("keeps the STSong-Light fallback when no font is provided", () => {
    const result = createWorkbookPdfFromPageView(cjkPageView);
    const text = toLatin1(result.bytes);

    expect(text).toContain("/BaseFont /STSong-Light");
    expect(text).not.toContain("/FontFile2");
    // CJK text is still encoded as UTF-16BE with BOM (best effort fallback)
    expect(text).toContain("<FEFF4E2D6587");
  });

  it("sanitizes the BaseFont name", () => {
    const result = createWorkbookPdfFromPageView(cjkPageView, {
      font: { id: "My Font (v2)", bytes: createMinimalTtf() },
    });
    expect(toLatin1(result.bytes)).toContain("/BaseFont /MyFontv2");
  });

  it("resolves the CJK font through fontLoader in exportWorkbookPdf", async () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      views: [cjkPageView],
    };
    const requestedIds: string[] = [];
    const result = await exportWorkbookPdf({
      workbook,
      fontLoader: {
        load: async (fontId) => {
          requestedIds.push(fontId);
          return { id: "LoadedFont", bytes: createMinimalTtf() };
        },
      },
    });

    expect(requestedIds).toEqual(["cjk"]);
    const text = toLatin1(result.bytes);
    expect(text).toContain("/BaseFont /LoadedFont");
    expect(text).toContain("/FontFile2");
  });

  it("prefers an explicit font over fontLoader", async () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      views: [cjkPageView],
    };
    const loaderSpy = vi.fn(async () => ({ id: "LoaderFont", bytes: createMinimalTtf() }));
    const result = await exportWorkbookPdf({
      workbook,
      font: { id: "ExplicitFont", bytes: createMinimalTtf() },
      fontLoader: { load: loaderSpy },
    });

    expect(loaderSpy).not.toHaveBeenCalled();
    expect(toLatin1(result.bytes)).toContain("/BaseFont /ExplicitFont");
  });

  it("createFetchFontLoader wraps a fetch response into a PdfFontEntry", async () => {
    const fontBytes = createMinimalTtf();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength),
    }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const loader = createFetchFontLoader("/fonts/test.ttf", "FetchFont");
      const font = await loader.load("cjk");
      expect(font).toEqual({ id: "FetchFont", bytes: expect.any(ArrayBuffer) });
      expect(fetchMock).toHaveBeenCalledWith("/fonts/test.ttf");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("createFetchFontLoader rejects failed fetches", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const loader = createFetchFontLoader("/fonts/missing.ttf");
      await expect(loader.load("cjk")).rejects.toThrow(/HTTP 404/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
