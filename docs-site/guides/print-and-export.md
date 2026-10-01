# Print & Export

`@byteforce/workbook` provides built-in print and PDF export capabilities that work entirely in the browser.

## Browser Print

Trigger the browser's print dialog for a page view:

```ts
import { printWorkbookElement } from "@byteforce/workbook";

// Print a specific page view element
const pageEl = document.getElementById("my-page");
await printWorkbookElement(pageEl);
```

### Print Configuration

Configure print behavior in the schema:

```json
{
  "pageSettings": {
    "format": "A4",
    "orientation": "portrait",
    "printConfig": {
      "copies": 2,
      "collate": true,
      "scale": 100
    }
  }
}
```

### Custom Print Styles

Generate print-specific CSS:

```ts
import { createWorkbookPrintStyles } from "@byteforce/workbook";

const printStyles = createWorkbookPrintStyles({
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 20, right: 15, bottom: 20, left: 15 },
});

// Inject into document head
const style = document.createElement("style");
style.textContent = printStyles;
document.head.appendChild(style);
```

### Collecting Printable Pages

```ts
import { collectWorkbookPrintablePages } from "@byteforce/workbook";

const pages = collectWorkbookPrintablePages(containerElement);
// Array of HTML elements, one per printed page
```

## PDF Export (Binary)

Generate a PDF directly in the browser without the print dialog:

```ts
import { exportWorkbookPdf } from "@byteforce/workbook";

const pdfBytes = await exportWorkbookPdf(pageViewElement, {
  pageSettings: { format: "A4" },
  assetLoader: myAssetLoader, // Optional: preload images
});

// Download or upload the PDF
const blob = new Blob([pdfBytes], { type: "application/pdf" });
const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "document.pdf";
link.click();
```

### PDF with Assets

Preload images before PDF generation:

```ts
import { exportWorkbookPdf, preloadPdfAssets } from "@byteforce/workbook";

const assetLoader = {
  load: async (assetId: string) => {
    const response = await fetch(`/assets/${assetId}`);
    const blob = await response.blob();
    return { data: blob, type: blob.type };
  },
};

const pdfBytes = await exportWorkbookPdf(element, {
  assetLoader,
  pageSettings: { format: "A4" },
});
```

### PDF Features

| Feature | Supported |
|---------|-----------|
| Automatic pagination | ✅ |
| Text with binding | ✅ |
| Tables | ✅ |
| Lists | ✅ |
| Images (embedded) | ✅ |
| Headers/Footers | ✅ |
| Watermarks (text) | ✅ |
| Custom page sizes | ✅ |
| Multiple copies | ✅ |
| CJK font embedding (TrueType) | ✅ |
| OTF/CFF & TTC fonts | 📋 Planned |
| Font compression & subsetting | 📋 Planned |
| Complex floating layout | 📋 Planned |

### Embedding a CJK Font (required for non-ASCII text)

The binary PDF writer embeds a **TrueType (TTF)** font for non-ASCII (CJK)
text. Without an embedded font, non-ASCII text is emitted with a standard,
**non-embedded** `STSong-Light` reference — most viewers (Chrome, Preview, …)
do not ship that font, so CJK text renders **blank** while table borders and
other vector shapes still show.

Pass the font either pre-loaded (`font`) or via an async resolver
(`fontLoader`):

```ts
import { exportWorkbookPdf, createFetchFontLoader } from "@byteforce/workbook";

// Option A — async loader (fetch a TTF from your static assets)
const pdf = await exportWorkbookPdf({
  workbook,
  fontLoader: createFetchFontLoader("/fonts/NotoSansSC-Regular.ttf"),
});

// Option B — pre-loaded bytes (sync API)
const response = await fetch("/fonts/NotoSansSC-Regular.ttf");
const bytes = await response.arrayBuffer();
const pdf = await exportWorkbookPdf({
  workbook,
  font: { id: "NotoSansSC-Regular", bytes },
});
```

The same `font` option works with the synchronous
`createWorkbookPdfFromPageView`, and `fontLoader` is requested with the font id
from `cjkFontId` (default `"cjk"`):

```ts
await exportWorkbookPdf({
  workbook,
  cjkFontId: "noto-sc",
  fontLoader: { load: async (id) => ({ id, bytes: await fetch(`/fonts/${id}.ttf`).then((r) => r.arrayBuffer()) }) },
});
```

Notes:

- Only **TTF** (glyf outlines) is supported. OpenType/CFF (`.otf`), WOFF/WOFF2
  and TrueType Collections (`.ttc`) are rejected with a clear error.
- The font is embedded **uncompressed** (`/FontFile2`); font compression and
  subsetting are planned follow-ups.
- A `ToUnicode` CMap and `/W` width array are generated from the glyphs the
  document actually uses, so the PDF text stays searchable/selectable.
- ASCII text always renders through Helvetica and is unaffected.

## Hooks

Print lifecycle hooks:

```json
{
  "hooks": [
    { "trigger": "onBeforePrint", "type": "dispatch", "action": "prepareForPrint" },
    { "trigger": "onAfterPrint", "type": "dispatch", "action": "afterPrint" }
  ]
}
```

These hooks fire automatically during both browser print and PDF export.
