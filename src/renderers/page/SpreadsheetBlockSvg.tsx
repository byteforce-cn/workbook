import type { PageBlockDefinition } from "../../core/types";
import { SheetView } from "../sheet/SheetView";

export interface SpreadsheetBlockSvgProps {
  block: Extract<PageBlockDefinition, { type: "spreadsheet" }>;
  x: number;
  y: number;
  width: number;
}

function readNumericRenderHint(renderHints: Record<string, unknown> | undefined, key: string, fallback: number) {
  const value = renderHints?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function SpreadsheetBlockSvg({ block, x, y, width }: SpreadsheetBlockSvgProps) {
  const height = readNumericRenderHint(block.renderHints, "height", 200);

  return (
    <foreignObject x={x} y={y} width={width} height={height} aria-label={block.comment}>
      <div>
        <SheetView
          view={{
            type: "sheet",
            name: block.sheet.name,
            columns: block.sheet.columns,
            rowBind: block.sheet.rowBind,
            rows: block.sheet.rows,
            frozenRows: block.sheet.frozenRows,
            frozenCols: block.sheet.frozenCols,
          }}
          embedded
        />
      </div>
    </foreignObject>
  );
}
