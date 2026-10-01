/**
 * Minimal TrueType (TTF) parser for PDF font embedding.
 *
 * Extracts only the tables the PDF writer needs:
 *  - `head` : unitsPerEm, font bounding box
 *  - `hhea` : ascender / descender, number of horizontal metrics
 *  - `maxp` : number of glyphs
 *  - `hmtx` : advance widths per glyph
 *  - `cmap` : unicode → glyph id mapping (format 4 and format 12)
 *
 * Pure data-structure parsing with zero dependencies — works in browsers,
 * Node, and other JS runtimes. OpenType/CFF (OTF) and TrueType Collections
 * (TTC) are intentionally rejected with explicit errors so callers never get
 * a silently-broken PDF.
 */

export interface TrueTypeFontMetrics {
  unitsPerEm: number;
  numGlyphs: number;
  ascent: number;
  descent: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  /** Advance width in font units, indexed by glyph id. */
  advanceWidths: number[];
  /** Unicode code point → glyph id. */
  cmap: Map<number, number>;
}

interface TableRecord {
  offset: number;
  length: number;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}

function readInt16(view: DataView, offset: number): number {
  return view.getInt16(offset, false);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function readTableRecords(view: DataView, tableOffset: number, numTables: number): Map<string, TableRecord> {
  const tables = new Map<string, TableRecord>();
  for (let i = 0; i < numTables; i++) {
    const recordOffset = tableOffset + 16 * i;
    const tag = String.fromCharCode(
      view.getUint8(recordOffset),
      view.getUint8(recordOffset + 1),
      view.getUint8(recordOffset + 2),
      view.getUint8(recordOffset + 3),
    );
    tables.set(tag, {
      offset: readUint32(view, recordOffset + 8),
      length: readUint32(view, recordOffset + 12),
    });
  }
  return tables;
}

function requireTable(tables: Map<string, TableRecord>, tag: string): TableRecord {
  const record = tables.get(tag);
  if (record == null) {
    throw new Error(`Font is missing the required "${tag}" table — not a valid TrueType font.`);
  }
  return record;
}

/**
 * Parses a cmap format 4 subtable starting at `offset`.
 * @internal — exported for direct unit testing; not part of the public API.
 */
export function parseCmapFormat4(view: DataView, offset: number): Map<number, number> {
  const result = new Map<number, number>();
  const segCountX2 = readUint16(view, offset + 6);
  const segCount = segCountX2 / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCountX2 + 2;
  const idDeltas = startCodes + segCountX2;
  const idRangeOffsets = idDeltas + segCountX2;

  for (let i = 0; i < segCount; i++) {
    const end = readUint16(view, endCodes + i * 2);
    const start = readUint16(view, startCodes + i * 2);
    const idDelta = readInt16(view, idDeltas + i * 2);
    const idRangeOffset = readUint16(view, idRangeOffsets + i * 2);

    for (let code = start; code <= end && code !== 0xffff; code++) {
      let gid: number;
      if (idRangeOffset === 0) {
        gid = (code + idDelta) & 0xffff;
      } else {
        const glyphIndex = idRangeOffsets + i * 2 + idRangeOffset + (code - start) * 2;
        gid = readUint16(view, glyphIndex);
        if (gid !== 0) {
          gid = (gid + idDelta) & 0xffff;
        }
      }
      if (gid !== 0) {
        result.set(code, gid);
      }
    }
  }

  return result;
}

/**
 * Parses a cmap format 12 subtable starting at `offset`.
 * @internal — exported for direct unit testing; not part of the public API.
 */
export function parseCmapFormat12(view: DataView, offset: number): Map<number, number> {
  const result = new Map<number, number>();
  const nGroups = readUint32(view, offset + 12);
  for (let i = 0; i < nGroups; i++) {
    const group = offset + 16 + i * 12;
    const startChar = readUint32(view, group);
    const endChar = readUint32(view, group + 4);
    const startGlyph = readUint32(view, group + 8);
    for (let code = startChar; code <= endChar && code <= 0x10ffff; code++) {
      result.set(code, startGlyph + (code - startChar));
    }
  }
  return result;
}

function parseCmap(view: DataView, offset: number, length: number): Map<number, number> {
  const numTables = readUint16(view, offset + 2);

  interface CmapSubtable {
    platform: number;
    encoding: number;
    offset: number;
  }

  const subtables: CmapSubtable[] = [];
  for (let i = 0; i < numTables; i++) {
    const recordOffset = offset + 4 + i * 8;
    subtables.push({
      platform: readUint16(view, recordOffset),
      encoding: readUint16(view, recordOffset + 2),
      offset: readUint32(view, recordOffset + 4),
    });
  }

  // Prefer Unicode-capable subtables, most complete first.
  const preference = (sub: CmapSubtable): number => {
    if (sub.platform === 3 && sub.encoding === 10) return 0; // (3,10) format 12
    if (sub.platform === 0 && sub.encoding === 4) return 1; //  (0,4)  format 12
    if (sub.platform === 3 && sub.encoding === 1) return 2; //  (3,1)  format 4
    if (sub.platform === 0 && sub.encoding === 3) return 3; //  (0,3)  format 4
    if (sub.platform === 0 && sub.encoding === 1) return 4; //  (0,1)  format 4
    if (sub.platform === 0 && sub.encoding === 0) return 5; //  (0,0)  symbol
    return 6;
  };
  const ordered = [...subtables].sort((a, b) => preference(a) - preference(b));

  for (const sub of ordered) {
    const subOffset = offset + sub.offset;
    if (subOffset + 2 > offset + length) {
      continue;
    }
    const format = readUint16(view, subOffset);
    let cmap: Map<number, number> | undefined;
    if (format === 4) {
      cmap = parseCmapFormat4(view, subOffset);
    } else if (format === 12) {
      cmap = parseCmapFormat12(view, subOffset);
    }
    if (cmap != null && cmap.size > 0) {
      return cmap;
    }
  }

  return new Map();
}

/**
 * Parses a TrueType font and returns the metrics required to embed it into a
 * PDF as a CIDFontType2 (Identity-H) font program.
 *
 * @throws If the bytes are not a supported TrueType font (OTF/CFF or TTC).
 */
export function parseTrueTypeFont(data: ArrayBuffer | Uint8Array): TrueTypeFontMetrics {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength < 12) {
    throw new Error("Font data is too small to be a TrueType font.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = readUint32(view, 0);

  if (sfntVersion === 0x4f54544f /* "OTTO" */) {
    throw new Error(
      "Only TrueType (TTF) fonts are supported for PDF embedding; OpenType/CFF (OTF) fonts are not supported yet.",
    );
  }
  if (sfntVersion === 0x74746366 /* "ttcf" */) {
    throw new Error("TrueType Collections (.ttc) are not supported for PDF embedding; provide a single TTF font.");
  }

  const numTables = readUint16(view, 4);
  const tables = readTableRecords(view, 12, numTables);

  const head = requireTable(tables, "head");
  const hhea = requireTable(tables, "hhea");
  const maxp = requireTable(tables, "maxp");
  const hmtx = requireTable(tables, "hmtx");
  const cmapTable = requireTable(tables, "cmap");

  const unitsPerEm = readUint16(view, head.offset + 18);
  if (unitsPerEm === 0) {
    throw new Error("Font has an invalid unitsPerEm value of 0.");
  }

  const ascent = readInt16(view, hhea.offset + 4);
  const descent = readInt16(view, hhea.offset + 6);
  const numberOfHMetrics = readUint16(view, hhea.offset + 34);
  const numGlyphs = readUint16(view, maxp.offset + 4);
  if (numGlyphs === 0) {
    throw new Error("Font declares zero glyphs.");
  }

  const advanceWidths: number[] = [];
  let cursor = hmtx.offset;
  for (let i = 0; i < numberOfHMetrics; i++) {
    advanceWidths.push(readUint16(view, cursor));
    cursor += 4; // advanceWidth (u16) + leftSideBearing (i16)
  }
  const lastAdvance = advanceWidths.length > 0 ? advanceWidths[advanceWidths.length - 1] : 0;
  while (advanceWidths.length < numGlyphs) {
    advanceWidths.push(lastAdvance);
  }

  const cmap = parseCmap(view, cmapTable.offset, cmapTable.length);

  return {
    unitsPerEm,
    numGlyphs,
    ascent,
    descent,
    xMin: readInt16(view, head.offset + 36),
    yMin: readInt16(view, head.offset + 38),
    xMax: readInt16(view, head.offset + 40),
    yMax: readInt16(view, head.offset + 42),
    advanceWidths,
    cmap,
  };
}
