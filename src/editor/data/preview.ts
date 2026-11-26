/**
 * Editor preview-data helpers.
 *
 * The editor shows the template (`{{path}}`); previews resolve the bind against
 * the effective data. Both paths live here so preview data has exactly one
 * meaning in the editor and can never be written back into the document.
 */

import { resolveBindValue } from "../../core/bind/resolveBind";
import type { BindDefinition, WorkbookData } from "../../core/types";

/** Attributes a `wbBind` node carries; unknown shapes are tolerated. */
export interface BindAttrsLike {
  path?: unknown;
  format?: unknown;
  placeholder?: unknown;
}

/**
 * Preview data is a read-only overlay: an explicit `previewData` wins over the
 * live data tree and never mutates it.
 */
export function resolveEditorPreviewData(previewData: WorkbookData | undefined, data: WorkbookData): WorkbookData {
  return previewData ?? data;
}

/** Project `wbBind` attrs onto the workbook `BindDefinition` shape. */
export function bindFromAttrs(attrs: BindAttrsLike): BindDefinition {
  const bind: BindDefinition = { path: String(attrs.path ?? "") };
  if (typeof attrs.format === "string") {
    bind.format = attrs.format;
  }
  if (attrs.placeholder != null) {
    bind.placeholder = attrs.placeholder;
  }
  return bind;
}

/** Template label shown on the chip: `{{path}}` or `{{path | format}}`. */
export function bindChipLabel(attrs: BindAttrsLike): string {
  const path = String(attrs.path ?? "");
  const format = typeof attrs.format === "string" && attrs.format !== "" ? ` | ${attrs.format}` : "";
  return `{{${path}${format}}}`;
}

/** Popover input value: strings only; structured placeholders start empty. */
export function bindPlaceholderText(attrs: BindAttrsLike): string {
  return attrs.placeholder == null || typeof attrs.placeholder === "object" ? "" : String(attrs.placeholder);
}

/** Resolve a bind for preview display; `undefined` means "show the empty placeholder". */
export function resolveBindPreview(bind: BindDefinition, data: WorkbookData): string | undefined {
  const value = resolveBindValue(bind, data);
  return value == null ? undefined : String(value);
}
