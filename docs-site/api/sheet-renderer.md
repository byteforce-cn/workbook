# Sheet Renderer

The standalone `SheetView` component renders a spreadsheet from a BF Workbook Schema sheet view definition. It uses HTML5 Canvas for high-performance rendering with virtual scrolling.

## Import

```ts
import { WorkbookSheetView } from "@byteforce/workbook";
```

## Props

```typescript
interface SheetViewProps {
  /** A BF Workbook Schema sheet view definition */
  view: SheetViewDefinition;
}
```

## Basic Usage

```tsx
import { WorkbookSheetView } from "@byteforce/workbook";

function MySpreadsheet() {
  return (
    <WorkbookSheetView
      view={{
        type: "sheet",
        id: "my-sheet",
        columns: [
          { name: "id", label: "ID", width: 60 },
          { name: "name", label: "Name", width: 150 },
          { name: "amount", label: "Amount", width: 100, format: "#,##0.00" },
        ],
        rows: [
          { cells: [{ value: "1" }, { value: "Alice" }, { value: 1250 }] },
          { cells: [{ value: "2" }, { value: "Bob" }, { value: 3400 }] },
        ],
      }}
    />
  );
}
```

## Features

### Canvas Rendering
- High-DPI canvas with device pixel ratio adaptation
- Frozen rows/columns with split-pane rendering
- Synchronized scrolling between frozen and scrollable panes

### Virtual Scrolling
- Only visible rows are rendered (configurable threshold, default: 500)
- Efficient for datasets with 10,000+ rows
- Falls back to HTML table for accessibility

### Dynamic Row Binding
Bind sheet rows to a data array for dynamic content:

```json
{
  "rowBind": {
    "path": "items",
    "columns": [
      { "name": "name", "bind": "name" },
      { "name": "price", "bind": "price", "format": "¥#,##0.00" }
    ]
  }
}
```

### Formulas
Basic formula support with cell references and aggregate functions:

```
Supported: SUM(A1:A10), AVG(...), MIN(...), MAX(...), COUNT(...)
Cell refs: A1, B2, etc.
```

### Embedded Forms
Sheet cells can contain embedded forms for inline editing.

## Accessibility

Canvas rendering provides a hidden HTML table fallback for screen readers:

```html
<table aria-label="Sheet: My Spreadsheet">
  <!-- Hidden but accessible to screen readers -->
</table>
```

## Context Requirements

Same as FormView and PageView:

```tsx
<DataProvider initialData={{ items: [...] }}>
  <WorkbookRuntimeProvider registry={createPluginRegistry()}>
    <WorkbookSheetView view={sheetView} />
  </WorkbookRuntimeProvider>
</DataProvider>
```
