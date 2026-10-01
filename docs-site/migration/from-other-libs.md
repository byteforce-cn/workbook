# Migrating from Other Libraries

This guide helps you transition from popular form/document libraries to `@byteforce/workbook`.

## From Formik / React Hook Form

If you're using Formik or React Hook Form for form management, the simplest migration path is the Quick Start API:

### Formik → SimpleForm

**Before (Formik):**
```tsx
import { Formik, Field, Form } from "formik";

<Formik
  initialValues={{ email: "", password: "" }}
  onSubmit={handleSubmit}
>
  <Form>
    <Field name="email" type="email" />
    <Field name="password" type="password" />
    <button type="submit">Submit</button>
  </Form>
</Formik>
```

**After (SimpleForm):**
```tsx
import { SimpleForm } from "@byteforce/workbook/quick";

<SimpleForm
  fields={[
    { name: "email", type: "email", label: "Email", required: true },
    { name: "password", type: "password", label: "Password", required: true },
  ]}
  onSubmit={handleSubmit}
/>
```

### Key Differences

| Feature | Formik | @byteforce/workbook |
|---------|--------|---------------------|
| Schema | Manual JSX | JSON schema or SimpleFieldDef |
| Validation | Yup/Zod | Built-in + Zod adapter |
| Conditional fields | Manual render logic | Declarative conditions |
| Layout | Manual | JSON-driven rows/groups/tabs/steps |
| Print/PDF | N/A | Built-in |

## From React JSON Schema Form (RJSF)

### RJSF → DocumentRenderer

**Before (RJSF):**
```tsx
import Form from "@rjsf/core";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", title: "Name" },
    age: { type: "number", title: "Age" },
  },
  required: ["name"],
};

<Form schema={schema} onSubmit={handleSubmit} />
```

**After (DocumentRenderer):**
```tsx
import { DocumentRenderer } from "@byteforce/workbook";

// Convert JSON Schema to Workbook schema
const workbook = {
  schemaVersion: "4.1.1",
  views: [{
    type: "form",
    id: "main",
    fields: [
      { name: "name", type: "string", label: "Name", required: true },
      { name: "age", type: "number", label: "Age" },
    ],
    layout: [
      { type: "field", name: "name" },
      { type: "field", name: "age" },
    ],
  }],
};

<DocumentRenderer workbook={workbook} onSubmit={handleSubmit} />
```

Or convert your JSON Schema to a workbook schema with a small mapping function of your own (no official JSON Schema adapter is shipped yet):

```ts
function translateJsonSchema(jsonSchema: JsonSchemaLike): WorkbookDefinition {
  // Map properties / required / types to workbook field definitions.
  return buildWorkbookFrom(jsonSchema);
}
```

## From AG Grid / Handsontable

### AG Grid → SheetRenderer

**Before (AG Grid):**
```tsx
import { AgGridReact } from "ag-grid-react";

const columns = [
  { field: "name", headerName: "Name" },
  { field: "amount", headerName: "Amount" },
];

<AgGridReact rowData={rowData} columnDefs={columns} />
```

**After (WorkbookSheetView):**
```tsx
import { WorkbookSheetView } from "@byteforce/workbook";

const sheetView = {
  type: "sheet",
  id: "data-table",
  columns: [
    { name: "name", label: "Name", width: 150 },
    { name: "amount", label: "Amount", width: 100, format: "#,##0.00" },
  ],
  rowBind: { path: "items" },
};

// With DataProvider
<DataProvider initialData={{ items: rowData }}>
  <WorkbookRuntimeProvider registry={myRegistry}>
    <WorkbookSheetView view={sheetView} />
  </WorkbookRuntimeProvider>
</DataProvider>
```

## From jsPDF / pdfmake

### jsPDF → exportWorkbookPdf

**Before (jsPDF):**
```ts
import jsPDF from "jspdf";

const doc = new jsPDF();
doc.text("Hello World", 10, 10);
doc.save("document.pdf");
```

**After (exportWorkbookPdf):**
```ts
import { exportWorkbookPdf } from "@byteforce/workbook";

// Render the page view first, then export
const pdfBytes = await exportWorkbookPdf(pageViewElement, {
  pageSettings: { format: "A4" },
});

// Download
const blob = new Blob([pdfBytes], { type: "application/pdf" });
saveAs(blob, "document.pdf");
```

**Key Advantage**: The workbook PDF export respects your page layout, headers, footers, watermarks, and automatic pagination — no manual coordinate positioning needed.

## Decision Matrix

| You Need | Use | Instead Of |
|----------|-----|------------|
| Simple forms | `SimpleForm` from `@byteforce/workbook/quick` | Formik, RHF |
| Schema-driven forms | `DocumentRenderer` | RJSF, Form.io |
| Documents + PDF | `WorkbookPageView` + `exportWorkbookPdf` | jsPDF, pdfmake |
| Spreadsheets | `WorkbookSheetView` | AG Grid, Handsontable |
| All three in one schema | `DocumentRenderer` | (Unique capability) |
