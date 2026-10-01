import type { PageBlockDefinition } from "../../core/types";
import { ParagraphSvg } from "./ParagraphSvg";
import type { PageTextDefaults } from "./pageDefaults";

export interface HeaderFooterSvgProps {
  block: Extract<PageBlockDefinition, { type: "header" | "footer" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  defaults?: PageTextDefaults;
}

export function HeaderFooterSvg({ block, x, y, width, height, defaults }: HeaderFooterSvgProps) {
  const paragraphHeight = Math.max(20, (height ?? block.content.length * 24) / Math.max(1, block.content.length));

  return (
    <g>
      {block.content.map((paragraph, index) => (
        <ParagraphSvg
          key={index}
          block={{ ...paragraph, style: paragraph.style ?? block.style }}
          x={x}
          y={y + index * paragraphHeight}
          width={width}
          height={paragraphHeight}
          textAlign={block.alignment}
          defaults={defaults}
        />
      ))}
    </g>
  );
}
