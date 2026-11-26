import type { EditorDiagnostic } from "./diagnostics";

/** Thrown when the edited document cannot be written back without loss. */
export class EditorSerializationError extends Error {
  readonly diagnostics: EditorDiagnostic[];

  constructor(message: string, diagnostics: EditorDiagnostic[]) {
    super(message);
    this.name = "EditorSerializationError";
    this.diagnostics = diagnostics;
  }
}
