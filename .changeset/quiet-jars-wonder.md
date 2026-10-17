---
"@byteforce/workbook": patch
---

Fix three places where the published behaviour contradicted the documentation.

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
