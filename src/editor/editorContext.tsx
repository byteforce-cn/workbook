import { createContext, useContext } from "react";
import type { WorkbookData, WorkbookStyleCatalog } from "../core/types";

export interface EditorContextValue {
  /** Data used for bind previews and conditional simulation. */
  previewData: WorkbookData;
  /** When false the editor shows `{{path}}` chips instead of resolved values. */
  previewMode: boolean;
  /** When true conditional blocks are evaluated against `previewData`. */
  simulateConditions: boolean;
  styles: WorkbookStyleCatalog | undefined;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorContextProvider = EditorContext.Provider;

export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (context == null) {
    throw new Error("useEditorContext must be used inside <DocumentEditor>.");
  }
  return context;
}
