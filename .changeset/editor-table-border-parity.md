---
"@byteforce/workbook": patch
---

Keep the editor's table borders and cell padding identical to print output by
resolving `tableStyles` / authored `border` through the shared
`tableBorders.ts` resolver and feeding the result to the table node view as CSS
custom properties. Add an e2e computed-style parity assertion between the
editor and the print preview.
