import type { PageBlockDefinition } from "../../core/types";
import { ImageSvg } from "./ImageSvg";
import { ListSvg } from "./ListSvg";
import { ParagraphSvg } from "./ParagraphSvg";
import type { PageTextDefaults } from "./pageDefaults";
import { TableSvg } from "./TableSvg";

export interface FloatingBlockSvgProps {
  block: Extract<PageBlockDefinition, { type: "floating" }>;
  pageWidth: number;
  pageHeight: number;
  defaults?: PageTextDefaults;
}

function resolveMeasurement(value: number | string, size: number): number {
  if (typeof value === "number") {
    return value;
  }

  return (Number(value.replace("%", "")) / 100) * size;
}

export function FloatingBlockSvg({ block, pageWidth, pageHeight, defaults }: FloatingBlockSvgProps) {
  const x = resolveMeasurement(block.layout.x, pageWidth);
  const y = resolveMeasurement(block.layout.y, pageHeight);
  const width = resolveMeasurement(block.layout.width, pageWidth);
  const height = resolveMeasurement(block.layout.height, pageHeight);

  switch (block.content.type) {
    case "paragraph":
      return <ParagraphSvg block={block.content} x={x} y={y} width={width} height={height} defaults={defaults} />;
    case "table":
      return <TableSvg block={block.content} x={x} y={y} width={width} height={height} defaults={defaults} />;
    case "image":
      return <ImageSvg block={block.content} x={x} y={y} width={width} height={height} />;
    case "list":
      return <ListSvg block={block.content} x={x} y={y} width={width} height={height} defaults={defaults} />;
    default:
      return null;
  }
}
