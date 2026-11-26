---
"@byteforce/workbook": patch
---

Fix two embedding bugs in the document editor:

- the "条件样式（只读）" badge is anchored to its own paragraph instead of the
  editor root, so it no longer paints over the first line of the document;
- the out-of-flow panel is docked next to the document only when the editor
  itself is wide enough (container query), instead of squeezing the document
  to ~170px inside narrow hosts such as the Storybook docs column.
