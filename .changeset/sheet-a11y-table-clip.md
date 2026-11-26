---
"@byteforce/workbook": patch
---

Stop the hidden screen-reader table of `SheetView` from widening the page. A
`<table>` ignores `overflow`, so its content width leaked into the document's
`scrollWidth` and made sheet pages scroll sideways in print/PDF output; the table
now sits in a 1×1 clipping wrapper that keeps it available to assistive
technology without affecting layout.
