import type { PageBlockDefinition } from "../../core/types";

export interface FloatingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function resolveMeasurement(value: number | string, size: number): number {
  if (typeof value === "number") {
    return value;
  }

  return (Number(value.replace("%", "")) / 100) * size;
}

/**
 * Single source of truth for floating-block geometry.
 *
 * `layoutPageView` writes these rects into `PageLayoutPage.floatingBlocks`; the
 * SVG renderer and the editor's drag canvas both consume them instead of
 * re-deriving positions.
 */
export function resolveFloatingRect(
  block: Extract<PageBlockDefinition, { type: "floating" }>,
  pageWidth: number,
  pageHeight: number,
): FloatingRect {
  return {
    x: resolveMeasurement(block.layout.x, pageWidth),
    y: resolveMeasurement(block.layout.y, pageHeight),
    width: resolveMeasurement(block.layout.width, pageWidth),
    height: resolveMeasurement(block.layout.height, pageHeight),
  };
}
