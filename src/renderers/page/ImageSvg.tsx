import type { PageBlockDefinition } from "../../core/types";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";

export interface ImageSvgProps {
  block: Extract<PageBlockDefinition, { type: "image" }>;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function ImageSvg({ block, x, y, width, height }: ImageSvgProps) {
  const { assetLoader } = useWorkbookRuntime();
  const renderedWidth = block.width ?? width ?? 160;
  const renderedHeight = block.height ?? height ?? 120;
  const availableWidth = width ?? renderedWidth;
  const alignedX =
    block.alignment === "center"
      ? x + (availableWidth - renderedWidth) / 2
      : block.alignment === "right"
        ? x + availableWidth - renderedWidth
        : x;

  return (
    <image
      href={assetLoader.resolveAssetUrl(block.src) ?? block.src}
      x={alignedX}
      y={y}
      width={renderedWidth}
      height={renderedHeight}
      aria-label={block.alt}
      preserveAspectRatio={block.lockAspectRatio === false ? "none" : "xMidYMid meet"}
    />
  );
}
