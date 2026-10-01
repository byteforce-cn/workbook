import { describe, expect, it } from "vitest";
import {
  buildCmapFormat4Subtable,
  buildCmapFormat12Subtable,
  createMinimalTtf,
  MINIMAL_TTF_ADVANCE,
  MINIMAL_TTF_CMAP,
  MINIMAL_TTF_UNITS_PER_EM,
} from "./__fixtures__/minimalTtf";
import { buildEmbeddedPdfFont } from "./embed";
import { parseCmapFormat4, parseCmapFormat12, parseTrueTypeFont } from "./parseTrueType";

describe("parseTrueTypeFont", () => {
  it("extracts head/hhea/maxp/hmtx metrics", () => {
    const metrics = parseTrueTypeFont(createMinimalTtf());
    expect(metrics.unitsPerEm).toBe(MINIMAL_TTF_UNITS_PER_EM);
    expect(metrics.numGlyphs).toBe(4);
    expect(metrics.ascent).toBe(800);
    expect(metrics.descent).toBe(-200);
    expect(metrics.advanceWidths).toEqual([500, 500, 500, 500]);
    expect(metrics.xMin).toBe(0);
    expect(metrics.yMin).toBe(0);
    expect(metrics.xMax).toBe(100);
    expect(metrics.yMax).toBe(100);
  });

  it("maps unicode code points to glyph ids", () => {
    const metrics = parseTrueTypeFont(createMinimalTtf());
    for (const [codePoint, gid] of MINIMAL_TTF_CMAP) {
      expect(metrics.cmap.get(codePoint)).toBe(gid);
    }
    expect(metrics.cmap.get(0x66)).toBeUndefined(); // 'f' is not mapped
  });

  it("accepts both ArrayBuffer and Uint8Array input", () => {
    const bytes = createMinimalTtf();
    const viaBuffer = parseTrueTypeFont(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );
    const viaUint8 = parseTrueTypeFont(bytes);
    expect(viaBuffer.cmap.get(0x4e2d)).toBe(2);
    expect(viaUint8.cmap.get(0x4e2d)).toBe(2);
  });

  it("rejects OpenType/CFF (OTF) data", () => {
    const bytes = new Uint8Array(64);
    bytes[0] = 0x4f;
    bytes[1] = 0x54;
    bytes[2] = 0x54;
    bytes[3] = 0x4f; // "OTTO"
    expect(() => parseTrueTypeFont(bytes)).toThrow(/TrueType/);
  });

  it("rejects TrueType Collections (TTC)", () => {
    const bytes = new Uint8Array(64);
    bytes[0] = 0x74;
    bytes[1] = 0x74;
    bytes[2] = 0x63;
    bytes[3] = 0x66; // "ttcf"
    expect(() => parseTrueTypeFont(bytes)).toThrow(/TTC|TrueType/);
  });

  it("rejects data that is too small", () => {
    expect(() => parseTrueTypeFont(new Uint8Array(4))).toThrow(/too small/);
  });
});

describe("cmap subtables", () => {
  it("parses format 4 (BMP, idRangeOffset = 0)", () => {
    const bytes = buildCmapFormat4Subtable();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(parseCmapFormat4(view, 0)).toEqual(MINIMAL_TTF_CMAP);
  });

  it("parses format 12 (full unicode ranges)", () => {
    const bytes = buildCmapFormat12Subtable();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(parseCmapFormat12(view, 0)).toEqual(MINIMAL_TTF_CMAP);
  });
});

describe("buildEmbeddedPdfFont", () => {
  it("tracks only glyphs referenced by non-ASCII text", () => {
    const embedded = buildEmbeddedPdfFont({ id: "TestFont", bytes: createMinimalTtf() }, ["中文", "ASCII only", "A中"]);
    expect(embedded.id).toBe("TestFont");
    // 中(gid2) 文(gid3) from the first string; A(gid1) 中(gid2) from the third
    expect(Array.from(embedded.usedGlyphIds).sort()).toEqual([1, 2, 3]);
    expect(embedded.toUnicode.get(2)).toBe(0x4e2d);
    expect(embedded.toUnicode.get(3)).toBe(0x6587);
    expect(embedded.toUnicode.get(1)).toBe(0x41);
    // Pure-ASCII strings contribute nothing
    expect(embedded.usedGlyphIds.has(0)).toBe(false);
  });

  it("sanitizes the BaseFont name", () => {
    const embedded = buildEmbeddedPdfFont({ id: "My Font (v2)!", bytes: createMinimalTtf() }, ["中"]);
    expect(embedded.id).toBe("MyFontv2");
    expect(embedded.metrics.advanceWidths[2]).toBe(MINIMAL_TTF_ADVANCE);
  });
});
