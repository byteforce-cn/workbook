import { resolveBindValue } from "../../core/bind/resolveBind";
import type { PageBlockDefinition, WorkbookRowContext } from "../../core/types";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import type { PageTextDefaults } from "./pageDefaults";

export interface ParagraphSvgProps {
  block: Extract<PageBlockDefinition, { type: "paragraph" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  rowContext?: WorkbookRowContext;
  textAlign?: "left" | "center" | "right";
  defaults?: PageTextDefaults;
}

function resolveTextAlign(
  blockAlignment: Extract<PageBlockDefinition, { type: "paragraph" }>["alignment"],
  override?: "left" | "center" | "right",
) {
  if (override != null) {
    return override;
  }

  if (blockAlignment === "justify") {
    return "justify";
  }

  return blockAlignment ?? "left";
}

export function ParagraphSvg({ block, x, y, width, height, rowContext, textAlign, defaults }: ParagraphSvgProps) {
  const { data } = useWorkbookData();
  const { assetLoader, styleResolver } = useWorkbookRuntime();
  const style = styleResolver.resolveParagraphStyle(block.style, data, rowContext);

  return (
    <foreignObject x={x} y={y} width={width} height={height ?? 80}>
      <div
        style={{
          fontFamily: String(style.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
          fontSize: Number(style.fontSize ?? defaults?.fontSize ?? 14),
          color: String(style.color ?? defaults?.color ?? "#111827"),
          fontWeight: style.fontWeight as "normal" | "bold" | undefined,
          fontStyle: style.fontStyle as "normal" | "italic" | undefined,
          textDecoration: style.textDecoration as "none" | "underline" | "line-through" | undefined,
          textAlign: resolveTextAlign(
            block.alignment ?? (style.alignment as Extract<PageBlockDefinition, { type: "paragraph" }>["alignment"]),
            textAlign,
          ),
          paddingLeft: block.indent ?? Number(style.indent ?? 0),
          marginTop: block.spaceBefore ?? Number(style.spaceBefore ?? 0),
          marginBottom: block.spaceAfter ?? Number(style.spaceAfter ?? 0),
          lineHeight: block.lineHeight ?? Number(style.lineHeight ?? defaults?.lineHeight ?? 1.4),
        }}
      >
        {block.runs.map((run, index) => {
          if (run.type === "break") {
            return <br key={index} />;
          }

          if (run.type === "inline-image") {
            return (
              <img
                key={index}
                src={assetLoader.resolveAssetUrl(run.src) ?? run.src}
                alt={run.alt ?? ""}
                style={{ width: run.width ?? 24, height: run.height ?? 24, verticalAlign: "middle" }}
              />
            );
          }

          const textValue = run.bind == null ? (run.text ?? "") : resolveBindValue(run.bind, data, rowContext);
          const characterStyle = styleResolver.resolveCharacterStyle(run.style, data, rowContext);
          const runStyle = {
            fontWeight: run.fontWeight ?? (characterStyle.fontWeight as "normal" | "bold" | undefined),
            fontStyle: run.fontStyle ?? (characterStyle.fontStyle as "normal" | "italic" | undefined),
            textDecoration:
              run.textDecoration ??
              (characterStyle.textDecoration as "none" | "underline" | "line-through" | undefined),
            color: run.color ?? (characterStyle.color as string | undefined),
            fontFamily: run.fontFamily ?? (characterStyle.fontFamily as string | undefined),
            fontSize: run.fontSize ?? (characterStyle.fontSize as number | undefined),
          };

          if (run.link != null) {
            return (
              <a key={index} href={run.link.href} title={run.link.tooltip} style={runStyle}>
                {String(textValue ?? "")}
              </a>
            );
          }

          return (
            <span key={index} style={runStyle}>
              {String(textValue ?? "")}
            </span>
          );
        })}
      </div>
    </foreignObject>
  );
}
