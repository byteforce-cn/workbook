/**
 * RN 文档渲染器 —— 水印块
 *
 * 文本/图片水印，支持旋转、透明度、平铺（repeat）与居中单水印；
 * 位置计算与 Web WatermarkSvg 一致（horizontalStep / verticalStep 平铺）。
 * 旋转用 RN transform rotate（默认围绕元素中心，近似 SVG textAnchor middle）。
 */

import { Image, Text, View } from "react-native";
import type { PageBlockDefinition } from "../core/types";
import { useWorkbookRuntime } from "../react/RuntimeProvider";

export interface RNWatermarkProps {
  block: Extract<PageBlockDefinition, { type: "watermark" }>;
  pageWidth: number;
  pageHeight: number;
}

export function RNWatermark({ block, pageWidth, pageHeight }: RNWatermarkProps) {
  const { assetLoader } = useWorkbookRuntime();
  const watermarkSize = Math.max((block.fontSize ?? 48) * 2.5, 120);
  const horizontalStep = watermarkSize + 80;
  const verticalStep = watermarkSize + 80;
  const columns = Math.max(1, Math.ceil(pageWidth / horizontalStep));
  const rows = Math.max(1, Math.ceil(pageHeight / verticalStep));
  const positions = block.repeat
    ? Array.from({ length: columns * rows }, (_, index) => ({
        x: horizontalStep / 2 + (index % columns) * horizontalStep,
        y: verticalStep / 2 + Math.floor(index / columns) * verticalStep,
      }))
    : [{ x: pageWidth / 2, y: pageHeight / 2 }];

  const rotation = block.rotation ?? -30;
  const opacity = block.opacity ?? 0.25;
  const fontSize = block.fontSize ?? 48;
  const resolvedImage = block.image == null ? undefined : assetLoader.resolveAssetUrl(block.image);

  return (
    <>
      {positions.map((position, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            opacity,
            transform: [{ rotate: `${rotation}deg` }],
          }}
        >
          {resolvedImage != null ? (
            <Image
              source={{ uri: resolvedImage }}
              resizeMode="contain"
              style={{
                width: watermarkSize,
                height: watermarkSize,
                marginLeft: -watermarkSize / 2,
                marginTop: -watermarkSize / 2,
              }}
            />
          ) : (
            <Text
              style={{
                fontSize,
                color: block.color ?? "#9ca3af",
                textAlign: "center",
                width: watermarkSize * 1.5,
                marginLeft: -watermarkSize * 0.75,
                marginTop: -fontSize / 2,
              }}
            >
              {block.text}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}
