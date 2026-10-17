import { Fragment, useCallback, useEffect, useRef } from "react";
import { evaluateBooleanLike } from "./core/condition/evaluate";
import type { WorkbookData, WorkbookViewDefinition } from "./core/types";
import { DataProvider, useWorkbookData } from "./react/DataProvider";
import { runWorkbookHooks } from "./react/hooks/useWorkbookHooks";
import { useWorkbookRuntime, WorkbookRuntimeProvider } from "./react/RuntimeProvider";
import type { WorkbookPluginRegistry } from "./react/registry";
import { FormView } from "./renderers/form/FormView";
import { PageView } from "./renderers/page/PageView";
import { SheetView } from "./renderers/sheet/SheetView";
import { validateWorkbookDocument, type WorkbookValidationResult } from "./schema";
import type { WorkbookDefinition } from "./schema/generated-types";

function VisibleViews({
  workbook,
  activeViewId,
  onSubmit,
}: {
  workbook: WorkbookDefinition;
  activeViewId?: string;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}) {
  const { data } = useWorkbookData();
  const { registry } = useWorkbookRuntime();

  const visibleViews = workbook.views.filter((view) => {
    if (activeViewId != null && view.id !== activeViewId) {
      return false;
    }

    return evaluateBooleanLike(view.visible, data, registry, true);
  });

  return (
    <div className="bf-workbook-view-stack">
      {visibleViews.map((view, index) => (
        <Fragment key={view.id ?? `${view.type}-${index}`}>
          {view.type === "form" ? <FormView view={view} onSubmit={onSubmit} /> : null}
          {view.type === "page" ? <PageView view={view} /> : null}
          {view.type === "sheet" ? <SheetView view={view} /> : null}
        </Fragment>
      ))}
    </div>
  );
}

function WorkbookEffects({
  workbook,
  onDataChange,
}: {
  workbook: WorkbookDefinition;
  onDataChange?: (data: WorkbookData) => void;
}) {
  const { data } = useWorkbookData();
  const { registry } = useWorkbookRuntime();
  const hasObservedChangeRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: onMount must run only on first mount, using the initial data snapshot — `data` intentionally excluded.
  useEffect(() => {
    void runWorkbookHooks({
      hooks: workbook.hooks,
      trigger: "onMount",
      data,
      registry,
    });
  }, [registry, workbook.hooks]);

  useEffect(() => {
    onDataChange?.(data);

    if (!hasObservedChangeRef.current) {
      hasObservedChangeRef.current = true;
      return;
    }

    void runWorkbookHooks({
      hooks: workbook.hooks,
      trigger: "onChange",
      data,
      registry,
    });
  }, [data, onDataChange, registry, workbook.hooks]);

  return null;
}

function WorkbookSurface({
  workbook,
  activeViewId,
  onDataChange,
  onSubmit,
}: {
  workbook: WorkbookDefinition;
  activeViewId?: string;
  onDataChange?: (data: WorkbookData) => void;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
}) {
  const { registry } = useWorkbookRuntime();

  const handleSubmit = useCallback(
    async (data: WorkbookData) => {
      await runWorkbookHooks({ hooks: workbook.hooks, trigger: "onBeforeSave", data, registry });
      await runWorkbookHooks({ hooks: workbook.hooks, trigger: "onSubmit", data, registry });
      await onSubmit?.(data);
      await runWorkbookHooks({ hooks: workbook.hooks, trigger: "onAfterSave", data, registry });
    },
    [onSubmit, registry, workbook.hooks],
  );

  return (
    <>
      <WorkbookEffects workbook={workbook} onDataChange={onDataChange} />
      <VisibleViews workbook={workbook} activeViewId={activeViewId} onSubmit={handleSubmit} />
    </>
  );
}

export interface DocumentRendererProps {
  workbook: WorkbookDefinition;
  registry?: WorkbookPluginRegistry;
  locale?: string;
  fallbackLocale?: string;
  activeViewId?: string;
  /** Data for an uncontrolled document (snapshot taken on mount). */
  initialData?: WorkbookData;
  /**
   * Controlled data tree. When set, the document renders exactly this value and
   * every edit is reported through `onDataChange` — use it to fill a document
   * from an async request without remounting. `initialData` is ignored while
   * `data` is set. See `docs-site/api/document-renderer.md`.
   */
  data?: WorkbookData;
  /**
   * Uncontrolled: called with the data tree whenever it changes (including the
   * initial render). Controlled (`data` set): called with the next tree for
   * every edit, and not on mount.
   */
  onDataChange?: (data: WorkbookData) => void;
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
  /**
   * Validator used to check the document before rendering.
   *
   * Defaults to the bundled AJV validator, which compiles the schema at runtime
   * and therefore needs `'unsafe-eval'` in `script-src`. Hosts serving a strict
   * CSP can precompile a validator and pass it here (see
   * `docs-site/guides/content-security-policy.md`).
   */
  validate?: (document: unknown) => WorkbookValidationResult;
}

export function DocumentRenderer({
  workbook,
  registry,
  locale,
  fallbackLocale,
  activeViewId,
  initialData,
  data,
  onDataChange,
  onSubmit,
  validate,
}: DocumentRendererProps) {
  const validation = (validate ?? validateWorkbookDocument)(workbook);
  if (!validation.valid) {
    throw new Error(`Invalid workbook document: ${validation.errors.map((error) => error.message).join(", ")}`);
  }

  // Controlled mode owns the notification through DataProvider (edits), so the
  // uncontrolled observer must not report the same change twice.
  const isControlled = data !== undefined;

  return (
    <WorkbookRuntimeProvider workbook={workbook} registry={registry} locale={locale} fallbackLocale={fallbackLocale}>
      <DataProvider
        initialData={initialData ?? (workbook.data as WorkbookData)}
        data={data}
        onDataChange={isControlled ? onDataChange : undefined}
      >
        <WorkbookSurface
          workbook={workbook}
          activeViewId={activeViewId}
          onDataChange={isControlled ? undefined : onDataChange}
          onSubmit={onSubmit}
        />
      </DataProvider>
    </WorkbookRuntimeProvider>
  );
}

export function renderWorkbookView(view: WorkbookViewDefinition) {
  switch (view.type) {
    case "form":
      return <FormView view={view} />;
    case "page":
      return <PageView view={view} />;
    case "sheet":
      return <SheetView view={view} />;
    default:
      return null;
  }
}
