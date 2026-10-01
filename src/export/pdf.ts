import type { AssetLoader } from "../core/assets/assetLoader";
import { resolveBindValue } from "../core/bind/resolveBind";
import type { PageBlockDefinition, PageViewDefinition, WorkbookData, WorkbookPrintConfig } from "../core/types";
import { runWorkbookHooks } from "../react/hooks/useWorkbookHooks";
import { pluginRegistry, type WorkbookPluginRegistry } from "../react/registry";
import {
  layoutPageView,
  type PageLayoutPage,
  type PageLayoutResult,
  type PageLayoutStyleResolver,
} from "../renderers/page/pageLayout";
import type { WorkbookDefinition } from "../schema/generated-types";
import { createStyleCatalogResolver } from "../styles/catalog";
import { buildEmbeddedPdfFont, type EmbeddedPdfFont, type PdfFontEntry, type PdfFontLoader } from "./fonts/embed";

export type { PdfFontEntry, PdfFontLoader } from "./fonts/embed";

export interface WorkbookPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  layouts: PageLayoutResult[];
}

/** Cache of pre-loaded asset data: key → { base64, width, height, mime } */
export interface PdfAssetCache {
  [assetKey: string]: {
    base64: string;
    mime: string;
    width?: number;
    height?: number;
  };
}

export interface CreateWorkbookPdfOptions {
  data?: WorkbookData;
  registry?: WorkbookPluginRegistry;
  config?: WorkbookPrintConfig;
  styleResolver?: PageLayoutStyleResolver;
  /** Optional asset loader for embedding images in PDF output. */
  assetLoader?: AssetLoader;
  /**
   * Optional TrueType font embedded for non-ASCII (CJK) text.
   * Without an embedded font, non-ASCII text is emitted with a standard
   * (non-embedded) CJK font and may render blank in viewers that lack it.
   */
  font?: PdfFontEntry;
  /** Optional async font resolver used by `exportWorkbookPdf` (requested with `cjkFontId`). */
  fontLoader?: PdfFontLoader;
  /** Font id requested from `fontLoader` for non-ASCII text. Defaults to "cjk". */
  cjkFontId?: string;
}

export interface ExportWorkbookPdfOptions extends CreateWorkbookPdfOptions {
  workbook: WorkbookDefinition;
  viewId?: string;
  dispatch?: (eventName: string, payload?: unknown) => void;
}

function normalizeCopies(config: WorkbookPrintConfig | undefined): number {
  return Math.max(1, Math.floor(config?.copies ?? 1));
}

function orderPagesForCopies(pages: PageLayoutPage[], config: WorkbookPrintConfig | undefined): PageLayoutPage[] {
  const copies = normalizeCopies(config);
  if (copies === 1) {
    return pages;
  }

  if (config?.collate === false) {
    return pages.flatMap((page) => Array.from({ length: copies }, () => page));
  }

  return Array.from({ length: copies }).flatMap(() => pages);
}

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function hasNonAscii(value: string): boolean {
  for (const char of value) {
    if ((char.codePointAt(0) ?? 0) > 0x7f) {
      return true;
    }
  }
  return false;
}

function toUtf16Hex(value: string): string {
  const bytes = [0xfe, 0xff];
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0x20;
    if (codePoint > 0xffff) {
      const high = Math.floor((codePoint - 0x10000) / 0x400) + 0xd800;
      const low = ((codePoint - 0x10000) % 0x400) + 0xdc00;
      bytes.push(high >> 8, high & 0xff, low >> 8, low & 0xff);
    } else {
      bytes.push(codePoint >> 8, codePoint & 0xff);
    }
  }
  return bytes
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function toGlyphHex(text: string, cmap: Map<number, number>): string {
  let hex = "";
  for (const char of text) {
    const gid = cmap.get(char.codePointAt(0) ?? 0) ?? 0;
    hex += gid.toString(16).padStart(4, "0").toUpperCase();
  }
  return hex;
}

function pdfText(
  x: number,
  yFromTop: number,
  pageHeight: number,
  text: string,
  fontSize = 11,
  embedded?: EmbeddedPdfFont,
) {
  const y = pageHeight - yFromTop - fontSize;
  if (hasNonAscii(text)) {
    const hex = embedded != null ? toGlyphHex(text, embedded.metrics.cmap) : toUtf16Hex(text);
    return `BT /F2 ${fontSize} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex}> Tj ET`;
  }
  return `BT /F1 ${fontSize} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`;
}

function pdfRect(
  x: number,
  yFromTop: number,
  width: number,
  height: number,
  pageHeight: number,
  mode: "S" | "f" = "S",
) {
  const y = pageHeight - yFromTop - height;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${mode}`;
}

function readParagraphText(block: Extract<PageBlockDefinition, { type: "paragraph" }>, data: WorkbookData) {
  return block.runs
    .map((run) => {
      if (run.type === "break") {
        return "\n";
      }
      if (run.type === "inline-image") {
        return run.alt ?? "[image]";
      }
      if (run.bind != null) {
        return String(resolveBindValue(run.bind, data) ?? run.text ?? "");
      }
      return run.text ?? "";
    })
    .join("");
}

function readParagraphFontSize(block: Extract<PageBlockDefinition, { type: "paragraph" }>, fallback: number) {
  const textRun = block.runs.find(
    (run): run is Extract<(typeof block.runs)[number], { type: "text" }> => run.type === "text" && run.fontSize != null,
  );
  return textRun?.fontSize ?? fallback;
}

function splitPdfLines(text: string, width: number, fontSize: number) {
  const maxCharacters = Math.max(1, Math.floor(width / Math.max(1, fontSize * 0.56)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words.length === 0 ? [text] : words) {
    const candidate = currentLine === "" ? word : `${currentLine} ${word}`;
    if (candidate.length > maxCharacters && currentLine !== "") {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines;
}

type PageCellBlock = Extract<
  PageBlockDefinition,
  { type: "table" }
>["rows"][number]["cells"][number]["content"][number];

function renderCellBlocks(
  blocks: PageCellBlock[],
  x: number,
  y: number,
  width: number,
  pageHeight: number,
  data: WorkbookData,
  assetCache: PdfAssetCache,
  embedded?: EmbeddedPdfFont,
): string[] {
  const commands: string[] = [];
  let cursorY = y;

  for (const block of blocks) {
    if (block.type === "paragraph") {
      for (const line of splitPdfLines(readParagraphText(block, data), width, readParagraphFontSize(block, 10))) {
        commands.push(pdfText(x, cursorY, pageHeight, line, 10, embedded));
        cursorY += 12;
      }
    } else if (block.type === "image") {
      const cachedAsset = assetCache[block.src];
      if (cachedAsset) {
        // Embed image as XObject
        const imgWidth = block.width ?? cachedAsset.width ?? 48;
        const imgHeight = block.height ?? cachedAsset.height ?? 32;
        const yPdf = pageHeight - cursorY - imgHeight;
        commands.push(
          "q",
          `${imgWidth.toFixed(2)} 0 0 ${imgHeight.toFixed(2)} ${x.toFixed(2)} ${yPdf.toFixed(2)} cm`,
          `/Im_${block.src.replace(/[^a-zA-Z0-9]/g, "_")} Do`,
          "Q",
        );
        cursorY += imgHeight;
      } else {
        commands.push(pdfRect(x, cursorY, block.width ?? 48, block.height ?? 32, pageHeight));
        commands.push(pdfText(x + 4, cursorY + 12, pageHeight, block.alt ?? block.src, 8, embedded));
        cursorY += block.height ?? 32;
      }
    } else {
      for (const item of block.items) {
        commands.push(
          pdfText(
            x,
            cursorY,
            pageHeight,
            block.listType === "ordered" ? "1." : (block.bulletChar ?? "-"),
            10,
            embedded,
          ),
        );
        commands.push(...renderCellBlocks(item, x + 16, cursorY, width - 16, pageHeight, data, assetCache, embedded));
        cursorY += 16;
      }
    }
  }

  return commands;
}

function renderBlock(
  block: PageLayoutPage["flowBlocks"][number],
  pageHeight: number,
  data: WorkbookData,
  assetCache: PdfAssetCache,
  embedded?: EmbeddedPdfFont,
): string[] {
  const { x, y, width, height } = block;
  const source = block.block;

  if (source.type === "paragraph") {
    return splitPdfLines(readParagraphText(source, data), width, readParagraphFontSize(source, 11)).flatMap(
      (line, index) => [pdfText(x, y + index * 14, pageHeight, line, 11, embedded)],
    );
  }

  if (source.type === "table") {
    const commands: string[] = [];
    const columnWidth = width / Math.max(1, source.columns.length);
    let rowY = y;

    for (const row of source.rows) {
      const rowHeight = row.height ?? Math.max(28, height / Math.max(1, source.rows.length));
      row.cells.forEach((cell, cellIndex) => {
        const cellX = x + cellIndex * columnWidth;
        const cellWidth = columnWidth * (cell.colSpan ?? 1);
        commands.push(pdfRect(cellX, rowY, cellWidth, rowHeight, pageHeight));
        commands.push(
          ...renderCellBlocks(
            cell.content,
            cellX + 4,
            rowY + 12,
            cellWidth - 8,
            pageHeight,
            data,
            assetCache,
            embedded,
          ),
        );
      });
      rowY += rowHeight;
    }

    return commands;
  }

  if (source.type === "list") {
    const commands: string[] = [];
    let itemY = y;
    source.items.forEach((item, index) => {
      const marker = source.listType === "ordered" ? `${(source.start ?? 1) + index}.` : (source.bulletChar ?? "-");
      commands.push(pdfText(x, itemY, pageHeight, marker, 10, embedded));
      commands.push(...renderCellBlocks(item, x + 18, itemY, width - 18, pageHeight, data, assetCache, embedded));
      itemY += Math.max(18, height / Math.max(1, source.items.length));
    });
    return commands;
  }

  if (source.type === "image") {
    const cachedAsset = assetCache[source.src];
    if (cachedAsset) {
      const imgWidth = source.width ?? cachedAsset.width ?? width;
      const imgHeight = source.height ?? cachedAsset.height ?? height;
      const yPdf = pageHeight - y - imgHeight;
      return [
        "q",
        `${imgWidth.toFixed(2)} 0 0 ${imgHeight.toFixed(2)} ${x.toFixed(2)} ${yPdf.toFixed(2)} cm`,
        `/Im_${source.src.replace(/[^a-zA-Z0-9]/g, "_")} Do`,
        "Q",
      ];
    }
    return [
      pdfRect(x, y, source.width ?? width, source.height ?? height, pageHeight),
      pdfText(x + 4, y + 16, pageHeight, source.alt ?? source.src, 9, embedded),
    ];
  }

  return [pdfRect(x, y, width, height, pageHeight), pdfText(x + 4, y + 16, pageHeight, source.sheet.name, 9, embedded)];
}

function renderOverlayParagraph(
  block: Extract<PageBlockDefinition, { type: "header" | "footer" }>,
  x: number,
  y: number,
  width: number,
  pageHeight: number,
  data: WorkbookData,
  embedded?: EmbeddedPdfFont,
) {
  return block.content.flatMap((paragraph, index) =>
    splitPdfLines(readParagraphText(paragraph, data), width, 10).map((line) =>
      pdfText(x, y + index * 14, pageHeight, line, 10, embedded),
    ),
  );
}

function renderPdfPage(
  page: PageLayoutPage,
  data: WorkbookData,
  assetCache: PdfAssetCache,
  embedded?: EmbeddedPdfFont,
): string {
  const commands = ["q", "1 1 1 rg", pdfRect(0, 0, page.width, page.height, page.height, "f"), "0 0 0 RG"];

  for (const watermark of page.watermarkBlocks) {
    commands.push(
      pdfText(
        page.width / 3,
        page.height / 2,
        page.height,
        watermark.block.text,
        watermark.block.fontSize ?? 24,
        embedded,
      ),
    );
  }

  for (const header of page.headerBlocks) {
    commands.push(
      ...renderOverlayParagraph(header.block, header.x, header.y, header.width, page.height, data, embedded),
    );
  }

  for (const flowBlock of page.flowBlocks) {
    commands.push(...renderBlock(flowBlock, page.height, data, assetCache, embedded));
  }

  for (const footer of page.footerBlocks) {
    commands.push(
      ...renderOverlayParagraph(footer.block, footer.x, footer.y, footer.width, page.height, data, embedded),
    );
  }

  commands.push("Q");
  return commands.join("\n");
}

/**
 * Pre-loads assets referenced in page layouts via AssetLoader.
 * Returns a cache of base64-encoded image data keyed by asset src.
 */
export async function preloadPdfAssets(layouts: PageLayoutResult[], assetLoader?: AssetLoader): Promise<PdfAssetCache> {
  if (!assetLoader) return {};

  // Collect all unique image sources from all layouts
  const imageSources = new Set<string>();
  const collectImages = (blocks: PageLayoutPage["flowBlocks"]) => {
    for (const fb of blocks) {
      const source = fb.block;
      if (source.type === "image") {
        imageSources.add(source.src);
      } else if (source.type === "table") {
        for (const row of source.rows) {
          for (const cell of row.cells) {
            for (const cb of cell.content) {
              if (cb.type === "image") imageSources.add(cb.src);
              else if (cb.type === "list") {
                for (const item of cb.items) {
                  for (const icb of item) {
                    if (icb.type === "image") imageSources.add(icb.src);
                  }
                }
              }
            }
          }
        }
      } else if (source.type === "list") {
        for (const item of source.items) {
          for (const cb of item) {
            if (cb.type === "image") imageSources.add(cb.src);
          }
        }
      }
    }
  };

  for (const layout of layouts) {
    for (const page of layout.pages) {
      collectImages(page.flowBlocks);
    }
  }

  const cache: PdfAssetCache = {};

  await Promise.all(
    Array.from(imageSources).map(async (src) => {
      try {
        const blob = await assetLoader.load(src);
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const base64 = uint8ToBase64(bytes);
        cache[src] = {
          base64,
          mime: blob.type || "image/png",
        };
      } catch {
        // Asset not available — will render as placeholder
      }
    }),
  );

  return cache;
}

/**
 * Convert a Uint8Array to a base64 string (works in both Node.js and browser).
 */
function uint8ToBase64(bytes: Uint8Array): string {
  // Use native Buffer in Node.js for performance
  const g = globalThis as {
    Buffer?: { from: (input: Uint8Array) => { toString: (encoding: string) => string } };
  };
  if (typeof g.Buffer !== "undefined") {
    return g.Buffer.from(bytes).toString("base64");
  }
  // Browser fallback: chunked to avoid call stack overflow on large arrays
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

function codePointToUtf16Hex(codePoint: number): string {
  if (codePoint > 0xffff) {
    const high = Math.floor((codePoint - 0x10000) / 0x400) + 0xd800;
    const low = ((codePoint - 0x10000) % 0x400) + 0xdc00;
    return `${high.toString(16).padStart(4, "0")}${low.toString(16).padStart(4, "0")}`.toUpperCase();
  }
  return codePoint.toString(16).padStart(4, "0").toUpperCase();
}

function glyphHex(gid: number): string {
  return gid.toString(16).padStart(4, "0").toUpperCase();
}

function buildToUnicodeBody(embedded: EmbeddedPdfFont): string {
  const entries = Array.from(embedded.toUnicode.entries())
    .sort(([a], [b]) => a - b)
    .map(([gid, codePoint]) => `<${glyphHex(gid)}> <${codePointToUtf16Hex(codePoint)}>`);
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    `${entries.length} beginbfchar`,
    ...entries,
    "endbfchar",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
}

function buildWidthArray(embedded: EmbeddedPdfFont): string {
  const entries = Array.from(embedded.usedGlyphIds)
    .sort((a, b) => a - b)
    .map((gid) => {
      const advance = embedded.metrics.advanceWidths[gid] ?? 0;
      const width1000 = Math.max(0, Math.round((advance / embedded.metrics.unitsPerEm) * 1000));
      return `${gid} [${width1000}]`;
    });
  return `[${entries.join(" ")}]`;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function collectPdfStrings(pages: PageLayoutPage[], data: WorkbookData): string[] {
  const strings: string[] = [];
  const collectParagraph = (block: Extract<PageBlockDefinition, { type: "paragraph" }>) => {
    strings.push(readParagraphText(block, data));
  };
  const collectCellContent = (content: PageCellBlock[]) => {
    for (const block of content) {
      if (block.type === "paragraph") {
        collectParagraph(block);
      } else if (block.type === "list") {
        for (const item of block.items) {
          collectCellContent(item);
        }
      }
    }
  };

  for (const page of pages) {
    for (const watermark of page.watermarkBlocks) {
      strings.push(watermark.block.text);
    }
    for (const header of page.headerBlocks) {
      for (const paragraph of header.block.content) {
        collectParagraph(paragraph);
      }
    }
    for (const flowBlock of page.flowBlocks) {
      const source = flowBlock.block;
      if (source.type === "paragraph") {
        collectParagraph(source);
      } else if (source.type === "table") {
        for (const row of source.rows) {
          for (const cell of row.cells) {
            collectCellContent(cell.content);
          }
        }
      } else if (source.type === "list") {
        for (const item of source.items) {
          collectCellContent(item);
        }
      }
    }
    for (const footer of page.footerBlocks) {
      for (const paragraph of footer.block.content) {
        collectParagraph(paragraph);
      }
    }
  }
  return strings;
}

function createPdfBytes(
  pages: PageLayoutPage[],
  config: WorkbookPrintConfig | undefined,
  data: WorkbookData,
  assetCache: PdfAssetCache,
  font?: PdfFontEntry,
): Uint8Array {
  const orderedPages = orderPagesForCopies(pages, config);
  const embedded = font != null ? buildEmbeddedPdfFont(font, collectPdfStrings(pages, data)) : undefined;

  // Build objects in order:
  // 1: Catalog, 2: Pages, 3: Helvetica, then the CJK font chain
  // (Type0 → CIDFont → FontDescriptor → FontFile2 → ToUnicode) or the
  // STSong-Light fallback, then image XObjects (if any), then page content
  // streams + page objects.
  const objects: Array<string | Uint8Array> = [];

  const imageIds: Record<string, number> = {};
  let nextId = 1;

  // Collect image XObject entries first
  for (const [key, cached] of Object.entries(assetCache)) {
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, "_");
    const isJpeg = cached.mime === "image/jpeg";
    const filter = isJpeg ? "/Filter /DCTDecode " : "";
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 ${filter}/Length ${cached.base64.length} >>\nstream\n${cached.base64}\nendstream`,
    );
    imageIds[safeKey] = nextId;
    nextId++;
  }

  // Fonts
  const catalogId = nextId++;
  const pagesId = nextId++;
  const helveticaId = nextId++;
  const cjkType0Id = nextId++;
  const cjkCidId = nextId++;
  const cjkDescriptorId = embedded != null ? nextId++ : 0;
  const cjkFontFileId = embedded != null ? nextId++ : 0;
  const cjkToUnicodeId = embedded != null ? nextId++ : 0;

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [] /Count ${orderedPages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  if (embedded != null) {
    const { metrics } = embedded;
    objects.push(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${embedded.id} /Encoding /Identity-H /DescendantFonts [${cjkCidId} 0 R] /ToUnicode ${cjkToUnicodeId} 0 R >>`,
    );
    objects.push(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${embedded.id} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${cjkDescriptorId} 0 R /DW 1000 /W ${buildWidthArray(embedded)} /CIDToGIDMap /Identity >>`,
    );
    objects.push(
      `<< /Type /FontDescriptor /FontName /${embedded.id} /Flags 4 /FontBBox [${metrics.xMin} ${metrics.yMin} ${metrics.xMax} ${metrics.yMax}] /ItalicAngle 0 /Ascent ${metrics.ascent} /Descent ${metrics.descent} /CapHeight ${metrics.ascent} /StemV 80 /FontFile2 ${cjkFontFileId} 0 R >>`,
    );
    objects.push(
      concatBytes([
        new TextEncoder().encode(
          `<< /Length ${embedded.bytes.byteLength} /Length1 ${embedded.bytes.byteLength} >>\nstream\n`,
        ),
        embedded.bytes,
        new TextEncoder().encode("\nendstream"),
      ]),
    );
    const toUnicodeBody = buildToUnicodeBody(embedded);
    objects.push(
      `<< /Length ${new TextEncoder().encode(toUnicodeBody).byteLength} >>\nstream\n${toUnicodeBody}\nendstream`,
    );
  } else {
    objects.push(
      `<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [${cjkCidId} 0 R] >>`,
    );
    objects.push(
      "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>",
    );
  }

  const pageObjectIds: number[] = [];

  for (const page of orderedPages) {
    const content = renderPdfPage(page, data, assetCache, embedded);
    const contentId = nextId++;
    const pageId = nextId++;

    const imageRefs = Object.keys(imageIds)
      .map((key) => `/Im_${key} ${imageIds[key]} 0 R`)
      .join(" ");
    const xobjectDict = imageRefs ? `/XObject << ${imageRefs} >>` : "";

    objects.push(`<< /Length ${new TextEncoder().encode(content).byteLength} >>\nstream\n${content}\nendstream`);
    objects.push(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${helveticaId} 0 R /F2 ${cjkType0Id} 0 R >> ${xobjectDict}>> /Contents ${contentId} 0 R >>`,
    );
    pageObjectIds.push(pageId);
  }

  // Fix the Pages kids array
  const pagesKids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[1] = `<< /Type /Pages /Kids [${pagesKids}] /Count ${orderedPages.length} >>`;

  // Assemble the byte stream (text objects + the binary font stream)
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const pushString = (value: string) => {
    const encoded = new TextEncoder().encode(value);
    chunks.push(encoded);
    byteLength += encoded.byteLength;
  };

  pushString("%PDF-1.7\n");
  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteLength);
    pushString(`${i + 1} 0 obj\n`);
    const body = objects[i];
    if (typeof body === "string") {
      pushString(body);
    } else {
      chunks.push(body);
      byteLength += body.byteLength;
    }
    pushString("\nendobj\n");
  }

  const xrefOffset = byteLength;
  pushString(`xref\n0 ${objects.length + 1}\n`);
  pushString("0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) {
    pushString(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  pushString(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return concatBytes(chunks);
}

export function createWorkbookPdfFromLayouts(
  layouts: PageLayoutResult[],
  config?: WorkbookPrintConfig,
  data: WorkbookData = {},
  assetCache: PdfAssetCache = {},
  font?: PdfFontEntry,
): WorkbookPdfResult {
  const pages = layouts.flatMap((layout) => layout.pages);
  const bytes = createPdfBytes(pages, config, data, assetCache, font);
  return { bytes, pageCount: orderPagesForCopies(pages, config).length, layouts };
}

export function createWorkbookPdfFromPageView(
  view: PageViewDefinition,
  options: CreateWorkbookPdfOptions = {},
): WorkbookPdfResult {
  return createWorkbookPdfFromLayouts(
    [layoutPageView(view, { data: options.data, registry: options.registry, styleResolver: options.styleResolver })],
    options.config,
    options.data ?? {},
    {},
    options.font,
  );
}

export async function exportWorkbookPdf({
  workbook,
  viewId,
  data,
  registry = pluginRegistry,
  dispatch,
  config,
  assetLoader,
  font,
  fontLoader,
  cjkFontId,
}: ExportWorkbookPdfOptions): Promise<WorkbookPdfResult> {
  const workbookData = data ?? (workbook.data as WorkbookData);

  await runWorkbookHooks({
    hooks: workbook.hooks,
    trigger: "onBeforePrint",
    data: workbookData,
    registry,
    dispatch,
  });

  const styleResolver = createStyleCatalogResolver(workbook.styles, registry);
  const pageViews = workbook.views.filter(
    (view): view is PageViewDefinition => view.type === "page" && (viewId == null || view.id === viewId),
  );
  const layouts = pageViews.map((view) => layoutPageView(view, { data: workbookData, registry, styleResolver }));

  // Pre-load assets for image embedding in PDF
  const assetCache = await preloadPdfAssets(layouts, assetLoader);

  // Resolve the CJK font to embed (explicit font wins over the loader)
  const loadedFont =
    font ?? (fontLoader != null ? ((await fontLoader.load(cjkFontId ?? "cjk")) ?? undefined) : undefined);

  const result = createWorkbookPdfFromLayouts(
    layouts,
    config ?? workbook.printConfig,
    workbookData,
    assetCache,
    loadedFont,
  );

  await runWorkbookHooks({
    hooks: workbook.hooks,
    trigger: "onAfterPrint",
    data: workbookData,
    registry,
    dispatch,
  });

  return result;
}

/**
 * Creates a `PdfFontLoader` that fetches a TrueType font from a URL.
 *
 * Convenience for browsers — pair with `exportWorkbookPdf`'s `fontLoader`:
 *
 * ```ts
 * await exportWorkbookPdf({
 *   workbook,
 *   fontLoader: createFetchFontLoader("/fonts/NotoSansSC-Regular.ttf"),
 * });
 * ```
 */
export function createFetchFontLoader(url: string, id = "cjk"): PdfFontLoader {
  return {
    load: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load PDF font from ${url} (HTTP ${response.status}).`);
      }
      return { id, bytes: await response.arrayBuffer() };
    },
  };
}
