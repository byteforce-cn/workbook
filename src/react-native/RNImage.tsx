/**
 * RN 文档渲染器 —— 图片块
 *
 * 绝对定位 + 水平对齐（left / center / right），与 Web ImageSvg 语义一致；
 * 锁宽高比时 contain，否则 stretch。
 */

import { Image } from "react-native";
import type { PageBlockDefinition } from "../core/types";
import { useWorkbookRuntime } from "../react/RuntimeProvider";

export interface RNImageProps {
  block: Extract<PageBlockDefinition, { type: "image" }>;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function RNImage({ block, x, y, width, height }: RNImageProps) {
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
    <Image
      source={{ uri: assetLoader.resolveAssetUrl(block.src) ?? block.src }}
      accessibilityLabel={block.alt ?? ""}
      resizeMode={block.lockAspectRatio === false ? "stretch" : "contain"}
      style={{ position: "absolute", left: alignedX, top: y, width: renderedWidth, height: renderedHeight }}
    />
  );
}
