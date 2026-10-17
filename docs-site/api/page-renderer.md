# Page Renderer

The standalone `PageView` component renders a document page from a BF Workbook Schema page view definition. It uses SVG + `foreignObject` for rich text layout with automatic pagination.

## Import

```ts
import { WorkbookPageView } from "@byteforce/workbook";
```

## Props

```typescript
interface PageViewProps {
  /** A BF Workbook Schema page view definition */
  view: PageViewDefinition;
}
```

## Basic Usage

```tsx
import { WorkbookPageView } from "@byteforce/workbook";

function MyDocument() {
  return (
    <WorkbookPageView
      view={{
        type: "page",
        id: "my-doc",
        pageSettings: {
          format: "A4",
          margins: { top: 72, right: 72, bottom: 72, left: 72 },
        },
        blocks: [
          { type: "paragraph", text: "Hello, World!", style: "heading1" },
          { type: "paragraph", text: "This is a sample document." },
        ],
      }}
    />
  );
}
```

## Supported Block Types

| Block Type | Description |
|------------|-------------|
| `paragraph` | Rich text with runs (textRun, lineBreak, inlineImage) |
| `table` | Tabular data with colspan/rowspan, conditional styles |
| `list` | Ordered/unordered lists |
| `image` | Images with asset mapping, alignment, sizing |
| `header` | Page headers (first-page, odd/even control) |
| `footer` | Page footers (first-page, odd/even control) |
| `watermark` | Text/image watermarks with repeat tiling |
| `floating` | Absolutely positioned blocks |
| `pageBreak` | Manual page breaks |
| `spreadsheet` | Embedded sheet view |
| `custom` | Host component registered through `registry.registerPageBlock()` |

### Custom page blocks (`type: "custom"`)

A page view can host host-rendered blocks — a flow progress bar, a KPI strip, a
business table — by extending the plugin registry instead of forking the
renderer:

```tsx
import { createPluginRegistry, DocumentRenderer } from "@byteforce/workbook";
import { FlowStepper } from "./FlowStepper"; // your component

const registry = createPluginRegistry({ namespace: "app" });
registry.registerPageBlock("app:flowStepper", FlowStepper);

<DocumentRenderer workbook={workbook} registry={registry} />;
```

```json
{
  "type": "page",
  "content": [
    {
      "type": "custom",
      "component": "app:flowStepper",
      "renderHints": { "height": 120 },
      "props": { "currentStep": 2 }
    }
  ]
}
```

The component receives `{ block, width, height, data }`:

- `block` — the schema block, including `component` and `props`
- `width` / `height` — the space the pagination engine allocated, in px
- `data` — the current data tree, so the block can render bound values

Rules of thumb:

- **Declare `renderHints.height`.** Pagination reserves exactly that height
  (without it the block is measured as 0 and can overlap the next block). The
  renderer falls back to 160px for drawing only.
- Registration is namespaced like every other plugin slot, and `replace()` /
  `has()` work the same way.
- An unregistered `component` renders nothing (the pre-1.1 behaviour) and logs a
  single warning naming the id.
- **Screen only.** Print and PDF export render the built-in blocks; a custom
  block contributes its reserved space but no content. Keep print-critical
  content in the built-in blocks.

### Table column widths

A `table` block declares its column widths as either a number (px) or a
percentage string; the two can be mixed in one table:

```json
{
  "type": "table",
  "columns": [180, "20%", "30%"],
  "rows": [ /* … */ ]
}
```

- **number** — fixed width in px for that column.
- **`"NN%"`** — percentage of the *table's* content width (not of the page),
  resolved the same way the browser resolves `<col style="width: NN%">`.

When the declared widths do not fill the table, the browser distributes the
surplus across the columns; the pagination measurement applies the same
proportional scaling, so measured row heights match the rendered output for px,
percentage and mixed declarations alike.

## Pagination Engine

The page renderer includes a measurement-based automatic pagination engine:

- Content is measured against page dimensions
- Blocks that exceed the remaining space automatically flow to the next page
- Paragraphs, tables, and lists support cross-page splitting
- Orphan/widow control (configurable)

## Context Requirements

Same context requirements as FormView — wrap with `DataProvider` and `WorkbookRuntimeProvider`:

```tsx
import { DataProvider, WorkbookRuntimeProvider } from "@byteforce/workbook/react";
import { createPluginRegistry } from "@byteforce/workbook/react";

<DataProvider initialData={{}}>
  <WorkbookRuntimeProvider registry={createPluginRegistry()}>
    <WorkbookPageView view={pageView} />
  </WorkbookRuntimeProvider>
</DataProvider>
```

## Styling

Page blocks consume the schema `styles` catalog for:
- `paragraphStyle` — font, size, color, alignment, lineHeight, spacing
- `tableStyle` — borders, fills, cell padding
- `cellStyle` — per-cell styling with conditional overrides
- `listStyle` — bullet/number formatting, indentation
