import type { PageBlockDefinition } from "../../core/types";
import { ImageSvg } from "./ImageSvg";
import { ListSvg } from "./ListSvg";
import { ParagraphSvg } from "./ParagraphSvg";
import type { PageTextDefaults } from "./pageDefaults";
import { TableSvg } from "./TableSvg";

export interface FloatingBlockSvgProps {
  block: Extract<PageBlockDefinition, { type: "floating" }>;
  x: number;
  y: number;
  width: number;
  height: number;
  defaults?: PageTextDefaults;
}

export function FloatingBlockSvg({ block, x, y, width, height, defaults }: FloatingBlockSvgProps) {
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
