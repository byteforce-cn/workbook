/**
 * RN 文档渲染器 —— 列表块（page 流式内容）
 *
 * 绝对定位 + 首行缩进 + 段前/段后距，内容复用 RNCellContent 内的 RNListBlock
 * （bullet / ordered 标记与序号格式在 RNCellContent.tsx 中实现）。
 */

import { View } from "react-native";
import type { PageBlockDefinition } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNListBlock } from "./RNCellContent";

export interface RNListProps {
  block: Extract<PageBlockDefinition, { type: "list" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  defaults?: PageTextDefaults;
}

export function RNList({ block, x, y, width, defaults }: RNListProps) {
  const { data } = useWorkbookData();
  const { styleResolver } = useWorkbookRuntime();
  const style = styleResolver.resolveListStyle(block.style, data);
  const indent = Number(style.indent ?? 0);
  const spaceBefore = Number(style.spaceBefore ?? 0);
  const spaceAfter = Number(style.spaceAfter ?? 0);

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
      <RNListBlock block={block} defaults={defaults} />
    </View>
  );
}
