/**
 * RN 文档渲染器 —— 页眉/页脚块
 *
 * 逐段落渲染，段落未定义 style 时兜底到块级 style；alignment 覆盖段落对齐。
 * 与 Web HeaderFooterSvg 语义一致（paragraphHeight 均分块高度）。
 */

import type { PageBlockDefinition } from "../core/types";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNParagraph } from "./RNParagraph";

export interface RNHeaderFooterProps {
  block: Extract<PageBlockDefinition, { type: "header" | "footer" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  defaults?: PageTextDefaults;
}

export function RNHeaderFooter({ block, x, y, width, height, defaults }: RNHeaderFooterProps) {
  const paragraphHeight = Math.max(20, (height ?? block.content.length * 24) / Math.max(1, block.content.length));

  return (
    <>
      {block.content.map((paragraph, index) => (
        <RNParagraph
          key={index}
          block={paragraph}
          x={x}
          y={y + index * paragraphHeight}
          width={width}
          height={paragraphHeight}
          textAlign={block.alignment}
          styleFallback={block}
          defaults={defaults}
        />
      ))}
    </>
  );
}
