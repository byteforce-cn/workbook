/**
 * RN 文档渲染器 —— 段落文本（runs）渲染
 *
 * 在 RN 中把 paragraph 的 runs 渲染为嵌套 <Text>：
 *  - text run：按字符样式（fontWeight/fontStyle/textDecoration/color/fontFamily/fontSize）渲染；
 *  - break run：换行（'\n'）；
 *  - inline-image run：内联 <Image>（RN <Text> 支持内嵌图片）；
 *  - bind run：resolveBindValue 解析（与 Web PageCellBlockHtml 同一运行时）。
 *
 * 本组件为纯内容渲染（不含定位/间距），供 RNParagraph（流式绝对定位）与
 * RNCellContent（单元格/列表项内联布局）复用。
 */

import { Image, Text } from "react-native";
import type { AssetLoader } from "../core/assets/assetLoader";
import { resolveBindValue } from "../core/bind/resolveBind";
import type { PageBlockDefinition, WorkbookData, WorkbookRowContext } from "../core/types";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import type { PageLayoutStyleResolver } from "../renderers/page/pageLayout";

export interface RNParagraphTextProps {
  block: Extract<PageBlockDefinition, { type: "paragraph" }>;
  data: WorkbookData;
  styleResolver: PageLayoutStyleResolver;
  assetLoader: AssetLoader;
  rowContext?: WorkbookRowContext;
  defaults?: PageTextDefaults;
  /** 覆盖段落对齐（header/footer 的块级 alignment、表格单元格 hAlign） */
  textAlign?: "left" | "center" | "right";
}

function normalizeTextAlign(
  block: Extract<PageBlockDefinition, { type: "paragraph" }>,
  styleAlign: unknown,
  override?: "left" | "center" | "right",
): "left" | "center" | "right" {
  if (override != null) {
    return override;
  }
  // RN 无 justify，映射为 left（与移动端阅读习惯一致）
  if (block.alignment === "justify" || styleAlign === "justify") {
    return "left";
  }
  if (block.alignment != null) {
    return block.alignment;
  }
  return (styleAlign as "left" | "center" | "right" | undefined) ?? "left";
}

export function RNParagraphText({
  block,
  data,
  styleResolver,
  assetLoader,
  rowContext,
  defaults,
  textAlign,
}: RNParagraphTextProps) {
  const style = styleResolver.resolveParagraphStyle(block.style, data, rowContext);
  const fontSize = Number(style.fontSize ?? defaults?.fontSize ?? 14);
  // RN 的 lineHeight 为像素值（CSS 为倍数），需换算
  const lineHeight = Math.round(fontSize * Number(block.lineHeight ?? style.lineHeight ?? defaults?.lineHeight ?? 1.4));

  return (
    <Text
      style={{
        fontFamily: String(style.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
        fontSize,
        lineHeight,
        color: String(style.color ?? defaults?.color ?? "#111827"),
        fontWeight: (style.fontWeight as "normal" | "bold" | undefined) ?? undefined,
        fontStyle: (style.fontStyle as "normal" | "italic" | undefined) ?? undefined,
        textDecorationLine: (style.textDecoration as "none" | "underline" | "line-through" | undefined) ?? undefined,
        textAlign: normalizeTextAlign(block, style.alignment, textAlign),
      }}
    >
      {block.runs.map((run, index) => {
        if (run.type === "break") {
          return "\n";
        }

        if (run.type === "inline-image") {
          const src = assetLoader.resolveAssetUrl(run.src) ?? run.src;
          return (
            <Image
              key={index}
              source={{ uri: src }}
              accessibilityLabel={run.alt ?? ""}
              resizeMode={run.lockAspectRatio === false ? "stretch" : "contain"}
              style={{ width: run.width ?? 24, height: run.height ?? 24 }}
            />
          );
        }

        const characterStyle = styleResolver.resolveCharacterStyle(run.style, data, rowContext);
        const textValue =
          run.bind == null ? (run.text ?? "") : String(resolveBindValue(run.bind, data, rowContext) ?? "");

        return (
          <Text
            key={index}
            style={{
              fontWeight: run.fontWeight ?? (characterStyle.fontWeight as "normal" | "bold" | undefined),
              fontStyle: run.fontStyle ?? (characterStyle.fontStyle as "normal" | "italic" | undefined),
              textDecorationLine:
                run.textDecoration ??
                (characterStyle.textDecoration as "none" | "underline" | "line-through" | undefined),
              color: run.color ?? (characterStyle.color as string | undefined),
              fontFamily: run.fontFamily ?? (characterStyle.fontFamily as string | undefined),
              fontSize: run.fontSize ?? (characterStyle.fontSize as number | undefined),
            }}
          >
            {textValue}
          </Text>
        );
      })}
    </Text>
  );
}
