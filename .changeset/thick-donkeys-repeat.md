---
"@byteforce/workbook": minor
---

Make the documented extension points real: `--bf-*` theme tokens, typed
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
