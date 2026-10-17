---
"@byteforce/workbook": minor
---

Add the extension points the ims product team asked for: controlled data,
read-only text, a host-owned action bar, and custom page blocks.

- **Controlled data** — `<DocumentRenderer data={…} onDataChange={…}>` (and the
  same props on `DataProvider`) renders exactly the value you pass and reports
  each edit back, so a document can be filled from an async request without
  remounting it. `initialData` stays the uncontrolled mount-time snapshot.
- **Read-only text** — `config.readOnlyDisplay: "text"` renders a read-only form
  as label + value (no `input` / `select` / `textarea`), with option labels
  resolved, booleans localised, arrays joined and empty values placeheld. The
  default `"disabled"` keeps 1.0.0 behaviour.
- **Host-owned action bar** — `config.hideActions: true` hides the built-in
  submit/reset row, and `DocumentRenderer` exposes `submit()` through `ref`
  (validation → `onValidate` → `onSubmit` → save hooks) for your own sticky bar.
- **Custom page blocks** — schema `{ "type": "custom", "component": "app:flowStepper" }`
  renders the component registered with the new
  `registry.registerPageBlock(id, Component)` slot, receiving
  `{ block, width, height, data }`. Declare `renderHints.height` so pagination
  reserves room; an unregistered component renders nothing. Screen only — print
  and PDF keep rendering the built-in blocks.
