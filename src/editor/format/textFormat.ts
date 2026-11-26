/**
 * Named-style-first formatting helpers.
 *
 * Direct formatting never deletes a named style id: changing the font size of
 * a run that uses a character style writes the size override *and* keeps
 * `style`, so round-tripping cannot silently degrade the contract's styling.
 */

import type { WorkbookStyleCatalog } from "../../core/types";

export const DIRECT_FORMAT_KEYS = [
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "fontFamily",
  "fontSize",
  "color",
  "link",
] as const;

export type DirectFormatKey = (typeof DIRECT_FORMAT_KEYS)[number];

export interface FormatOption {
  id: string;
  label: string;
}

/** Sorted style ids with their display names (the catalog has no names, so id). */
export function styleOptions(
  catalog: WorkbookStyleCatalog | undefined,
  group: "paragraphStyles" | "characterStyles",
): FormatOption[] {
  return Object.keys(catalog?.[group] ?? {})
    .sort()
    .map((id) => ({ id, label: id }));
}

/** True when the style definition carries read-only conditional rules. */
export function styleHasConditionalRules(
  catalog: WorkbookStyleCatalog | undefined,
  group: "paragraphStyles" | "tableStyles",
  styleId: unknown,
): boolean {
  if (typeof styleId !== "string") {
    return false;
  }
  const style = catalog?.[group]?.[styleId];
  return Array.isArray(style?.conditional) && style.conditional.length > 0;
}

/** Merge a direct-format patch into the current mark attributes. */
export function mergeFormatAttrs(
  current: Record<string, unknown>,
  patch: Partial<Record<DirectFormatKey, unknown>>,
): Record<string, unknown> {
  return { ...current, ...patch };
}

/** Keep only `style`, clearing every direct-format attribute. */
export function clearDirectFormatting(current: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (current.style != null) {
    next.style = current.style;
  }
  for (const key of DIRECT_FORMAT_KEYS) {
    next[key] = null;
  }
  return next;
}
