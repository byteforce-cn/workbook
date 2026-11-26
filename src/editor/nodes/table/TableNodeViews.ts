/**
 * Plain ProseMirror node views for tables.
 *
 * The table's editable content is the `<table>` itself so the authored
 * `wbTableColgroup` child can render a real `<colgroup>` with percentage
 * widths — keeping edit-time column sizing identical to `TableSvg`'s model.
 */

import type { Node as PMNode } from "@tiptap/pm/model";
import type { NodeView } from "@tiptap/pm/view";
import { applyEditorTableStyle, type EditorTableStyleContext } from "./tableStyle";

function applyTableAttributes(dom: HTMLTableElement, node: PMNode, context?: EditorTableStyleContext): void {
  dom.dataset.wbTable = "true";
  if (typeof node.attrs.style === "string") {
    dom.dataset.wbStyle = node.attrs.style;
  } else {
    delete dom.dataset.wbStyle;
  }

  const width = node.attrs.width;
  dom.style.width = typeof width === "number" ? `${width}px` : typeof width === "string" ? width : "";
  applyEditorTableStyle(dom, node, context);
}

export function createTableNodeView(getContext?: () => EditorTableStyleContext): (props: { node: PMNode }) => NodeView {
  return ({ node }) => {
    const dom = document.createElement("table");
    applyTableAttributes(dom, node, getContext?.());

    return {
      dom,
      contentDOM: dom,
      update(nextNode) {
        if (nextNode.type !== node.type) {
          return false;
        }
        applyTableAttributes(dom, nextNode, getContext?.());
        return true;
      },
      ignoreMutation(mutation) {
        return mutation.type === "selection";
      },
    };
  };
}

function renderColumns(dom: HTMLElement, widths: unknown): void {
  dom.replaceChildren();
  if (!Array.isArray(widths)) {
    return;
  }

  for (const width of widths) {
    const col = document.createElement("col");
    col.style.width = typeof width === "number" ? `${width}px` : String(width);
    dom.append(col);
  }
}

export function createColgroupNodeView(): (props: { node: PMNode }) => NodeView {
  return ({ node }) => {
    const dom = document.createElement("colgroup");
    dom.dataset.wbColgroup = "true";
    renderColumns(dom, node.attrs.widths);

    return {
      dom,
      update(nextNode) {
        if (nextNode.type !== node.type) {
          return false;
        }
        renderColumns(dom, nextNode.attrs.widths);
        return true;
      },
      ignoreMutation() {
        return true;
      },
    };
  };
}
