# ADR-0001: Document editor architecture and source-of-truth boundary

- Status: Accepted
- Date: 2026-11-26
- Deciders: workbook maintainers
- Implements: #50 (spike and decision record for #51–#61)

## Context

`PageView` is a read-only rendering model. Editing contracts requires a rich-text
engine, but the printable artifact must stay the workbook document, not an editor
serialization. The candidate engines were Tiptap/ProseMirror, Slate, Lexical,
contentEditable with a custom model, and a block editor without a text engine.

The editor must cover the whole `pageContentBlock` union (11 types), named styles,
data bindings, conditions, tables with percent widths, and the out-of-flow layer,
without compromising the existing bundle gates or the PDF writer.

## D1 — Source of truth

| Item | Decision |
|---|---|
| Persisted object | `WorkbookDefinition` (`kind` / `schemaVersion` / `views[]` / `styles` / `data`) |
| Editing projection | ProseMirror `Node` JSON, session only |
| Forbidden | Persisting PM JSON, hashing it, or using it as a cross-runtime format |

`fromProseMirror` produces only `PageView.content`; document-level fields
(`id`, `label`, `visible`, `pageSettings`, `styles`, `data`, hooks, print config)
come from the caller's base view untouched.

## D2 — Fidelity promise

`pageLayout.ts` paginates with estimated heights; preview/PDF use SVG and the
custom PDF writer. Therefore **editor ≈ preview ≠ pixel-identical print**.

Commitment: the editor provides flowing content editing; print preview and PDF
are rendered by workbook's existing renderer. Known differences live in
`docs-site/guides/document-editor.md` and are not duplicated elsewhere.

## D3 — Package shape: new entry (option A)

`@byteforce/workbook/editor`, built by a new tsup entry. Reasons:

- Codec/types are shared with the main package; a separate package would
  duplicate the schema pipeline and version skew.
- The editor is heavy (Tiptap/ProseMirror), so it must be isolated: optional
  peer dependencies, a dedicated size gate, and leakage assertions that keep
  `@tiptap/` and `prosemirror-` out of every existing entry.
- One CI matrix (React 18/19) covers both surfaces.

Alternatives rejected: separate package (B) costs an extra release line for no
technical benefit; bundling into the main entry breaks the 25 KB gzip budget;
web component/iframe loses host context and theme integration.

## D4 — Versions and license

- Pinned exact: `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`,
  `@tiptap/extension-text` at `3.35.0` (no `^` across minors).
- No Tiptap Pro packages. Pagination stays in `pageLayout.ts`.
- Peer range: React 17/18/19 is declared upstream; our CI matrix covers React
  18 and 19 on Node 20/22.
- Dependencies are optional peers plus devDependencies; the main package does
  not install them for hosts that never import the editor.

## D5 — v1 scope

Main flow plus out-of-flow panels (header, footer, watermark, floating). The
out-of-flow blocks never enter the ProseMirror document; panel state is merged
back into the original content positions.

## Spike results

Performed against the schema in `src/schema/bf-schema-v4.1.1.json` and recorded
as executable tests rather than temporary code:

1. **Percent table widths** — custom `wbTable` / `wbTableColgroup` nodes store
   the authored `MeasurementOrPercent[]`; a plain NodeView renders `<col
   style="width:30%">`. `prosemirror-tables` was rejected because `colwidth` is
   px-only. Covered by `tests/editor/roundtrip.test.ts` (`table-8x6-spans`,
   `table-1x1-percent`).
2. **Style ids on marks** — one `wbText` mark carries `style` plus direct
   formatting. Tests prove a run keeps `style: "Emphasis"` after a font-size
   override.
3. **Bind as inline atom** — `wbBind` is an inline atom with path/format/
   placeholder and the run's format attrs. Round-trip tests cover bindings.
4. **Out-of-flow** — codec emits `out-of-flow` diagnostics and skips those
   blocks; `mergeEditorContent` restores them at their original slots.

## Consequences

- Two schemas to keep aligned: the workbook schema remains authoritative; the
  editor schema is a projection and is versioned by tests, not by users.
- Conditional styles and spreadsheet/custom block property editing stay
  read-only/limited in v1.
- Any future editor change must keep the leakage and bundle gates green.
