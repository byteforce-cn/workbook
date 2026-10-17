# @byteforce/workbook

## 1.1.0

### Minor Changes

- 3e9815f: Add the extension points the ims product team asked for: controlled data,
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
- 70ba102: Make the documented extension points real: `--bf-*` theme tokens, typed
  `register*` registry helpers, and an injectable document validator.
  
  - The default theme now reads every colour, radius, size and shadow from the
    `--bf-*` custom properties documented in the Theming guide, so those tokens
    actually take effect (the stylesheet previously hardcoded 37 hex colours and
    ignored them all). The full reference table is in `docs-site/guides/theming.md`.
  - `<select>` chevrons are drawn with CSS gradients instead of a
    `data:image/svg+xml` background, so no `img-src data:` CSP relaxation is needed.
  - `createPluginRegistry()` now returns the documented `registerField` /
    `registerLayout` / `registerCondition` / `registerOptionSource` /
    `registerValidation` / `registerHook` helpers in its type
    (`WorkbookPluginRegistryWithHelpers`), matching the runtime and the plugin
    docs.
  - `<DocumentRenderer validate={…} />` accepts a precompiled validator, so hosts
    serving a strict `script-src 'self'` CSP can validate documents without
    `'unsafe-eval'`. See the new Content Security Policy guide.
  - Sheet formulas are parsed instead of compiled with `new Function`, so they
    keep working under a strict CSP; the library no longer generates code at
    runtime anywhere.

### Patch Changes

- 70ba102: Fix three places where the published behaviour contradicted the documentation.
  
  - `page` view: percentage table column widths (`"30%"`) were measured as `0`,
    so their cells were treated as ~1px wide and long text inflated row heights
    until a one-page document spilled over several. They now measure like the
    rendered `colgroup`, in px, percentage and mixed declarations.
  - Option sources: the schema reference now documents the real shape
    (`endpoint` + `dataPath`, not `url`, with `method`, `params.$field`,
    `dependsOn`, `valueKey`/`labelKey` and `pagination`). A source without
    `endpoint` logs a warning naming the ignored `url` key and fails fast instead
    of fetching the host page and rendering an empty list.
  - Docs: the option-source and table-column sections describe the behaviour the
    runtime and schema actually implement.

## 1.0.0

Initial public release: schema-driven runtime for forms, documents (pages) and
sheet views, with print/PDF export, responsive device rendering, a plugin
system, and first-class TypeScript types generated from the JSON schema.
