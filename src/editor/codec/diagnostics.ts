/** Structured diagnostics shared by both codec directions and the editor UI. */

export type EditorDiagnosticCode =
  | "unsupported-block"
  | "unsupported-run"
  | "out-of-flow"
  | "style-not-found"
  | "unknown-attr"
  | "invalid-table-width"
  | "unknown-mark"
  | "invalid-node";

export interface EditorDiagnostic {
  code: EditorDiagnosticCode;
  /** Document path, e.g. `views[0].content[3].rows[1].cells[0]`. */
  path: string;
  severity: "error" | "warning";
  message: string;
  /** Raw source fragment for debugging; never persisted. */
  raw?: unknown;
}

export function isBlockingDiagnostic(diagnostic: EditorDiagnostic): boolean {
  return diagnostic.severity === "error";
}
