import { useMemo } from "react";
import type { PageViewDefinition, WorkbookData } from "../../core/types";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookPluginRegistry } from "../../react/registry";
import type { WorkbookDefinition } from "../../schema/generated-types";
import { useEditorText } from "../i18n";

export interface PreviewPaneProps {
  workbook: WorkbookDefinition;
  view: PageViewDefinition;
  viewId: string | undefined;
  data: WorkbookData;
  locale?: string;
  fallbackLocale?: string;
  registry?: WorkbookPluginRegistry;
  zoom: number;
  hidden?: boolean;
}

/**
 * Print preview bridge.
 *
 * Deliberately renders through `DocumentRenderer` (→ `layoutPageView` → SVG /
 * PDF path) so the editor never grows a second pagination or measurement
 * implementation.
 */
export function PreviewPane({
  workbook,
  view,
  viewId,
  data,
  locale,
  fallbackLocale,
  registry,
  zoom,
  hidden,
}: PreviewPaneProps) {
  const notice = useEditorText("EDITOR_PREVIEW_NOTICE", "编辑态与打印版式可能不同，预览使用 workbook 渲染器。");

  const previewWorkbook = useMemo<WorkbookDefinition>(() => {
    const views = workbook.views.map((candidate) =>
      candidate === view || (viewId != null && candidate.id === viewId) ? view : candidate,
    );
    if (!views.includes(view)) {
      views.push(view);
    }
    return { ...workbook, views: views as WorkbookDefinition["views"] };
  }, [view, viewId, workbook]);

  return (
    <section className="bf-editor-preview" aria-label={notice} hidden={hidden} data-bf-editor-preview="true">
      <p className="bf-editor-preview-notice">{notice}</p>
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <DocumentRenderer
          workbook={previewWorkbook}
          registry={registry}
          locale={locale}
          fallbackLocale={fallbackLocale}
          activeViewId={viewId}
          data={data}
        />
      </div>
    </section>
  );
}
