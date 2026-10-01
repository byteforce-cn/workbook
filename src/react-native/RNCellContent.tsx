/**
 * RN 文档渲染器 —— 单元格/列表项内容（pageCellBlock：paragraph / image / list）
 *
 * - RNCellContent：以流式布局渲染一组 pageCellBlock（表格单元格、列表项共用）；
 * - RNListBlock：列表内容渲染（bullet / ordered 标记 + 序号格式），
 *   既被 RNList（流式列表块）使用，也被 RNCellContent（嵌套列表）复用，
 *   同一模块内互相引用（函数声明提升），避免循环依赖。
 */

import { Image, Text, View } from "react-native";
import type { PageBlockDefinition, WorkbookRowContext } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNParagraphText } from "./RNParagraphText";

type PageCellBlockDefinition = Extract<
  PageBlockDefinition,
  { type: "table" }
>["rows"][number]["cells"][number]["content"][number];

export interface RNCellContentProps {
  blocks: PageCellBlockDefinition[];
  rowContext?: WorkbookRowContext;
  defaults?: PageTextDefaults;
  textAlign?: "left" | "center" | "right";
}

export function RNCellContent({ blocks, rowContext, defaults, textAlign }: RNCellContentProps) {
  const { data } = useWorkbookData();
  const { assetLoader, styleResolver } = useWorkbookRuntime();

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          const style = styleResolver.resolveParagraphStyle(block.style, data, rowContext);
          const spaceBefore = block.spaceBefore ?? Number(style.spaceBefore ?? 0);
          const spaceAfter = block.spaceAfter ?? Number(style.spaceAfter ?? 0);
          return (
            <View key={index} style={{ marginTop: spaceBefore, marginBottom: spaceAfter }}>
              <RNParagraphText
                block={block}
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

        if (block.type === "image") {
          return (
            <Image
              key={index}
              source={{ uri: assetLoader.resolveAssetUrl(block.src) ?? block.src }}
              accessibilityLabel={block.alt ?? ""}
              resizeMode={block.lockAspectRatio === false ? "stretch" : "contain"}
              style={{ width: block.width ?? 120, height: block.height ?? 80 }}
            />
          );
        }

        return <RNListBlock key={index} block={block} defaults={defaults} />;
      })}
    </>
  );
}

export interface RNListBlockProps {
  block: Extract<PageBlockDefinition, { type: "list" }>;
  defaults?: PageTextDefaults;
}

function toLetters(value: number, upper: boolean): string {
  let out = "";
  let current = value;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    out = String.fromCharCode(97 + remainder) + out;
    current = Math.floor((current - 1) / 26);
  }
  return upper ? out.toUpperCase() : out;
}

function toRoman(value: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let current = value;
  for (const [numeral, symbol] of map) {
    while (current >= numeral) {
      out += symbol;
      current -= numeral;
    }
  }
  return out;
}

function formatOrderedNumber(index: number, start: number, format?: string): string {
  const value = start + index;
  switch (format) {
    case "lowerLetter":
      return toLetters(value, false);
    case "upperLetter":
      return toLetters(value, true);
    case "lowerRoman":
      return toRoman(value).toLowerCase();
    case "upperRoman":
      return toRoman(value).toUpperCase();
    default:
      return String(value);
  }
}

export function RNListBlock({ block, defaults }: RNListBlockProps) {
  const { data } = useWorkbookData();
  const { styleResolver } = useWorkbookRuntime();
  const style = styleResolver.resolveListStyle(block.style, data);
  const listType = block.listType ?? (style.listType as "bullet" | "ordered" | undefined) ?? "bullet";
  const start = block.start ?? Number(style.start ?? 1);
  const fontSize = Number(style.fontSize ?? defaults?.fontSize ?? 14);
  const color = String(style.color ?? defaults?.color ?? "#111827");

  return (
    <View>
      {block.items.map((item, index) => {
        const marker =
          listType === "ordered"
            ? `${formatOrderedNumber(index, start, block.numberFormat ?? (style.numberFormat as string | undefined))}.`
            : (block.bulletChar ?? "•");

        return (
          <View key={index} style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ width: 20, fontSize, lineHeight: Math.round(fontSize * 1.4), color }}>{marker}</Text>
            <View style={{ flex: 1 }}>
              <RNCellContent blocks={item} defaults={defaults} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
