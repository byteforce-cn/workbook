/**
 * @byteforce/workbook/editor — optional document editor entry.
 *
 * Tiptap/ProseMirror are optional peer dependencies and must never leak into
 * the main, core, react, quick, or react-native entries. See ADR-0001 for the
 * source-of-truth boundary: ProseMirror JSON is an editing projection only.
 */

export type { EditorDiagnostic, EditorDiagnosticCode } from "./codec/diagnostics";
export { EditorSerializationError } from "./codec/errors";
export type { FromProseMirrorOptions, FromProseMirrorResult } from "./codec/fromProseMirror";
export { fromProseMirror } from "./codec/fromProseMirror";
export type { ToProseMirrorOptions, ToProseMirrorResult } from "./codec/toProseMirror";
export { toProseMirror } from "./codec/toProseMirror";
export type { DocumentEditorHandle, DocumentEditorProps } from "./DocumentEditor";
export { DocumentEditor } from "./DocumentEditor";
export { clearDirectFormatting, DIRECT_FORMAT_KEYS, mergeFormatAttrs, styleOptions } from "./format/textFormat";
export { formatMeasurement, moveFloatingBlock, parseMeasurement, resizeFloatingBlock } from "./layout/floating";
export { isOverlayBlock, mergeEditorContent } from "./layout/mergeContent";
export {
  addColumn,
  addRowAfter,
  deleteColumn,
  deleteRow,
  locateTable,
  mergeWithNextCell,
  splitCurrentCell,
} from "./nodes/table/commands";
export type { TableGridIssue, TableGridResult, TableWidth } from "./nodes/table/grid";
export {
  isPercentWidth,
  normalizeColumnWidths,
  readTableRows,
  readTableWidths,
  validateTableGrid,
} from "./nodes/table/grid";
export { createEditorExtensions } from "./schema/editorExtensions";
export { editorExtensions, editorSchema } from "./schema/extensions";
