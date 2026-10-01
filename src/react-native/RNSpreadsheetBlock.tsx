/**
 * RN 文档渲染器 —— 嵌入式台账（spreadsheet block）
 *
 * 移动端以「只读简化台账」渲染：把 sheet 块转换为 table block 后复用 RNTable
 * 的网格布局（列宽 / colspan / rowspan / 边框）。行源支持 rowBind 动态绑定。
 * 公式计算 / 冻结窗格等完整能力由 Web 端渲染器提供。
 */

import type { PageBlockDefinition, PageViewDefinition } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { RNTable } from "./RNTable";
import { buildSpreadsheetTableBlock } from "./sheetToTable";

type SpreadsheetBlockDefinition = Extract<PageBlockDefinition, { type: "spreadsheet" }>;

export interface RNSpreadsheetBlockProps {
  block: SpreadsheetBlockDefinition;
  x: number;
  y: number;
  width: number;
  view: PageViewDefinition;
  defaults?: PageTextDefaults;
}

function readNumericRenderHint(
  renderHints: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const value = renderHints?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function RNSpreadsheetBlock({ block, x, y, width, view, defaults }: RNSpreadsheetBlockProps) {
  const { data } = useWorkbookData();
  const tableBlock = buildSpreadsheetTableBlock(block.sheet, data);

  return (
    <RNTable
      block={tableBlock}
      x={x}
      y={y}
      width={width}
      height={readNumericRenderHint(block.renderHints, "height", 200)}
      view={view}
      defaults={defaults}
      cellPaddingOverride={4}
      minRowHeight={24}
    />
  );
}
