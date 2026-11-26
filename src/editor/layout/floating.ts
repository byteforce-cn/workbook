/**
 * Floating-block drag math.
 *
 * A number position means absolute points; a string means a percentage of the
 * page. Dragging preserves the authored unit — a percent block never becomes
 * points just because the preview is scaled differently.
 */

import type { PageBlockDefinition } from "../../core/types";

type FloatingBlock = Extract<PageBlockDefinition, { type: "floating" }>;

export type Measurement = number | string;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function moveAxis(current: Measurement, deltaPx: number, scale: number, pageSize: number): Measurement {
  const delta = deltaPx / Math.max(scale, 0.01);
  if (typeof current === "number") {
    return Math.max(0, round(current + delta));
  }

  const percent = Number(current.replace("%", ""));
  return `${Math.max(0, round(percent + (delta / pageSize) * 100))}%`;
}

function resizeAxis(current: Measurement, deltaPx: number, scale: number, pageSize: number): Measurement {
  const delta = deltaPx / Math.max(scale, 0.01);
  if (typeof current === "number") {
    return Math.max(1, round(current + delta));
  }

  const percent = Number(current.replace("%", ""));
  return `${Math.max(0.1, round(percent + (delta / pageSize) * 100))}%`;
}

/** Apply a pixel drag (in canvas pixels) to a floating block at `scale`. */
export function moveFloatingBlock(
  block: FloatingBlock,
  deltaXPx: number,
  deltaYPx: number,
  scale: number,
  pageWidth: number,
  pageHeight: number,
): FloatingBlock {
  return {
    ...block,
    layout: {
      ...block.layout,
      x: moveAxis(block.layout.x, deltaXPx, scale, pageWidth),
      y: moveAxis(block.layout.y, deltaYPx, scale, pageHeight),
    },
  };
}

/** Resize a floating block with a pixel delta, keeping its units. */
export function resizeFloatingBlock(
  block: FloatingBlock,
  deltaWidthPx: number,
  deltaHeightPx: number,
  scale: number,
  pageWidth: number,
  pageHeight: number,
): FloatingBlock {
  return {
    ...block,
    layout: {
      ...block.layout,
      width: resizeAxis(block.layout.width, deltaWidthPx, scale, pageWidth),
      height: resizeAxis(block.layout.height, deltaHeightPx, scale, pageHeight),
    },
  };
}

/** `"30%"` → `"30%"`, `"30"` → `30`; invalid input returns null. */
export function parseMeasurement(raw: string): Measurement | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }

  if (/^[0-9]+(\.[0-9]+)?%$/.test(trimmed)) {
    return trimmed;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function formatMeasurement(value: Measurement): string {
  return typeof value === "number" ? String(value) : value;
}
