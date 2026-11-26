/**
 * Merge the edited flow back into the authored content array while keeping
 * header/footer/watermark/floating blocks at their original relative slots.
 *
 * Those four block types are edited in panels, never in the ProseMirror
 * document, so a naive `[...flow, ...overlays]` would silently reorder the
 * document and produce noisy diffs on every save.
 */

import type { PageBlockDefinition } from "../../core/types";

const OVERLAY_TYPES: Record<string, true> = { header: true, footer: true, watermark: true, floating: true };

export function isOverlayBlock(block: PageBlockDefinition): boolean {
  return OVERLAY_TYPES[block.type] === true;
}

export function mergeEditorContent(
  baseContent: readonly PageBlockDefinition[],
  flowBlocks: readonly PageBlockDefinition[],
  overlayBlocks: readonly PageBlockDefinition[],
): PageBlockDefinition[] {
  const pendingFlow = [...flowBlocks];
  const pendingOverlays = [...overlayBlocks];
  const result: PageBlockDefinition[] = [];

  const takeOverlayOfType = (type: PageBlockDefinition["type"]): PageBlockDefinition | undefined => {
    const index = pendingOverlays.findIndex((block) => block.type === type);
    if (index < 0) {
      return undefined;
    }
    return pendingOverlays.splice(index, 1)[0];
  };

  for (const block of baseContent) {
    if (isOverlayBlock(block)) {
      const overlay = takeOverlayOfType(block.type);
      if (overlay != null) {
        result.push(overlay);
      }
      continue;
    }

    const nextFlowBlock = pendingFlow.shift();
    if (nextFlowBlock != null) {
      result.push(nextFlowBlock);
    }
  }

  result.push(...pendingFlow, ...pendingOverlays);
  return result;
}
