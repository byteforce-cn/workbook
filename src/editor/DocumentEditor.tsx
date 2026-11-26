/**
 * Document editor — v1 architecture (ADR-0001).
 *
 * WorkbookDefinition (`views[type=page]`) is the single source of truth.
 * ProseMirror JSON exists only for the editing session and never enters
 * storage, signatures, or the printed output. Out-of-flow blocks live in
 * panels; the main flow is the only ProseMirror document.
 */

import { EditorContent, useEditor } from "@tiptap/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PageBlockDefinition, PageViewDefinition, WorkbookData, WorkbookStyleCatalog } from "../core/types";
import { DataProvider, useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime, WorkbookRuntimeProvider } from "../react/RuntimeProvider";
import type { WorkbookPluginRegistry } from "../react/registry";
import type { WorkbookDefinition } from "../schema/generated-types";
import { EditorSerializationError } from "./codec/errors";
import { fromProseMirror } from "./codec/fromProseMirror";
import { toProseMirror } from "./codec/toProseMirror";
import { Toolbar } from "./components/Toolbar";
import { EditorContextProvider } from "./editorContext";
import { useEditorText } from "./i18n";
import { isOverlayBlock, mergeEditorContent } from "./layout/mergeContent";
import { FloatingPanel } from "./panels/FloatingPanel";
import { HeaderFooterPanel } from "./panels/HeaderFooterPanel";
import { WatermarkPanel } from "./panels/WatermarkPanel";
import { PreviewPane } from "./preview/PreviewPane";
import { captureScroll, restoreScroll, type ScrollSnapshot } from "./preview/scrollState";
import { createEditorExtensions } from "./schema/editorExtensions";

type HeaderBlock = Extract<PageBlockDefinition, { type: "header" }>;
type FooterBlock = Extract<PageBlockDefinition, { type: "footer" }>;
type WatermarkBlock = Extract<PageBlockDefinition, { type: "watermark" }>;
type FloatingBlock = Extract<PageBlockDefinition, { type: "floating" }>;

export interface DocumentEditorProps {
  workbook: WorkbookDefinition;
  /** Page view id; defaults to the first page view. */
  viewId?: string;
  /** Controlled data tree (optional). */
  data?: WorkbookData;
  initialData?: WorkbookData;
  /** Read-only preview data (does not dirty the document). */
  previewData?: WorkbookData;
  onDataChange?: (data: WorkbookData) => void;
  /** Called by `save()` with the workbook whose page view was replaced. */
  onSave?: (workbook: WorkbookDefinition) => void;
  onChange?: (view: PageViewDefinition) => void;
  registry?: WorkbookPluginRegistry;
  locale?: string;
  fallbackLocale?: string;
  conditionContext?: Record<string, unknown>;
  readOnly?: boolean;
  className?: string;
  /** Initial zoom for the editor/preview canvas (1 = 100%). */
  initialZoom?: number;
}

export interface DocumentEditorHandle {
  /** Serialize, validate, merge panels, and report the next workbook. */
  save(): WorkbookDefinition | undefined;
  /** The last valid page view (including unsaved edits). */
  getView(): PageViewDefinition;
  isDirty(): boolean;
}

function findPageView(workbook: WorkbookDefinition, viewId: string | undefined): PageViewDefinition {
  const view = workbook.views.find(
    (candidate): candidate is PageViewDefinition =>
      candidate.type === "page" && (viewId == null || candidate.id === viewId),
  );
  if (view == null) {
    throw new Error(
      viewId == null
        ? "[workbook] DocumentEditor requires at least one page view."
        : `[workbook] DocumentEditor cannot find page view "${viewId}".`,
    );
  }
  return view;
}

interface InnerProps
  extends Omit<DocumentEditorProps, "workbook" | "viewId" | "registry" | "locale" | "fallbackLocale"> {
  workbook: WorkbookDefinition;
  baseView: PageViewDefinition;
  handleRef: React.ForwardedRef<DocumentEditorHandle>;
}

function DocumentEditorInner({
  workbook,
  baseView,
  previewData,
  onSave,
  onChange,
  readOnly = false,
  className,
  initialZoom = 1,
  handleRef,
}: InnerProps) {
  const { registry, locale, fallbackLocale, conditionContext } = useWorkbookRuntime();
  const { data } = useWorkbookData();
  const styles: WorkbookStyleCatalog | undefined = workbook.styles;
  const effectivePreviewData = previewData ?? data;

  const initialFlow = useMemo(() => baseView.content.filter((block) => !isOverlayBlock(block)), [baseView]);
  const [headers, setHeaders] = useState<HeaderBlock[]>(() =>
    baseView.content.filter((block): block is HeaderBlock => block.type === "header"),
  );
  const [footers, setFooters] = useState<FooterBlock[]>(() =>
    baseView.content.filter((block): block is FooterBlock => block.type === "footer"),
  );
  const [watermarks, setWatermarks] = useState<WatermarkBlock[]>(() =>
    baseView.content.filter((block): block is WatermarkBlock => block.type === "watermark"),
  );
  const [floating, setFloating] = useState<FloatingBlock[]>(() =>
    baseView.content.filter((block): block is FloatingBlock => block.type === "floating"),
  );
  const [simulateConditions, setSimulateConditions] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewMounted, setPreviewMounted] = useState(false);
  const [zoom, setZoom] = useState(initialZoom);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveFlow, setLiveFlow] = useState<PageBlockDefinition[]>(initialFlow);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const setPreviewElement = useCallback((element: HTMLElement | null) => {
    previewRef.current = element;
  }, []);
  const scrollSnapshotRef = useRef<ScrollSnapshot | null>(null);
  const hasSwitchedRef = useRef(false);

  const baseViewRef = useRef(baseView);
  baseViewRef.current = baseView;
  const overlayBlocks = useMemo<PageBlockDefinition[]>(
    () => [...headers, ...footers, ...watermarks, ...floating],
    [headers, footers, watermarks, floating],
  );
  const overlayRef = useRef(overlayBlocks);
  overlayRef.current = overlayBlocks;
  const workbookRef = useRef(workbook);
  workbookRef.current = workbook;

  const initialDoc = useMemo(
    () =>
      toProseMirror(baseView, {
        styles,
        registeredComponents: [...registry.pageBlock.keys()],
      }),
    [baseView, registry, styles],
  );

  const contextRef = useRef({
    data: effectivePreviewData,
    simulate: simulateConditions,
    registry,
    styles,
    conditionContext,
  });
  contextRef.current = {
    data: effectivePreviewData,
    simulate: simulateConditions,
    registry,
    styles,
    conditionContext,
  };

  const extensions = useMemo(() => createEditorExtensions(() => contextRef.current), []);

  const liveFlowRef = useRef(liveFlow);
  liveFlowRef.current = liveFlow;

  const editor = useEditor({
    extensions,
    content: initialDoc.doc?.toJSON(),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "bf-editor-content",
        "aria-label": "Document editor",
      },
    },
    onUpdate({ editor: current }) {
      setDirty(true);
      try {
        const result = fromProseMirror(current.state.doc, baseViewRef.current, {
          validate: () => ({ valid: true, errors: [] }),
        });
        setLiveFlow(result.view.content);
      } catch (error) {
        if (error instanceof EditorSerializationError) {
          setSaveError(error.message);
        }
      }
    },
  });

  // Context changes must refresh conditional decorations without touching history.
  // biome-ignore lint/correctness/useExhaustiveDependencies: context is read through contextRef
  useEffect(() => {
    if (editor == null) {
      return;
    }
    const transaction = editor.state.tr.setMeta("addToHistory", false);
    editor.view.dispatch(transaction);
  }, [editor, effectivePreviewData, simulateConditions]);

  const previewView = useMemo<PageViewDefinition>(
    () => ({
      ...baseView,
      content: mergeEditorContent(baseView.content, liveFlow, overlayBlocks),
    }),
    [baseView, liveFlow, overlayBlocks],
  );

  const save = useCallback((): WorkbookDefinition | undefined => {
    if (editor == null) {
      return undefined;
    }

    try {
      const result = fromProseMirror(editor.state.doc, baseViewRef.current);
      const nextView: PageViewDefinition = {
        ...baseViewRef.current,
        content: mergeEditorContent(baseViewRef.current.content, result.view.content, overlayRef.current),
      };
      const currentWorkbook = workbookRef.current;
      const views = currentWorkbook.views.map((candidate) => {
        if (candidate === baseViewRef.current) {
          return nextView;
        }
        return baseViewRef.current.id != null && candidate.id === baseViewRef.current.id ? nextView : candidate;
      }) as WorkbookDefinition["views"];
      const nextWorkbook: WorkbookDefinition = { ...currentWorkbook, views };

      setLiveFlow(result.view.content);
      setDirty(false);
      setSaveError(null);
      onChange?.(nextView);
      onSave?.(nextWorkbook);
      return nextWorkbook;
    } catch (error) {
      setSaveError(
        error instanceof EditorSerializationError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
      );
      return undefined;
    }
  }, [editor, onChange, onSave]);

  useImperativeHandle(
    handleRef,
    () => ({
      save,
      getView: () => previewView,
      isDirty: () => dirty,
    }),
    [dirty, previewView, save],
  );

  const saveLabel = useEditorText("EDITOR_SAVE", "保存");
  const editLabel = useEditorText("EDITOR_EDIT", "编辑");
  const previewLabel = useEditorText("EDITOR_PREVIEW", "打印预览");
  const zoomLabel = useEditorText("EDITOR_ZOOM", "缩放");
  const saveErrorPrefix = useEditorText("EDITOR_SAVE_ERROR", "保存失败");
  const dirtyLabel = useEditorText("EDITOR_DIRTY", "有未保存的修改");
  const savedLabel = useEditorText("EDITOR_SAVED", "已保存");

  // Switching panes must not reset the reader's scroll position or lose the
  // caret: capture first, restore after React has laid the other pane out.
  const switchMode = (nextMode: "edit" | "preview") => {
    if (nextMode === mode) {
      return;
    }

    hasSwitchedRef.current = true;
    scrollSnapshotRef.current = captureScroll(editorHostRef.current);
    setMode(nextMode);
    if (nextMode === "preview") {
      setPreviewMounted(true);
    }
  };

  useLayoutEffect(() => {
    if (!hasSwitchedRef.current) {
      return;
    }

    if (mode === "preview") {
      previewRef.current?.focus({ preventScroll: true });
    } else {
      editor?.commands.focus(undefined, { scrollIntoView: false });
    }

    const snapshot = scrollSnapshotRef.current;
    if (snapshot != null) {
      scrollSnapshotRef.current = null;
      restoreScroll(snapshot);
    }
  }, [editor, mode]);

  if (editor == null || initialDoc.doc == null) {
    return (
      <div className={`bf-editor bf-editor--empty ${className ?? ""}`.trim()} role="alert">
        {initialDoc.diagnostics[0]?.message ?? "The page has no editable content."}
      </div>
    );
  }

  return (
    <EditorContextProvider
      value={{
        previewData: effectivePreviewData,
        previewMode: false,
        simulateConditions,
        styles,
      }}
    >
      <section className={`bf-editor ${className ?? ""}`.trim()} data-bf-document-editor="true">
        <div className="bf-editor-header">
          <fieldset className="bf-editor-mode-switch">
            <legend className="bf-editor-sr-only">{previewLabel}</legend>
            <button type="button" aria-pressed={mode === "edit"} onClick={() => switchMode("edit")}>
              {editLabel}
            </button>
            <button type="button" aria-pressed={mode === "preview"} onClick={() => switchMode("preview")}>
              {previewLabel}
            </button>
          </fieldset>
          <label className="bf-editor-toolbar-field">
            {zoomLabel}
            <input
              type="number"
              min={0.25}
              max={2}
              step={0.25}
              value={zoom}
              onChange={(event) => setZoom(Math.min(2, Math.max(0.25, Number(event.target.value) || 1)))}
            />
          </label>
          <span className="bf-editor-status" aria-live="polite">
            {dirty ? dirtyLabel : savedLabel}
          </span>
          <button type="button" onClick={() => save()} disabled={readOnly}>
            {saveLabel}
          </button>
        </div>

        {saveError != null ? (
          <p className="bf-editor-error" role="alert">
            {saveErrorPrefix}: {saveError}
          </p>
        ) : null}

        <div className="bf-editor-body">
          <div className="bf-editor-main" ref={editorHostRef} hidden={mode === "preview"}>
            {!readOnly ? (
              <Toolbar
                editor={editor}
                styles={styles}
                simulateConditions={simulateConditions}
                onSimulateConditionsChange={setSimulateConditions}
              />
            ) : null}
            <div className="bf-editor-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              <EditorContent editor={editor} />
            </div>
          </div>

          {previewMounted ? (
            <PreviewPane
              workbook={workbook}
              view={previewView}
              viewId={baseView.id}
              data={effectivePreviewData}
              locale={locale}
              fallbackLocale={fallbackLocale}
              registry={registry}
              zoom={zoom}
              hidden={mode !== "preview"}
              sectionRef={setPreviewElement}
            />
          ) : null}

          {!readOnly && mode === "edit" ? (
            <aside className="bf-editor-panels" aria-label="Out-of-flow blocks">
              <HeaderFooterPanel
                blocks={[...headers, ...footers]}
                pageSettings={baseView.pageSettings}
                styles={styles}
                registry={registry}
                onChange={(next) => {
                  setHeaders(next.filter((block): block is HeaderBlock => block.type === "header"));
                  setFooters(next.filter((block): block is FooterBlock => block.type === "footer"));
                  setDirty(true);
                }}
              />
              <WatermarkPanel
                blocks={watermarks}
                onChange={(next) => {
                  setWatermarks(next);
                  setDirty(true);
                }}
              />
              <FloatingPanel
                blocks={floating}
                pageSettings={baseView.pageSettings}
                onChange={(next) => {
                  setFloating(next);
                  setDirty(true);
                }}
              />
            </aside>
          ) : null}
        </div>
      </section>
    </EditorContextProvider>
  );
}

export const DocumentEditor = forwardRef<DocumentEditorHandle, DocumentEditorProps>(function DocumentEditor(
  { workbook, viewId, data, initialData, onDataChange, registry, locale, fallbackLocale, conditionContext, ...rest },
  ref,
) {
  const baseView = findPageView(workbook, viewId);

  return (
    <WorkbookRuntimeProvider
      workbook={workbook}
      registry={registry}
      locale={locale}
      fallbackLocale={fallbackLocale}
      conditionContext={conditionContext}
    >
      <DataProvider
        initialData={initialData ?? (workbook.data as WorkbookData)}
        data={data}
        onDataChange={onDataChange}
      >
        <DocumentEditorInner {...rest} workbook={workbook} baseView={baseView} handleRef={ref} />
      </DataProvider>
    </WorkbookRuntimeProvider>
  );
});
