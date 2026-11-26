---
"@byteforce/workbook": patch
---

Make the shipped surfaces pass axe (WCAG 2.0/2.1 A+AA):

- sheet panes are reachable by keyboard (`tabindex=0`, `role="region"` with a
  label) instead of being scrollable-but-unfocusable;
- the tag-selector remove affordance uses an icon instead of a literal `x`, and
  the editor toolbar's "clear formatting" glyph is an icon, so the accessible
  name no longer contradicts the visible text (WCAG 2.5.3);
- the bind chip's accessible name includes the visible `{{path}}`;
- SVG `<image>` blocks declare `role="img"` before `aria-label`.
