/**
 * RN 文档渲染器 —— 浮动块
 *
 * 按 layout.x/y/width/height（数字或百分比）绝对定位，内容支持
 * paragraph / table / image / list（与 Web FloatingBlockSvg 一致）。
 */

import type { PageBlockDefinition, PageViewDefinition } from "../core/types";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNImage } from "./RNImage";
import { RNList } from "./RNList";
import { RNParagraph } from "./RNParagraph";
import { RNTable } from "./RNTable";

export interface RNFloatingBlockProps {
  block: Extract<PageBlockDefinition, { type: "floating" }>;
  pageWidth: number;
  pageHeight: number;
  view: PageViewDefinition;
  defaults?: PageTextDefaults;
}

function resolveMeasurement(value: number | string, size: number): number {
  if (typeof value === "number") {
    return value;
  }
  return (Number(value.replace("%", "")) / 100) * size;
}

export function RNFloatingBlock({ block, pageWidth, pageHeight, view, defaults }: RNFloatingBlockProps) {
  const x = resolveMeasurement(block.layout.x, pageWidth);
  const y = resolveMeasurement(block.layout.y, pageHeight);
  const width = resolveMeasurement(block.layout.width, pageWidth);
  const height = resolveMeasurement(block.layout.height, pageHeight);

  switch (block.content.type) {
    case "paragraph":
      return <RNParagraph block={block.content} x={x} y={y} width={width} height={height} defaults={defaults} />;
    case "table":
      return (
        <RNTable block={block.content} x={x} y={y} width={width} height={height} view={view} defaults={defaults} />
      );
    case "image":
      return <RNImage block={block.content} x={x} y={y} width={width} height={height} />;
    case "list":
      return <RNList block={block.content} x={x} y={y} width={width} height={height} defaults={defaults} />;
    default:
      return null;
  }
}
