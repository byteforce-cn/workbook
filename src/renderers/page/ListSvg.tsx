import type { PageBlockDefinition } from "../../core/types";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import { PageCellBlockHtml } from "./PageCellBlockHtml";
import type { PageTextDefaults } from "./pageDefaults";

export interface ListSvgProps {
  block: Extract<PageBlockDefinition, { type: "list" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  defaults?: PageTextDefaults;
}

function resolveListStyleType(listType: "bullet" | "ordered", bulletChar?: string, numberFormat?: string) {
  if (listType === "bullet") {
    return bulletChar == null ? undefined : `"${bulletChar} "`;
  }

  switch (numberFormat) {
    case "lowerLetter":
      return "lower-alpha";
    case "upperLetter":
      return "upper-alpha";
    case "lowerRoman":
      return "lower-roman";
    case "upperRoman":
      return "upper-roman";
    default:
      return undefined;
  }
}

export function ListSvg({ block, x, y, width, height, defaults }: ListSvgProps) {
  const { data } = useWorkbookData();
  const { styleResolver } = useWorkbookRuntime();
  const style = styleResolver.resolveListStyle(block.style, data);
  const listType = block.listType ?? (style.listType as "bullet" | "ordered" | undefined) ?? "bullet";
  const TagName = listType === "ordered" ? "ol" : "ul";

  return (
    <foreignObject x={x} y={y} width={width} height={height ?? Math.max(80, block.items.length * 28)}>
      <div
        style={{
          fontFamily: String(style.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
          fontSize: Number(style.fontSize ?? defaults?.fontSize ?? 14),
          color: String(style.color ?? defaults?.color ?? "#111827"),
          fontWeight: style.fontWeight as "normal" | "bold" | undefined,
          fontStyle: style.fontStyle as "normal" | "italic" | undefined,
          textDecoration: style.textDecoration as "none" | "underline" | "line-through" | undefined,
          marginTop: Number(style.spaceBefore ?? 0),
          marginBottom: Number(style.spaceAfter ?? 0),
        }}
      >
        <TagName
          start={listType === "ordered" ? (block.start ?? Number(style.start ?? 1)) : undefined}
          style={{
            listStyleType: resolveListStyleType(
              listType,
              block.bulletChar ?? (style.bulletChar as string | undefined),
              block.numberFormat ?? (style.numberFormat as string | undefined),
            ),
            textAlign: style.alignment as "left" | "center" | "right" | "justify" | undefined,
            paddingLeft: style.indent == null ? undefined : Number(style.indent),
          }}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <PageCellBlockHtml blocks={item} defaults={defaults} />
            </li>
          ))}
        </TagName>
      </div>
    </foreignObject>
  );
}
