import { resolveBindValue } from "../../core/bind/resolveBind";
import type { PageBlockDefinition, WorkbookRowContext } from "../../core/types";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import type { PageTextDefaults } from "./pageDefaults";

type PageCellBlockDefinition = Extract<
  PageBlockDefinition,
  { type: "table" }
>["rows"][number]["cells"][number]["content"][number];

export interface PageCellBlockHtmlProps {
  blocks: PageCellBlockDefinition[];
  defaults?: PageTextDefaults;
  rowContext?: WorkbookRowContext;
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

export function PageCellBlockHtml({ blocks, defaults, rowContext }: PageCellBlockHtmlProps) {
  const { data } = useWorkbookData();
  const { assetLoader, styleResolver } = useWorkbookRuntime();

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          const paragraphStyle = styleResolver.resolveParagraphStyle(block.style, data, rowContext);

          return (
            <p
              key={index}
              style={{
                margin: 0,
                fontFamily: String(paragraphStyle.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
                fontSize: Number(paragraphStyle.fontSize ?? defaults?.fontSize ?? 14),
                color: String(paragraphStyle.color ?? defaults?.color ?? "#111827"),
                fontWeight: paragraphStyle.fontWeight as "normal" | "bold" | undefined,
                fontStyle: paragraphStyle.fontStyle as "normal" | "italic" | undefined,
                textDecoration: paragraphStyle.textDecoration as "none" | "underline" | "line-through" | undefined,
                textAlign:
                  block.alignment ?? (paragraphStyle.alignment as "left" | "center" | "right" | "justify" | undefined),
                paddingLeft: block.indent ?? Number(paragraphStyle.indent ?? 0),
                lineHeight: block.lineHeight ?? Number(paragraphStyle.lineHeight ?? defaults?.lineHeight ?? 1.4),
              }}
            >
              {block.runs.map((run, runIndex) => {
                if (run.type === "break") {
                  return <br key={runIndex} />;
                }

                if (run.type === "inline-image") {
                  return (
                    <img
                      key={runIndex}
                      src={assetLoader.resolveAssetUrl(run.src) ?? run.src}
                      alt={run.alt ?? ""}
                      style={{
                        width: run.width ?? 24,
                        height: run.height ?? 24,
                        verticalAlign: "middle",
                        objectFit: run.lockAspectRatio === false ? "fill" : "contain",
                      }}
                    />
                  );
                }

                const characterStyle = styleResolver.resolveCharacterStyle(run.style, data, rowContext);
                const textValue = run.bind == null ? (run.text ?? "") : resolveBindValue(run.bind, data, rowContext);
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
                    <a key={runIndex} href={run.link.href} title={run.link.tooltip} style={runStyle}>
                      {String(textValue ?? "")}
                    </a>
                  );
                }

                return (
                  <span key={runIndex} style={runStyle}>
                    {String(textValue ?? "")}
                  </span>
                );
              })}
            </p>
          );
        }

        if (block.type === "image") {
          return (
            <img
              key={index}
              src={assetLoader.resolveAssetUrl(block.src) ?? block.src}
              alt={block.alt ?? ""}
              style={{
                width: block.width ?? 120,
                height: block.height ?? 80,
                objectFit: block.lockAspectRatio === false ? "fill" : "contain",
              }}
            />
          );
        }

        const listStyle = styleResolver.resolveListStyle(block.style, data, rowContext);
        const listType = block.listType ?? (listStyle.listType as "bullet" | "ordered" | undefined) ?? "bullet";
        const TagName = listType === "ordered" ? "ol" : "ul";

        return (
          <div
            key={index}
            style={{
              fontFamily: String(listStyle.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
              fontSize: Number(listStyle.fontSize ?? defaults?.fontSize ?? 14),
              color: String(listStyle.color ?? defaults?.color ?? "#111827"),
              fontWeight: listStyle.fontWeight as "normal" | "bold" | undefined,
              fontStyle: listStyle.fontStyle as "normal" | "italic" | undefined,
              textDecoration: listStyle.textDecoration as "none" | "underline" | "line-through" | undefined,
            }}
          >
            <TagName
              start={listType === "ordered" ? (block.start ?? Number(listStyle.start ?? 1)) : undefined}
              style={{
                listStyleType: resolveListStyleType(
                  listType,
                  block.bulletChar ?? (listStyle.bulletChar as string | undefined),
                  block.numberFormat ?? (listStyle.numberFormat as string | undefined),
                ),
                textAlign: listStyle.alignment as "left" | "center" | "right" | "justify" | undefined,
                paddingLeft: listStyle.indent == null ? undefined : Number(listStyle.indent),
              }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <PageCellBlockHtml blocks={item} defaults={defaults} rowContext={rowContext} />
                </li>
              ))}
            </TagName>
          </div>
        );
      })}
    </>
  );
}
