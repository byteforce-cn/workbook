/**
 * Apply a mark patch run-by-run.
 *
 * Tiptap's `setMark` replaces the whole mark attributes object for the
 * selection, which would drop a named style from neighbouring runs with a
 * different style id. This maps each text node independently and merges the
 * patch into that run's existing attributes.
 */

import type { Editor } from "@tiptap/core";
import { mergeFormatAttrs } from "./textFormat";

export function applyTextFormat(editor: Editor, patch: Record<string, unknown>): boolean {
  const { state, view } = editor;
  const { from, to } = state.selection;
  const markType = state.schema.marks.wbText;
  if (markType == null) {
    return false;
  }

  const transaction = state.tr;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, position) => {
    if (!node.isText) {
      return;
    }

    const start = Math.max(position, from);
    const end = Math.min(position + node.nodeSize, to);
    if (start >= end) {
      return;
    }

    const existing = node.marks.find((mark) => mark.type === markType);
    transaction.addMark(start, end, markType.create(mergeFormatAttrs(existing?.attrs ?? {}, patch)));
    changed = true;
  });

  if (changed) {
    view.dispatch(transaction);
  }

  return changed;
}

/** Clear direct formatting on each selected run while keeping its named style. */
export function clearTextFormatting(editor: Editor): boolean {
  const { state, view } = editor;
  const { from, to } = state.selection;
  const markType = state.schema.marks.wbText;
  if (markType == null) {
    return false;
  }

  const transaction = state.tr;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, position) => {
    if (!node.isText) {
      return;
    }
    const start = Math.max(position, from);
    const end = Math.min(position + node.nodeSize, to);
    if (start >= end) {
      return;
    }
    const existing = node.marks.find((mark) => mark.type === markType);
    const attrs: Record<string, unknown> = {};
    if (existing?.attrs.style != null) {
      attrs.style = existing.attrs.style;
    }
    transaction.addMark(start, end, markType.create(attrs));
    changed = true;
  });

  if (changed) {
    view.dispatch(transaction);
  }

  return changed;
}
