import type { WorkbookPrintConfig } from "../core/types";

export interface WorkbookPrintablePage {
  id?: string;
  title?: string;
  width: number;
  height: number;
  svg: string;
}

export interface WorkbookPrintDocument {
  config: WorkbookPrintConfig;
  pages: WorkbookPrintablePage[];
  css: string;
  html: string;
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizeCopies(config: WorkbookPrintConfig): number {
  return Math.max(1, Math.floor(config.copies ?? 1));
}

function orderPagesForCopies(pages: WorkbookPrintablePage[], config: WorkbookPrintConfig): WorkbookPrintablePage[] {
  const copies = normalizeCopies(config);
  if (copies === 1) {
    return pages;
  }

  if (config.collate === false) {
    return pages.flatMap((page) => Array.from({ length: copies }, () => page));
  }

  return Array.from({ length: copies }).flatMap(() => pages);
}

function readScaleCss(scale: WorkbookPrintConfig["scale"]): string {
  if (scale == null || scale === "fitToPage") {
    return "max-width: 100%; max-height: 100%;";
  }

  if (scale === "fitToWidth") {
    return "width: 100%; height: auto;";
  }

  const percentMatch = /^(\d+(?:\.\d+)?)%$/.exec(scale);
  if (percentMatch == null) {
    return "max-width: 100%; max-height: 100%;";
  }

  const ratio = Number(percentMatch[1]) / 100;
  return `transform: scale(${ratio}); transform-origin: top left;`;
}

export function createWorkbookPrintStyles(config: WorkbookPrintConfig = {}): string {
  const orientation = config.orientation ?? "portrait";
  const scaleCss = readScaleCss(config.scale);

  return [
    `@page { size: ${orientation}; margin: 0; }`,
    "html, body { margin: 0; padding: 0; background: #ffffff; }",
    ".bf-workbook-print-document { background: #ffffff; color: #000000; }",
    ".bf-workbook-print-page { box-sizing: border-box; break-after: page; page-break-after: always; display: flex; align-items: flex-start; justify-content: center; width: 100vw; height: 100vh; overflow: hidden; background: #ffffff; }",
    ".bf-workbook-print-page:last-child { break-after: auto; page-break-after: auto; }",
    `.bf-workbook-print-page-content { ${scaleCss} }`,
    "@media screen { body { background: #f8fafc; } .bf-workbook-print-page { margin: 16px auto; box-shadow: 0 0 0 1px #e5e7eb; } }",
  ].join("\n");
}

export function createWorkbookPrintHtml(
  pages: WorkbookPrintablePage[],
  config: WorkbookPrintConfig = {},
): WorkbookPrintDocument {
  const orderedPages = orderPagesForCopies(pages, config);
  const css = createWorkbookPrintStyles(config);
  const bodyAttributes = [
    ["data-paper-source", config.paperSource],
    ["data-duplex", config.duplex],
    ["data-copies", String(normalizeCopies(config))],
    ["data-collate", config.collate == null ? undefined : String(config.collate)],
    ["data-orientation", config.orientation],
    ["data-scale", config.scale],
  ]
    .filter((entry): entry is [string, string] => entry[1] != null)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");

  const pageHtml = orderedPages
    .map((page, index) => {
      const title = page.title == null ? "" : ` aria-label="${escapeAttribute(page.title)}"`;
      return `<section class="bf-workbook-print-page" data-page-index="${index}" data-page-width="${page.width}" data-page-height="${page.height}"${title}><div class="bf-workbook-print-page-content">${page.svg}</div></section>`;
    })
    .join("\n");

  const html = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8" />\n<title>Workbook Print</title>\n<style>${css}</style>\n</head>\n<body ${bodyAttributes}>\n<main class="bf-workbook-print-document">\n${pageHtml}\n</main>\n</body>\n</html>`;

  return {
    config,
    pages: orderedPages,
    css,
    html,
  };
}

function readSvgDimension(svg: SVGSVGElement, attributeName: "width" | "height", fallback: number): number {
  const rawValue = svg.getAttribute(attributeName);
  const parsedValue = rawValue == null ? Number.NaN : Number(rawValue);
  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number) ?? [];
  const viewBoxValue = attributeName === "width" ? viewBox[2] : viewBox[3];
  return Number.isFinite(viewBoxValue) && viewBoxValue > 0 ? viewBoxValue : fallback;
}

export function collectWorkbookPrintablePages(root: ParentNode): WorkbookPrintablePage[] {
  const serializer = new XMLSerializer();
  return Array.from(root.querySelectorAll(".bf-workbook-page-view svg, svg[data-workbook-page]"))
    .filter((element): element is SVGSVGElement => element instanceof SVGSVGElement)
    .map((svg, index) => ({
      id: svg.id || undefined,
      title: svg.getAttribute("aria-label") ?? undefined,
      width: readSvgDimension(svg, "width", 595),
      height: readSvgDimension(svg, "height", 842),
      svg: serializer.serializeToString(svg),
      index,
    }))
    .map(({ index: _index, ...page }) => page);
}

export function createWorkbookPrintHtmlFromElement(
  root: ParentNode,
  config: WorkbookPrintConfig = {},
): WorkbookPrintDocument {
  return createWorkbookPrintHtml(collectWorkbookPrintablePages(root), config);
}

export function printWorkbookElement(root: ParentNode, config: WorkbookPrintConfig = {}): Window | null {
  if (typeof window === "undefined") {
    throw new Error("printWorkbookElement requires a browser window.");
  }

  const printDocument = createWorkbookPrintHtmlFromElement(root, config);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (printWindow == null) {
    return null;
  }

  printWindow.document.open();
  printWindow.document.write(printDocument.html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return printWindow;
}
