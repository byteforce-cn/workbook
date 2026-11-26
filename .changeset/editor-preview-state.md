---
"@byteforce/workbook": patch
---

Preserve focus and scroll position when the document editor switches between
edit and print preview. The preview pane receives focus when opened, the editor
caret is restored when switching back, and a 10-page preview switch is covered
by the performance baseline (local baseline ~59 ms, soft gate 1 s).
