---
"@byteforce/workbook": patch
---

修复文档页内嵌 spreadsheet 块（如“Sheet 摘要”）的视口尺寸计算：按宿主块宽高适配，不再产生多余横向滚动条；出现滚动条时为其预留宽高，避免最后一行/列被裁切。

Fix embedded spreadsheet block (e.g. page "Sheet summary") viewport sizing: fit to the host block size, avoid stray scrollbars, and reserve scrollbar space so the last row/column is not clipped.
