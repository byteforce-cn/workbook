/**
 * RN 文档渲染器 —— 块分发器
 *
 * 按块类型分发到对应 RN 渲染器；与 Web BlockRenderer 一一对应。
 * page-break 块已由布局引擎消费，此处返回 null。
 */

import type { PageBlockDefinition, PageViewDefinition } from "../core/types";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNFloatingBlock } from "./RNFloatingBlock";
import { RNHeaderFooter } from "./RNHeaderFooter";
import { RNImage } from "./RNImage";
import { RNList } from "./RNList";
import { RNParagraph } from "./RNParagraph";
import { RNSpreadsheetBlock } from "./RNSpreadsheetBlock";
import { RNTable } from "./RNTable";
import { RNWatermark } from "./RNWatermark";

export interface RNBlockRendererProps {
  block: PageBlockDefinition;
  x: number;
  y: number;
  width: number;
  height?: number;
  pageWidth: number;
  pageHeight: number;
  view: PageViewDefinition;
  textDefaults?: PageTextDefaults;
}

export function RNBlockRenderer({
  block,
  x,
  y,
  width,
  height,
  pageWidth,
  pageHeight,
  view,
  textDefaults,
}: RNBlockRendererProps) {
  switch (block.type) {
    case "paragraph":
      return <RNParagraph block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "table":
      return <RNTable block={block} x={x} y={y} width={width} height={height} view={view} defaults={textDefaults} />;
    case "image":
      return <RNImage block={block} x={x} y={y} width={width} height={height} />;
    case "list":
      return <RNList block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "header":
    case "footer":
      return <RNHeaderFooter block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "watermark":
      return <RNWatermark block={block} pageWidth={pageWidth} pageHeight={pageHeight} />;
    case "floating":
      return (
        <RNFloatingBlock
          block={block}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          view={view}
          defaults={textDefaults}
        />
      );
    case "spreadsheet":
      return <RNSpreadsheetBlock block={block} x={x} y={y} width={width} view={view} defaults={textDefaults} />;
    default:
      return null;
  }
}
