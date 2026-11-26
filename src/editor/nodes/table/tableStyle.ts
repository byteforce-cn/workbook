/**
 * Project the authored table style onto CSS custom properties understood by
 * the editor table node view.
 *
 * Borders and padding come from the same `tableStyles` / `border` values the
 * SVG renderer reads (`resolveBorderParts`), so edit-time and preview-time
 * tables agree on those two properties.
 */

import type { Node as PMNode } from "@tiptap/pm/model";
import type { WorkbookData } from "../../../core/types";
import { resolveBorderParts } from "../../../renderers/page/tableBorders";
import type { Border } from "../../../schema/generated-types";
import type { createStyleCatalogResolver } from "../../../styles/catalog";

export interface EditorTableStyleContext {
  data: WorkbookData;
  styleResolver: ReturnType<typeof createStyleCatalogResolver>;
}

export const TABLE_STYLE_CUSTOM_PROPERTIES = {
  borderWidth: "--bf-table-border-width",
  borderStyle: "--bf-table-border-style",
  borderColor: "--bf-table-border-color",
  cellPadding: "--bf-table-cell-padding",
} as const;

export function applyEditorTableStyle(dom: HTMLElement, node: PMNode, context?: EditorTableStyleContext): void {
  if (context == null) {
    return;
  }

  const style = context.styleResolver.resolveTableStyle(node.attrs.style as string | undefined, context.data);
  const border = resolveBorderParts(node.attrs.border as Border | undefined, style.borderWidth, style.borderColor);
  const padding = Number(style.cellPadding ?? 8);

  dom.style.setProperty(TABLE_STYLE_CUSTOM_PROPERTIES.borderWidth, `${border.width}px`);
  dom.style.setProperty(TABLE_STYLE_CUSTOM_PROPERTIES.borderStyle, border.style);
  dom.style.setProperty(TABLE_STYLE_CUSTOM_PROPERTIES.borderColor, border.color);
  dom.style.setProperty(TABLE_STYLE_CUSTOM_PROPERTIES.cellPadding, `${padding}px`);
}
