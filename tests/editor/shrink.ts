/**
 * Hand-written block minimizer for codepc failures.
 *
 * No fuzz dependency: repeatedly delete one block while the failure still
 * reproduces. The result is the smallest block list that still fails.
 */

import type { PageBlockDefinition, PageViewDefinition } from "../../src/core/types";

export interface ShrinkResult {
  view: PageViewDefinition;
  removed: number;
}

export function shrinkView(
  view: PageViewDefinition,
  stillFails: (candidate: PageViewDefinition) => boolean,
): ShrinkResult {
  let blocks: PageBlockDefinition[] = [...view.content];
  let removed = 0;

  let changed = true;
  while (changed && blocks.length > 1) {
    changed = false;
    for (let index = 0; index < blocks.length; index += 1) {
      const candidate = blocks.filter((_block, blockIndex) => blockIndex !== index);
      if (stillFails({ ...view, content: candidate })) {
        blocks = candidate;
        removed += 1;
        changed = true;
        break;
      }
    }
  }

  return { view: { ...view, content: blocks }, removed };
}
