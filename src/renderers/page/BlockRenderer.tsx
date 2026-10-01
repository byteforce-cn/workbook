import type { PageBlockDefinition } from "../../core/types";
import { FloatingBlockSvg } from "./FloatingBlockSvg";
import { HeaderFooterSvg } from "./HeaderFooterSvg";
import { ImageSvg } from "./ImageSvg";
import { ListSvg } from "./ListSvg";
import { ParagraphSvg } from "./ParagraphSvg";
import type { PageTextDefaults } from "./pageDefaults";
import { SpreadsheetBlockSvg } from "./SpreadsheetBlockSvg";
import { TableSvg } from "./TableSvg";
import { WatermarkSvg } from "./WatermarkSvg";

export interface BlockRendererProps {
  block: PageBlockDefinition;
  x: number;
  y: number;
  width: number;
  height?: number;
  pageWidth: number;
  pageHeight: number;
  textDefaults?: PageTextDefaults;
}

export function BlockRenderer({ block, x, y, width, height, pageWidth, pageHeight, textDefaults }: BlockRendererProps) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "table":
      return <TableSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "image":
      return <ImageSvg block={block} x={x} y={y} width={width} height={height} />;
    case "list":
      return <ListSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "header":
    case "footer":
      return <HeaderFooterSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "watermark":
      return <WatermarkSvg block={block} width={pageWidth} height={pageHeight} />;
    case "floating":
      return <FloatingBlockSvg block={block} pageWidth={pageWidth} pageHeight={pageHeight} defaults={textDefaults} />;
    case "spreadsheet":
      return <SpreadsheetBlockSvg block={block} x={x} y={y} width={width} />;
    default:
      return null;
  }
}
