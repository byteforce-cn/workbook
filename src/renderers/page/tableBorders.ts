/**
 * Border resolution shared by the SVG page renderer and the editor table node
 * view. Keeping one implementation is what makes edit-time borders match the
 * printed output.
 */

import type { Border } from "../../schema/generated-types";

export interface BorderParts {
  width: number;
  style: "none" | "solid" | "dashed" | "dotted";
  color: string;
}

export function resolveBorderParts(
  border: Border | undefined,
  fallbackWidth: unknown,
  fallbackColor: unknown,
): BorderParts {
  const color = border?.color ?? fallbackColor ?? "#d1d5db";

  if (border?.style === "none") {
    return { width: 0, style: "none", color: String(color) };
  }

  const width = border?.style === "thick" ? 3 : border?.style === "medium" ? 2 : Number(fallbackWidth ?? 1);
  const style = border?.style === "dashed" || border?.style === "dotted" ? border.style : "solid";

  return { width, style, color: String(color) };
}

export function formatBorder(parts: BorderParts): string {
  return `${parts.width}px ${parts.style} ${parts.color}`;
}
