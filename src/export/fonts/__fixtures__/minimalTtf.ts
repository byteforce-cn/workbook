/**
 * Builds a tiny, deterministic TrueType font used only by tests.
 *
 * 4 glyphs:
 *  - gid 0: `.notdef`
 *  - gid 1: `A`   (U+0041)
 *  - gid 2: `中`  (U+4E2D)
 *  - gid 3: `文`  (U+6587)
 *
 * Every glyph is a 100×100 square outline. `unitsPerEm` = 1000, ascent = 800,
 * descent = -200, advance width = 500. Both a cmap format 4 subtable
 * (platform 3, encoding 1) and a format 12 subtable (platform 3, encoding 10)
 * are provided so both parser paths are exercised by real data.
 */

class ByteWriter {
  private readonly bytes: number[] = [];

  u8(value: number): void {
    this.bytes.push(value & 0xff);
  }

  u16(value: number): void {
    this.bytes.push((value >>> 8) & 0xff, value & 0xff);
  }

  i16(value: number): void {
    this.u16(value & 0xffff);
  }

  u32(value: number): void {
    this.bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  }

  i32(value: number): void {
    this.u32(value >>> 0);
  }

  zeros(count: number): void {
    for (let i = 0; i < count; i++) {
      this.bytes.push(0);
    }
  }

  raw(data: Uint8Array): void {
    for (const byte of data) {
      this.bytes.push(byte);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }

  get length(): number {
    return this.bytes.length;
  }
}

function buildHead(): Uint8Array {
  const w = new ByteWriter();
  w.u32(0x00010000); // version
  w.u32(0x00010000); // fontRevision
  w.u32(0); // checkSumAdjustment
  w.u32(0x5f0f3cf5); // magicNumber
  w.u16(0); // flags
  w.u16(1000); // unitsPerEm
  w.zeros(8); // created
  w.zeros(8); // modified
  w.i16(0); // xMin
  w.i16(0); // yMin
  w.i16(100); // xMax
  w.i16(100); // yMax
  w.u16(0); // macStyle
  w.u16(8); // lowestRecPPEM
  w.i16(2); // fontDirectionHint
  w.i16(0); // indexToLocFormat (short)
  w.i16(0); // glyphDataFormat
  return w.toUint8Array();
}

function buildHhea(): Uint8Array {
  const w = new ByteWriter();
  w.u32(0x00010000); // version
  w.i16(800); // ascender
  w.i16(-200); // descender
  w.i16(0); // lineGap
  w.u16(500); // advanceWidthMax
  w.i16(0); // minLeftSideBearing
  w.i16(0); // minRightSideBearing
  w.i16(100); // xMaxExtent
  w.i16(1); // caretSlopeRise
  w.i16(0); // caretSlopeRun
  w.i16(0); // caretOffset
  w.zeros(8); // reserved
  w.i16(0); // metricDataFormat
  w.u16(4); // numberOfHMetrics
  return w.toUint8Array();
}

function buildMaxp(): Uint8Array {
  const w = new ByteWriter();
  w.u32(0x00010000); // version 1.0
  w.u16(4); // numGlyphs
  w.u16(4); // maxPoints
  w.u16(1); // maxContours
  w.u16(0); // maxCompositePoints
  w.u16(0); // maxCompositeContours
  w.u16(2); // maxZones
  w.u16(0); // maxTwilightPoints
  w.u16(0); // maxStorage
  w.u16(0); // maxFunctionDefs
  w.u16(0); // maxInstructionDefs
  w.u16(0); // maxStackElements
  w.u16(0); // maxSizeOfInstructions
  w.u16(0); // maxComponentElements
  w.u16(0); // maxComponentDepth
  return w.toUint8Array();
}

function buildHmtx(): Uint8Array {
  const w = new ByteWriter();
  for (let i = 0; i < 4; i++) {
    w.u16(500); // advanceWidth
    w.i16(0); // leftSideBearing
  }
  return w.toUint8Array();
}

function buildGlyph(): Uint8Array {
  const w = new ByteWriter();
  w.i16(1); // numberOfContours
  w.i16(0); // xMin
  w.i16(0); // yMin
  w.i16(100); // xMax
  w.i16(100); // yMax
  w.u16(3); // endPtsOfContours[0]
  w.u16(0); // instructionLength
  w.u8(0x01);
  w.u8(0x01);
  w.u8(0x01);
  w.u8(0x01); // flags: on-curve
  w.i16(0); // x deltas
  w.i16(100);
  w.i16(0);
  w.i16(-100);
  w.i16(0); // y deltas
  w.i16(0);
  w.i16(100);
  w.i16(0);
  return w.toUint8Array();
}

const GLYPH_BYTE_LENGTH = 34;

export function buildCmapFormat4Subtable(): Uint8Array {
  const segCount = 4;
  const w = new ByteWriter();
  w.u16(4); // format
  w.u16(48); // length
  w.u16(0); // language
  w.u16(segCount * 2); // segCountX2
  w.u16(8); // searchRange
  w.u16(2); // entrySelector
  w.u16(0); // rangeShift
  w.u16(0x41);
  w.u16(0x4e2d);
  w.u16(0x6587);
  w.u16(0xffff); // endCode
  w.u16(0); // reservedPad
  w.u16(0x41);
  w.u16(0x4e2d);
  w.u16(0x6587);
  w.u16(0xffff); // startCode
  w.i16(1 - 0x41);
  w.i16(2 - 0x4e2d);
  w.i16(3 - 0x6587);
  w.i16(1); // idDelta
  w.u16(0);
  w.u16(0);
  w.u16(0);
  w.u16(0); // idRangeOffset
  return w.toUint8Array();
}

export function buildCmapFormat12Subtable(): Uint8Array {
  const w = new ByteWriter();
  w.u16(12); // format
  w.u16(0); // reserved
  w.u32(16 + 12 * 3); // length
  w.u32(0); // language
  w.u32(3); // nGroups
  w.u32(0x41);
  w.u32(0x41);
  w.u32(1); // A → gid 1
  w.u32(0x4e2d);
  w.u32(0x4e2d);
  w.u32(2); // 中 → gid 2
  w.u32(0x6587);
  w.u32(0x6587);
  w.u32(3); // 文 → gid 3
  return w.toUint8Array();
}

function buildCmap(): Uint8Array {
  const format4 = buildCmapFormat4Subtable();
  const format12 = buildCmapFormat12Subtable();
  const format4Offset = 4 + 2 * 8;
  const w = new ByteWriter();
  w.u16(0); // version
  w.u16(2); // numTables
  w.u16(3);
  w.u16(1);
  w.u32(format4Offset); // (3,1) → format 4
  w.u16(3);
  w.u16(10);
  w.u32(format4Offset + format4.length); // (3,10) → format 12
  w.raw(format4);
  w.raw(format12);
  return w.toUint8Array();
}

function buildLoca(): Uint8Array {
  const w = new ByteWriter();
  for (let i = 0; i <= 4; i++) {
    w.u16((i * GLYPH_BYTE_LENGTH) / 2);
  }
  return w.toUint8Array();
}

function buildName(): Uint8Array {
  const w = new ByteWriter();
  w.u16(0); // format
  w.u16(0); // count
  w.u16(6); // stringOffset
  return w.toUint8Array();
}

function buildPost(): Uint8Array {
  const w = new ByteWriter();
  w.u32(0x00030000); // version 3.0 (no glyph names)
  w.i32(0); // italicAngle
  w.i16(0); // underlinePosition
  w.i16(0); // underlineThickness
  w.u32(0); // isFixedPitch
  w.zeros(16); // min/max memory values
  return w.toUint8Array();
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

/**
 * Returns a complete, self-contained TTF file (Uint8Array) with the glyphs
 * described at the top of this module.
 */
export function createMinimalTtf(): Uint8Array {
  const glyf = concat([buildGlyph(), buildGlyph(), buildGlyph(), buildGlyph()]);

  const tables: Array<[string, Uint8Array]> = [
    ["head", buildHead()],
    ["hhea", buildHhea()],
    ["maxp", buildMaxp()],
    ["hmtx", buildHmtx()],
    ["cmap", buildCmap()],
    ["loca", buildLoca()],
    ["glyf", glyf],
    ["name", buildName()],
    ["post", buildPost()],
  ];

  const numTables = tables.length;
  const headerSize = 12 + 16 * numTables;

  const align4 = (value: number) => (value + 3) & ~3;

  const offsets: number[] = [];
  let cursor = headerSize;
  for (const [, data] of tables) {
    offsets.push(cursor);
    cursor = align4(cursor + data.length);
  }

  const w = new ByteWriter();
  w.u32(0x00010000); // sfntVersion
  w.u16(numTables);
  const searchRange = 16 * 2 ** Math.floor(Math.log2(numTables));
  w.u16(searchRange);
  w.u16(Math.log2(searchRange / 16));
  w.u16(numTables * 16 - searchRange);
  for (let i = 0; i < numTables; i++) {
    const [tag] = tables[i] as [string, Uint8Array];
    w.u8(tag.charCodeAt(0));
    w.u8(tag.charCodeAt(1));
    w.u8(tag.charCodeAt(2));
    w.u8(tag.charCodeAt(3));
    w.u32(0); // checksum (ignored by our parser)
    w.u32(offsets[i] as number);
    w.u32((tables[i] as [string, Uint8Array])[1].length);
  }
  for (let i = 0; i < numTables; i++) {
    while (w.length < (offsets[i] as number)) {
      w.u8(0);
    }
    w.raw((tables[i] as [string, Uint8Array])[1]);
  }

  return w.toUint8Array();
}

/** Expected cmap mapping for `createMinimalTtf()`. */
export const MINIMAL_TTF_CMAP: Map<number, number> = new Map([
  [0x41, 1],
  [0x4e2d, 2],
  [0x6587, 3],
]);

/** Expected advance width (font units) for every glyph. */
export const MINIMAL_TTF_ADVANCE = 500;

/** Expected unitsPerEm. */
export const MINIMAL_TTF_UNITS_PER_EM = 1000;
