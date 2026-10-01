/**
 * TrueType font embedding for PDF export.
 *
 * A caller supplies a `PdfFontEntry` (TrueType bytes + a BaseFont name) — either
 * pre-loaded via the `font` option or resolved asynchronously through a
 * `PdfFontLoader` in `exportWorkbookPdf`. `buildEmbeddedPdfFont` parses the font,
 * discovers which glyphs the document actually uses, and produces everything the
 * PDF writer needs:
 *
 *  - `metrics` — parsed font metrics (cmap, widths, bbox, …)
 *  - `usedGlyphIds` — glyph ids referenced by the document text
 *  - `toUnicode` — glyph id → unicode code point, for the ToUnicode CMap
 *  - `id` — sanitized BaseFont name
 */

import { parseTrueTypeFont, type TrueTypeFontMetrics } from "./parseTrueType";

/** A TrueType font ready to be embedded into a PDF. */
export interface PdfFontEntry {
  /** BaseFont name used in the PDF (auto-sanitized). E.g. "NotoSansSC-Regular". */
  id: string;
  /** TrueType font bytes (TTF only — OTF/CFF and TTC are rejected). */
  bytes: ArrayBuffer | Uint8Array;
}

/** Async resolver used by `exportWorkbookPdf` to obtain the CJK font. */
export interface PdfFontLoader {
  load(fontId: string): Promise<PdfFontEntry | null | undefined>;
}

/** A parsed, document-scoped font ready for PDF object generation. */
export interface EmbeddedPdfFont {
  /** Sanitized BaseFont name. */
  id: string;
  metrics: TrueTypeFontMetrics;
  /** Raw TrueType bytes (embedded as `/FontFile2`). */
  bytes: Uint8Array;
  /** Glyph ids actually used by the document's non-ASCII text. */
  usedGlyphIds: Set<number>;
  /** Glyph id → first unicode code point (for the ToUnicode CMap). */
  toUnicode: Map<number, number>;
}

function hasNonAscii(value: string): boolean {
  for (const char of value) {
    if ((char.codePointAt(0) ?? 0) > 0x7f) {
      return true;
    }
  }
  return false;
}

function sanitizeFontName(id: string): string {
  const sanitized = id.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.length > 0 ? sanitized : "WorkbookCJK";
}

/**
 * Parses the font and marks every glyph referenced by the given document text.
 *
 * Only text that will actually be emitted through the embedded font (strings
 * containing at least one non-ASCII character) contributes glyphs, keeping the
 * `/W` width array and ToUnicode CMap scoped to what the document uses.
 */
export function buildEmbeddedPdfFont(font: PdfFontEntry, texts: Iterable<string>): EmbeddedPdfFont {
  const bytes = font.bytes instanceof Uint8Array ? font.bytes : new Uint8Array(font.bytes);
  const metrics = parseTrueTypeFont(bytes);

  const usedGlyphIds = new Set<number>();
  const toUnicode = new Map<number, number>();

  for (const text of texts) {
    if (!hasNonAscii(text)) {
      continue;
    }
    for (const char of text) {
      const codePoint = char.codePointAt(0) ?? 0;
      const gid = metrics.cmap.get(codePoint) ?? 0;
      usedGlyphIds.add(gid);
      if (!toUnicode.has(gid)) {
        toUnicode.set(gid, codePoint);
      }
    }
  }

  return {
    id: sanitizeFontName(font.id),
    metrics,
    bytes,
    usedGlyphIds,
    toUnicode,
  };
}
