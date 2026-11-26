# Document editor

`@byteforce/workbook/editor` edits the flowing content of a `PageView` while
keeping `WorkbookDefinition` as the only persisted artifact. Header, footer,
watermark, and floating blocks are edited in separate panels and merged back at
their original positions.

## Install

Tiptap/ProseMirror are **optional peer dependencies**. Install the editor peers
only in applications that use the editor; the renderer-only entries never load
them.

```bash
npm install @tiptap/core@3.35.0 @tiptap/pm@3.35.0 @tiptap/react@3.35.0 @tiptap/extension-text@3.35.0
```

Versions are pinned exactly: Tiptap 3 minor releases change extension APIs.
React 18 and 19 are supported.

## Minimal example

```tsx
import { DocumentEditor } from "@byteforce/workbook/editor";
import "@byteforce/workbook/styles.css";

const workbook = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  data: { customer: { name: "Alice" } },
  views: [
    {
      type: "page",
      id: "contract",
      pageSettings: { width: 595, height: 842, marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72 },
      content: [
        { type: "paragraph", style: "Body", runs: [{ type: "text", text: "合同正文" }] },
      ],
    },
  ],
} as const;

export function ContractPage() {
  return (
    <DocumentEditor
      workbook={workbook}
      onSave={(next) => persist(next)}
      previewData={{ customer: { name: "Alice" } }}
    />
  );
}
```

`onSave` receives a new `WorkbookDefinition` whose page view was replaced. The
editor never mutates the workbook object you passed in. Use a ref for imperative
access:

```tsx
const editor = useRef<DocumentEditorHandle>(null);
<DocumentEditor ref={editor} workbook={workbook} />
editor.current?.save();
editor.current?.isDirty();
```

## Architecture

- `views[type="page"]` is the single source of truth.
- ProseMirror JSON exists only in the editing session; it is never stored,
  signed, or used as a cross-runtime format.
- `toProseMirror` projects the flow; `fromProseMirror` writes it back and runs
  AJV validation. Unrepresentable edits raise `EditorSerializationError` with
  structured diagnostics instead of silently degrading.
- Data bindings (`{{path}}`) and conditional blocks are template state.
  Preview data never writes back to `data` or `visible`.

## Fidelity promise

**Editing layout is not print output.** The editor edits HTML; preview and PDF
are produced by the workbook renderer (`layoutPageView` + SVG + the PDF writer),
which use estimated heights and font metrics. The print preview uses that same
code path; it never grows a second measurement implementation.

### Known differences

| Area | Editing view | Preview / print | Planned |
|---|---|---|---|
| Line breaking | Browser text layout | Estimated glyph widths in `pageLayout.ts` | Not aligned; preview is authoritative |
| Table row height | Content-driven | `DEFAULT_TABLE_ROW_HEIGHT` / authored height | Documented difference |
| Table borders & padding | Derived from `tableStyles` / `border` via `tableBorders.ts` | Same resolver | Kept in sync (e2e computed-style parity) |
| Table / cell backgrounds, fonts | Theme defaults; `cellStyles` not expanded | `tableStyles` / `cellStyles` resolved | Planned |
| List indentation | CSS defaults | `listStyles` resolution | Theme both sides |
| Page breaks | Not drawn in the flow | Real pagination | Preview only |
| Fonts | Browser fallback | `pageSettings` defaults + PDF font embedding | Host provides fonts |

## Out-of-flow blocks

Header/footer/watermark/floating are edited by panels. They are never placed in
the main ProseMirror document. Floating blocks keep their authored unit (pt or
%) when dragged; the drag canvas consumes `layoutPageView`'s rects.

## Integrity and persistence

Use the core persistence helpers:

```ts
import { contentHash, signDocument, verifyDocument, migrateWorkbook } from "@byteforce/workbook/core";
```

`contentHash` covers canonical `views`/`styles`/`printConfig`/`assets` and
excludes `data` by default. See [Integrity](./integrity.md).

## Unsupported in v1

- Visual editing of conditional style rules (shown read-only).
- Editing spreadsheet blocks (rendered read-only).
- A property panel for arbitrary `custom` block props (use the host app).
- Anchoring floating blocks to a specific page (they are document-level).

## Accessibility

The toolbar is keyboard reachable, buttons expose `aria-pressed`, and the bind
popover is a labelled dialog. Storybook runs `@storybook/addon-a11y` in error
mode for every editor story.
