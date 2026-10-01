import type { PageBlockDefinition } from "../../core/types";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import type { Border } from "../../schema/generated-types";
import { PageCellBlockHtml } from "./PageCellBlockHtml";
import type { PageTextDefaults } from "./pageDefaults";

export interface TableSvgProps {
  block: Extract<PageBlockDefinition, { type: "table" }>;
  x: number;
  y: number;
  width: number;
  height?: number;
  defaults?: PageTextDefaults;
}

function resolveMeasurement(value: number | string | undefined, fallback?: number) {
  if (value == null) {
    return fallback;
  }

  return typeof value === "number" ? `${value}px` : value;
}

function resolveBorderParts(
  border: Border | undefined,
  fallbackWidth: unknown,
  fallbackColor: unknown,
): { width: number; style: "none" | "solid" | "dashed" | "dotted"; color: string } {
  const color = border?.color ?? fallbackColor ?? "#d1d5db";

  if (border?.style === "none") {
    return { width: 0, style: "none", color: String(color) };
  }

  const width = border?.style === "thick" ? 3 : border?.style === "medium" ? 2 : Number(fallbackWidth ?? 1);
  const lineStyle = border?.style === "dashed" || border?.style === "dotted" ? border.style : "solid";

  return { width, style: lineStyle, color: String(color) };
}

function formatBorder(parts: ReturnType<typeof resolveBorderParts>) {
  return `${parts.width}px ${parts.style} ${parts.color}`;
}

function createCellTextDefaults(
  tableStyle: Record<string, unknown>,
  cellStyle: Record<string, unknown>,
  defaults?: PageTextDefaults,
): PageTextDefaults {
  return {
    fontFamily: String(cellStyle.fontFamily ?? tableStyle.fontFamily ?? defaults?.fontFamily ?? "sans-serif"),
    fontSize: Number(cellStyle.fontSize ?? tableStyle.fontSize ?? defaults?.fontSize ?? 14),
    lineHeight: defaults?.lineHeight,
    color: String(cellStyle.color ?? tableStyle.color ?? defaults?.color ?? "#111827"),
  };
}

export function TableSvg({ block, x, y, width, height, defaults }: TableSvgProps) {
  const { data } = useWorkbookData();
  const { styleResolver } = useWorkbookRuntime();
  const tableStyle = styleResolver.resolveTableStyle(block.style, data);

  return (
    <foreignObject x={x} y={y} width={width} height={height ?? Math.max(120, block.rows.length * 40)}>
      <div>
        <table
          style={{
            borderCollapse: "collapse",
            width: resolveMeasurement(block.width, width) ?? "100%",
            fontFamily: String(tableStyle.fontFamily ?? "sans-serif"),
            fontSize: Number(tableStyle.fontSize ?? defaults?.fontSize ?? 14),
            color: String(tableStyle.color ?? defaults?.color ?? "#111827"),
            fontWeight: tableStyle.fontWeight as "normal" | "bold" | undefined,
            fontStyle: tableStyle.fontStyle as "normal" | "italic" | undefined,
            textDecoration: tableStyle.textDecoration as "none" | "underline" | "line-through" | undefined,
            backgroundColor: String(block.fill ?? tableStyle.backgroundColor ?? "transparent"),
          }}
        >
          <colgroup>
            {block.columns.map((columnWidth, columnIndex) => (
              <col key={columnIndex} style={{ width: resolveMeasurement(columnWidth) }} />
            ))}
          </colgroup>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ height: row.height }}>
                {row.cells.map((cell, cellIndex) => {
                  const cellStyle = styleResolver.resolveCellStyle(cell.style, data);
                  const topBorder = resolveBorderParts(
                    (cellStyle.borderTop as Border | undefined) ?? block.border,
                    tableStyle.borderWidth,
                    tableStyle.borderColor,
                  );
                  const rightBorder = resolveBorderParts(
                    (cellStyle.borderRight as Border | undefined) ?? block.border,
                    tableStyle.borderWidth,
                    tableStyle.borderColor,
                  );
                  const bottomBorder = resolveBorderParts(
                    (cellStyle.borderBottom as Border | undefined) ?? block.border,
                    tableStyle.borderWidth,
                    tableStyle.borderColor,
                  );
                  const leftBorder = resolveBorderParts(
                    (cellStyle.borderLeft as Border | undefined) ?? block.border,
                    tableStyle.borderWidth,
                    tableStyle.borderColor,
                  );
                  return (
                    <td
                      key={cellIndex}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      style={{
                        borderTopWidth: topBorder.width,
                        borderTopStyle: topBorder.style,
                        borderTopColor: topBorder.color,
                        borderTop: formatBorder(topBorder),
                        borderRightWidth: rightBorder.width,
                        borderRightStyle: rightBorder.style,
                        borderRightColor: rightBorder.color,
                        borderRight: formatBorder(rightBorder),
                        borderBottomWidth: bottomBorder.width,
                        borderBottomStyle: bottomBorder.style,
                        borderBottomColor: bottomBorder.color,
                        borderBottom: formatBorder(bottomBorder),
                        borderLeftWidth: leftBorder.width,
                        borderLeftStyle: leftBorder.style,
                        borderLeftColor: leftBorder.color,
                        borderLeft: formatBorder(leftBorder),
                        padding: Number(tableStyle.cellPadding ?? 8),
                        color: String(cellStyle.color ?? tableStyle.color ?? "#111827"),
                        backgroundColor: String(
                          cellStyle.backgroundColor ?? block.fill ?? tableStyle.backgroundColor ?? "transparent",
                        ),
                        verticalAlign: cell.verticalAlign ?? String(cellStyle.vAlign ?? tableStyle.vAlign ?? "top"),
                        textAlign: String(cellStyle.hAlign ?? tableStyle.hAlign ?? "left") as
                          | "left"
                          | "center"
                          | "right",
                        fontFamily: String(
                          cellStyle.fontFamily ?? tableStyle.fontFamily ?? defaults?.fontFamily ?? "sans-serif",
                        ),
                        fontSize: Number(cellStyle.fontSize ?? tableStyle.fontSize ?? defaults?.fontSize ?? 14),
                        fontWeight: cellStyle.fontWeight as "normal" | "bold" | undefined,
                        fontStyle: cellStyle.fontStyle as "normal" | "italic" | undefined,
                        textDecoration: cellStyle.textDecoration as "none" | "underline" | "line-through" | undefined,
                        whiteSpace: cellStyle.wrapText === false ? "nowrap" : undefined,
                        transform:
                          cellStyle.textRotation == null ? undefined : `rotate(${Number(cellStyle.textRotation)}deg)`,
                        transformOrigin: "center",
                        width: resolveMeasurement(cell.width),
                      }}
                    >
                      <PageCellBlockHtml
                        blocks={cell.content}
                        defaults={createCellTextDefaults(tableStyle, cellStyle, defaults)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </foreignObject>
  );
}
