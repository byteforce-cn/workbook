/**
 * RN 文档渲染器 —— 段落块（page 流式内容）
 *
 * 绝对定位 + 段前/段后距 + 首行缩进，内容复用 RNParagraphText。
 * header/footer 块通过 styleFallback 让段落未定义 style 时兜底到块级 style
 * （与 Web HeaderFooterSvg 的 `paragraph.style ?? block.style` 语义一致）。
 */

import { View } from "react-native";
import type { PageBlockDefinition, WorkbookRowContext } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNParagraphText } from "./RNParagraphText";

export interface RNParagraphProps {
  block: Extract<PageBlockDefinition, { type: "paragraph" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  rowContext?: WorkbookRowContext;
  textAlign?: "left" | "center" | "right";
  /** header/footer：段落未定义 style 时兜底到块级 style */
  styleFallback?: { style?: string };
  defaults?: PageTextDefaults;
}

export function RNParagraph({ block, x, y, width, rowContext, textAlign, styleFallback, defaults }: RNParagraphProps) {
  const { data } = useWorkbookData();
  const { assetLoader, styleResolver } = useWorkbookRuntime();

  const effectiveBlock =
    styleFallback != null && block.style == null ? { ...block, style: styleFallback.style } : block;
  const style = styleResolver.resolveParagraphStyle(effectiveBlock.style, data, rowContext);
  const indent = block.indent ?? Number(style.indent ?? 0);
  const spaceBefore = block.spaceBefore ?? Number(style.spaceBefore ?? 0);
  const spaceAfter = block.spaceAfter ?? Number(style.spaceAfter ?? 0);

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        paddingLeft: indent,
        marginTop: spaceBefore,
        marginBottom: spaceAfter,
      }}
    >
      <RNParagraphText
        block={effectiveBlock}
        data={data}
        styleResolver={styleResolver}
        assetLoader={assetLoader}
        rowContext={rowContext}
        defaults={defaults}
        textAlign={textAlign}
      />
    </View>
  );
}
