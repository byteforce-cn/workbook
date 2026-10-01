import { useMemo } from "react";
import type { PageBlockDefinition, WorkbookData, WorkbookStyleCatalog } from "../../core/types";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookPluginRegistry } from "../../react/registry";
import type { WorkbookDefinition } from "../../schema/generated-types";

export interface PageRendererProps {
  /** Content blocks for the page (paragraphs, tables, lists, images, etc.) */
  blocks: PageBlockDefinition[];
  /** Page width in points (default: 595 for A4) */
  pageWidth?: number;
  /** Page height in points (default: 842 for A4) */
  pageHeight?: number;
  /** Page margins */
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  /** Default font settings */
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultLineHeight?: number;
  defaultColor?: string;
  /** Bind data for content blocks */
  data?: WorkbookData;
  /** Style catalog for text/table/list styles */
  styleCatalog?: WorkbookStyleCatalog;
  /** Plugin registry */
  plugins?: WorkbookPluginRegistry;
  /** Locale */
  locale?: string;
  /** Fallback locale */
  fallbackLocale?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * PageRenderer — standalone page/document rendering without DocumentRenderer.
 *
 * Creates its own runtime context internally. Use when you only need
 * document preview and don't want a full WorkbookDefinition.
 *
 * Header/footer/watermark blocks can be included in the `blocks` array
 * using block types: "header", "footer", "watermark".
 *
 * @example
 * ```tsx
 * <PageRenderer
 *   blocks={[
 *     { type: "header", content: [{ type: "paragraph", runs: [{ type: "text", text: "Header" }] }] },
 *     { type: "paragraph", runs: [{ type: "text", text: "Hello World" }] },
 *     { type: "footer", content: [{ type: "paragraph", runs: [{ type: "text", text: "Page 1" }] }] },
 *   ]}
 * />
 * ```
 */
export function PageRenderer({
  blocks,
  pageWidth,
  pageHeight,
  marginTop = 40,
  marginBottom = 40,
  marginLeft = 40,
  marginRight = 40,
  defaultFontFamily = "sans-serif",
  defaultFontSize = 12,
  defaultLineHeight = 1.5,
  defaultColor = "#000000",
  data = {},
  styleCatalog,
  plugins,
  locale = "zh-CN",
  fallbackLocale = "en-US",
  className,
}: PageRendererProps) {
  const workbook = useMemo<WorkbookDefinition>(() => {
    const w = pageWidth ?? 595; // A4
    const h = pageHeight ?? 842;

    const pageView: Record<string, unknown> = {
      type: "page",
      pageSettings: {
        width: w,
        height: h,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        defaultFontFamily,
        defaultFontSize,
        defaultLineHeight,
        defaultColor,
      },
      content: blocks,
    };

    return {
      kind: "workbook",
      schemaVersion: "4.1.1",
      locale,
      data,
      ...(styleCatalog ? { styles: styleCatalog } : {}),
      views: [pageView],
    } as unknown as WorkbookDefinition;
  }, [
    blocks,
    pageWidth,
    pageHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    defaultFontFamily,
    defaultFontSize,
    defaultLineHeight,
    defaultColor,
    locale,
    data,
    styleCatalog,
  ]);

  return (
    <div className={className}>
      <DocumentRenderer
        workbook={workbook}
        registry={plugins}
        locale={locale}
        fallbackLocale={fallbackLocale}
        initialData={data}
      />
    </div>
  );
}
