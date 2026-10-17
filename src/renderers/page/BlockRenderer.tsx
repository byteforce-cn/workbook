import type { PageBlockDefinition, WorkbookData } from "../../core/types";
import { useOptionalPluginRegistry } from "../../react/pluginRegistryContext";
import { FloatingBlockSvg } from "./FloatingBlockSvg";
import { HeaderFooterSvg } from "./HeaderFooterSvg";
import { ImageSvg } from "./ImageSvg";
import { ListSvg } from "./ListSvg";
import { ParagraphSvg } from "./ParagraphSvg";
import type { PageTextDefaults } from "./pageDefaults";
import { SpreadsheetBlockSvg } from "./SpreadsheetBlockSvg";
import { TableSvg } from "./TableSvg";
import { WatermarkSvg } from "./WatermarkSvg";

/** Height reserved for a custom page block that declares no `renderHints.height`. */
const DEFAULT_CUSTOM_BLOCK_HEIGHT = 160;

/** Custom blocks already reported as unregistered, so the console is not flooded. */
const warnedUnregisteredPageBlocks = new Set<string>();

function warnUnregisteredPageBlock(component: string): void {
  if (warnedUnregisteredPageBlocks.has(component)) {
    return;
  }
  warnedUnregisteredPageBlocks.add(component);
  console.warn(
    `[workbook] Page block \`{ type: "custom", component: "${component}" }\` is not registered, so nothing is rendered. ` +
      "Register it with `registry.registerPageBlock(id, Component)`.",
  );
}

export interface BlockRendererProps {
  block: PageBlockDefinition;
  x: number;
  y: number;
  width: number;
  height?: number;
  pageWidth: number;
  pageHeight: number;
  textDefaults?: PageTextDefaults;
  /** Data tree handed to custom page blocks (optional outside a DataProvider). */
  data?: WorkbookData;
}

export function BlockRenderer({
  block,
  x,
  y,
  width,
  height,
  pageWidth,
  pageHeight,
  textDefaults,
  data = {},
}: BlockRendererProps) {
  const registry = useOptionalPluginRegistry();

  switch (block.type) {
    case "paragraph":
      return <ParagraphSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "table":
      return <TableSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "image":
      return <ImageSvg block={block} x={x} y={y} width={width} height={height} />;
    case "list":
      return <ListSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "header":
    case "footer":
      return <HeaderFooterSvg block={block} x={x} y={y} width={width} height={height} defaults={textDefaults} />;
    case "watermark":
      return <WatermarkSvg block={block} width={pageWidth} height={pageHeight} />;
    case "floating":
      return <FloatingBlockSvg block={block} pageWidth={pageWidth} pageHeight={pageHeight} defaults={textDefaults} />;
    case "custom": {
      // 应用侧扩展点：按 schema 的 component id 命中 registry.registerPageBlock 注册的组件。
      // 未注册时与既有的 default: return null 行为一致（仅提示一次）。
      const PageBlockPlugin = registry?.pageBlock.get(block.component);
      if (PageBlockPlugin == null) {
        warnUnregisteredPageBlock(block.component);
        return null;
      }

      const hintedHeight = typeof block.renderHints?.height === "number" ? block.renderHints.height : undefined;
      const pluginHeight = height ?? hintedHeight ?? DEFAULT_CUSTOM_BLOCK_HEIGHT;

      return (
        <foreignObject x={x} y={y} width={width} height={pluginHeight}>
          <PageBlockPlugin block={block} width={width} height={pluginHeight} data={data} />
        </foreignObject>
      );
    }
    case "spreadsheet":
      return <SpreadsheetBlockSvg block={block} x={x} y={y} width={width} />;
    default:
      return null;
  }
}
