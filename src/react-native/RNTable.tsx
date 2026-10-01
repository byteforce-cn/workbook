/**
 * RN 文档渲染器 —— 表格块（绝对定位网格）
 *
 * 语义与 Web TableSvg（HTML 表格）对齐：
 *  - 列宽：声明列宽按内容宽等比缩放，无数字列宽时等分；
 *  - 行高：单元格内容高度（复用 measurePageBlockHeight 估算）+ 内边距，
 *    以 row.height / 最小行高兜底；
 *  - 单元格：computeTableGrid 计算绝对位置（colSpan / rowSpan / blank 占位），
 *    逐格绘制四边边框与背景、hAlign / vAlign / 文字旋转；
 *  - 内容：RNCellContent 流式渲染（段落/图片/嵌套列表）。
 *
 * 与 Web 的差异说明：RN 无法像 HTML 一样自动换行测量，行高为估算值；
 * 超出单元格高度的内容按页面 overflow hidden 裁剪（等价 foreignObject 裁剪）。
 */

import { useMemo } from "react";
import { View } from "react-native";
import type { PageBlockDefinition, PageViewDefinition } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { measurePageBlockHeight } from "../renderers/page/pageLayout";
import type { Border } from "../schema/generated-types";
import { RNCellContent } from "./RNCellContent";
import { computeTableGrid, type TableGridCellInput } from "./tableGrid";

type TableBlockDefinition = Extract<PageBlockDefinition, { type: "table" }>;

export interface RNTableProps {
  block: TableBlockDefinition;
  x: number;
  y: number;
  width: number;
  height?: number;
  view: PageViewDefinition;
  defaults?: PageTextDefaults;
  /** 嵌入式台账覆盖：单元格内边距（Web sheet 用小内边距） */
  cellPaddingOverride?: number;
  /** 嵌入式台账覆盖：最小行高（sheet.defaultRowHeight） */
  minRowHeight?: number;
}

interface ResolvedBorder {
  width: number;
  style: "solid" | "dashed" | "dotted";
  color: string;
}

function resolveBorder(border: Border | undefined, fallbackWidth: unknown, fallbackColor: unknown): ResolvedBorder {
  const color = border?.color ?? fallbackColor ?? "#d1d5db";

  if (border?.style === "none") {
    return { width: 0, style: "solid", color: String(color) };
  }

  const width = border?.style === "thick" ? 3 : border?.style === "medium" ? 2 : Number(fallbackWidth ?? 1);
  const style = border?.style === "dashed" || border?.style === "dotted" ? border.style : "solid";

  return { width, style, color: String(color) };
}

export function RNTable({
  block,
  x,
  y,
  width,
  height,
  view,
  defaults,
  cellPaddingOverride,
  minRowHeight,
}: RNTableProps) {
  const { data } = useWorkbookData();
  const { registry, styleResolver } = useWorkbookRuntime();
  const tableStyle = styleResolver.resolveTableStyle(block.style, data);
  const cellPadding = cellPaddingOverride ?? Number(tableStyle.cellPadding ?? 8);
  const minRow = minRowHeight ?? 40;

  const layout = useMemo(() => {
    // 列宽：声明列宽按内容宽等比缩放（对齐浏览器按比例缩放列）；无数字列宽时等分
    const declared = block.columns.map((columnWidth) =>
      typeof columnWidth === "number" && columnWidth > 0 ? columnWidth : 0,
    );
    const totalDeclared = declared.reduce((sum, w) => sum + w, 0) || width;
    const colWidths = declared.map((w) => (w > 0 ? (w / totalDeclared) * width : width / Math.max(1, declared.length)));

    // 行高：内容块高度 + 上下内边距；以 row.height / 最小行高兜底
    const rowHeights = block.rows.map((row) => {
      const contentHeight = row.cells.reduce((maxHeight, cell) => {
        const colSpan = Math.max(1, cell.colSpan ?? 1);
        const cellWidth = Math.max(1, colWidths.slice(0, colSpan).reduce((sum, w) => sum + w, 0) - cellPadding * 2);
        const blockHeight = cell.content.reduce(
          (sum, contentBlock) =>
            sum + measurePageBlockHeight(view, contentBlock, cellWidth, { data, registry, styleResolver }),
          0,
        );
        return Math.max(maxHeight, blockHeight + cellPadding * 2);
      }, 0);
      return Math.max(minRow, row.height ?? 0, contentHeight);
    });

    const gridRows: TableGridCellInput[][] = block.rows.map((row) =>
      row.cells.map((cell, index) => ({ column: index, colSpan: cell.colSpan ?? 1, rowSpan: cell.rowSpan ?? 1 })),
    );
    const placements = computeTableGrid({ colWidths, rowHeights, rows: gridRows });

    return { colWidths, rowHeights, placements };
  }, [block, width, view, data, registry, styleResolver, cellPadding, minRow]);

  const totalWidth = layout.colWidths.reduce((sum, w) => sum + w, 0);
  const totalHeight = layout.rowHeights.reduce((sum, h) => sum + h, 0);

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: totalWidth,
        height: Math.max(totalHeight, height ?? 0),
        backgroundColor: String(block.fill ?? tableStyle.backgroundColor ?? "transparent"),
        overflow: "hidden",
      }}
    >
      {layout.placements.map((placement, index) => {
        const cell = block.rows[placement.rowIndex].cells[placement.cellIndex];
        const cellStyle = styleResolver.resolveCellStyle(cell.style, data);
        const topBorder = resolveBorder(
          (cellStyle.borderTop as Border | undefined) ?? block.border,
          tableStyle.borderWidth,
          tableStyle.borderColor,
        );
        const rightBorder = resolveBorder(
          (cellStyle.borderRight as Border | undefined) ?? block.border,
          tableStyle.borderWidth,
          tableStyle.borderColor,
        );
        const bottomBorder = resolveBorder(
          (cellStyle.borderBottom as Border | undefined) ?? block.border,
          tableStyle.borderWidth,
          tableStyle.borderColor,
        );
        const leftBorder = resolveBorder(
          (cellStyle.borderLeft as Border | undefined) ?? block.border,
          tableStyle.borderWidth,
          tableStyle.borderColor,
        );
        const textAlign = String(cellStyle.hAlign ?? tableStyle.hAlign ?? "left") as "left" | "center" | "right";
        const verticalAlign = cell.verticalAlign ?? String(cellStyle.vAlign ?? tableStyle.vAlign ?? "top");
        const textRotation = cellStyle.textRotation == null ? undefined : Number(cellStyle.textRotation);
        // RN 只支持全局 borderStyle（不支持 borderTopStyle 等），取各边样式的优先级：dashed > dotted > solid
        const borderStyle: "solid" | "dashed" | "dotted" = [topBorder, rightBorder, bottomBorder, leftBorder].some(
          (border) => border.style === "dashed",
        )
          ? "dashed"
          : [topBorder, rightBorder, bottomBorder, leftBorder].some((border) => border.style === "dotted")
            ? "dotted"
            : "solid";

        return (
          <View
            key={index}
            style={{
              position: "absolute",
              left: placement.x,
              top: placement.y,
              width: placement.width,
              height: placement.height,
              padding: cellPadding,
              borderTopWidth: topBorder.width,
              borderTopColor: topBorder.color,
              borderRightWidth: rightBorder.width,
              borderRightColor: rightBorder.color,
              borderBottomWidth: bottomBorder.width,
              borderBottomColor: bottomBorder.color,
              borderLeftWidth: leftBorder.width,
              borderLeftColor: leftBorder.color,
              borderStyle,
              backgroundColor: String(
                cellStyle.backgroundColor ?? block.fill ?? tableStyle.backgroundColor ?? "transparent",
              ),
              justifyContent:
                verticalAlign === "middle" ? "center" : verticalAlign === "bottom" ? "flex-end" : "flex-start",
            }}
          >
            <View style={textRotation == null ? undefined : { transform: [{ rotate: `${textRotation}deg` }] }}>
              <RNCellContent blocks={cell.content} defaults={defaults} textAlign={textAlign} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
