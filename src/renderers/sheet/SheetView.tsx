import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getValueAtPath } from "../../core/data/pathUtils";
import type { SheetCellDefinition, SheetViewDefinition, WorkbookRowContext } from "../../core/types";
import { useDevice } from "../../device/DeviceContext";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import { FormView } from "../form/FormView";
import { drawSheet, measureSheetLayout } from "./drawSheet";
import { computeVisibleRange } from "./virtualization";

let cachedScrollbarWidth: number | undefined;

/**
 * 经典滚动条宽度（px）。
 *
 * body pane 启用了 `scrollbar-gutter: stable` 且纵向溢出时，浏览器会在内容区
 * 内预留该宽度，若不预留在视口宽度中，最后一列会被滚动条裁掉。
 * overlay 滚动条（macOS 默认）返回 0，SSR/jsdom 无法测量时回退 15。
 */
function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== undefined) {
    return cachedScrollbarWidth;
  }

  if (typeof document === "undefined") {
    cachedScrollbarWidth = 15;
    return cachedScrollbarWidth;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  cachedScrollbarWidth = width > 0 ? width : 15;
  return cachedScrollbarWidth;
}

function resolveCellValue(
  cell: SheetCellDefinition,
  data: Record<string, unknown>,
  rowContext?: WorkbookRowContext,
): string {
  if (cell.value != null) return String(cell.value);
  if (cell.formula != null) return `=${cell.formula}`;
  if (cell.bind != null) {
    const raw = getValueAtPath(data, cell.bind.path, rowContext);
    return raw != null ? String(raw) : "";
  }
  return "";
}

function buildAccessibleTable(
  view: SheetViewDefinition,
  rows: ReturnType<typeof materializeDynamicRows>,
): { caption: string; headers: string[]; body: string[][] } {
  const headers = view.columns.map((_, i) => `列${i + 1}`);
  const body = rows.map((entry) => {
    const rowContext = "rowContext" in entry ? entry.rowContext : undefined;
    const row = entry.row;
    return (row.cells ?? []).map((cell) => resolveCellValue(cell, {} as Record<string, unknown>, rowContext));
  });
  return { caption: view.label ?? view.name ?? "Sheet", headers, body };
}

function materializeDynamicRows(view: SheetViewDefinition, data: Record<string, unknown>) {
  if (view.rowBind == null) {
    return (view.rows ?? []).map((row) => ({ row }));
  }

  const source = getValueAtPath(data, view.rowBind.path);
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item, index) => {
    const rowContext: WorkbookRowContext = { index, path: view.rowBind?.path, item };
    const row =
      view.rowBind?.rowTemplate == null
        ? { cells: [] }
        : {
            height: view.rowBind.rowTemplate.height,
            hidden: view.rowBind.rowTemplate.hidden,
            style: view.rowBind.rowTemplate.style,
            cells: Object.entries(view.rowBind.rowTemplate.cellMapping ?? {}).map(([column, cell]) => ({
              column: Number(column),
              ...(cell as Omit<SheetCellDefinition, "column">),
            })),
          };

    return { row, rowContext };
  });
}

export interface SheetViewProps {
  view: SheetViewDefinition;
  embedded?: boolean;
}

type SheetPaneName = "full" | "corner" | "top" | "left" | "body";

export function SheetView({ view, embedded = false }: SheetViewProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cornerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { data } = useWorkbookData();
  const { assetLoader, styleResolver } = useWorkbookRuntime();
  const { device } = useDevice();
  const rows = useMemo(() => materializeDynamicRows(view, data), [data, view]);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0 });
  const [containerWidth, setContainerWidth] = useState<number | undefined>();
  const layoutInput = useMemo(
    () => ({
      columns: [...view.columns],
      rows,
      defaultColumnWidth: view.defaultColumnWidth,
      defaultRowHeight: view.defaultRowHeight,
      frozenRows: view.frozenRows,
      frozenCols: view.frozenCols,
    }),
    [rows, view.columns, view.defaultColumnWidth, view.defaultRowHeight, view.frozenCols, view.frozenRows],
  );
  const layout = useMemo(() => measureSheetLayout(layoutInput), [layoutInput]);
  const frozenRows = view.frozenRows ?? 0;
  const frozenCols = view.frozenCols ?? 0;
  const hasFrozenPanes = frozenRows > 0 || frozenCols > 0;
  const widthMode = view.widthMode ?? "fixed";
  const viewportHeight = embedded ? Math.min(layout.totalHeight, 180) : Math.min(layout.totalHeight, 420);
  const viewportMaxWidth = embedded ? 420 : (containerWidth ?? 960);
  const hasVerticalOverflow = layout.totalHeight > viewportHeight;
  // 纵向滚动条会占据 body pane 的部分宽度（scrollbar-gutter: stable），
  // 需要在视口宽度中预留该空间，否则最后一列会被滚动条裁掉。
  const scrollbarReserve = hasVerticalOverflow ? getScrollbarWidth() : 0;
  // 实际可用于内容的宽度 = 容器宽度 - 纵向滚动条预留
  const usableViewportWidth = Math.max(0, viewportMaxWidth - scrollbarReserve);
  // widthMode: "stretch" 时，容器比自然宽度宽则把多余宽度分配给各列铺满容器；
  // 否则保持固定列宽（宽容器右侧留白，sheet 居中显示）。
  const stretchToContainer = widthMode === "stretch" && !embedded && usableViewportWidth > layout.totalWidth;
  const fittedLayout = useMemo(
    () => (stretchToContainer ? measureSheetLayout({ ...layoutInput, fitWidth: usableViewportWidth }) : layout),
    [layout, layoutInput, stretchToContainer, usableViewportWidth],
  );
  const resolvedViewportWidth = Math.min(fittedLayout.totalWidth + scrollbarReserve, viewportMaxWidth);
  const bodyViewportWidth = Math.max(0, resolvedViewportWidth - fittedLayout.frozenWidth);
  const bodyViewportHeight = Math.max(0, viewportHeight - fittedLayout.frozenHeight);
  const hasHorizontalOverflow = fittedLayout.totalWidth > usableViewportWidth;
  const isVirtualized = !hasFrozenPanes && (hasHorizontalOverflow || hasVerticalOverflow);
  const virtualColumnRange = useMemo(
    () => computeVisibleRange(fittedLayout.columnWidths, scrollState.left, resolvedViewportWidth),
    [fittedLayout.columnWidths, scrollState.left, resolvedViewportWidth],
  );
  const virtualRowRange = useMemo(
    () => computeVisibleRange(fittedLayout.rowHeights, scrollState.top, viewportHeight),
    [fittedLayout.rowHeights, scrollState.top, viewportHeight],
  );

  // 首帧同步测量容器宽度：避免先用 960 回退宽度渲染一帧再跳变（宽屏上可见闪动）。
  // useLayoutEffect 在 paint 前执行，首帧即使用真实容器宽度。
  useLayoutEffect(() => {
    if (embedded || rootRef.current == null) {
      return;
    }

    const measure = () => {
      const nextWidth = rootRef.current?.getBoundingClientRect().width;
      if (typeof nextWidth === "number" && Number.isFinite(nextWidth) && nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    };

    measure();

    if (typeof window.ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new window.ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (typeof nextWidth === "number" && Number.isFinite(nextWidth) && nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    });
    resizeObserver.observe(rootRef.current);
    return () => resizeObserver.disconnect();
  }, [embedded]);

  useEffect(() => {
    if (!hasFrozenPanes) {
      if (canvasRef.current == null) {
        return;
      }

      drawSheet({
        canvas: canvasRef.current,
        columns: [...view.columns],
        rows,
        data,
        defaultColumnWidth: view.defaultColumnWidth,
        defaultRowHeight: view.defaultRowHeight,
        frozenRows: view.frozenRows,
        frozenCols: view.frozenCols,
        rowStart: isVirtualized ? virtualRowRange.start : undefined,
        rowEnd: isVirtualized ? virtualRowRange.end : undefined,
        columnStart: isVirtualized ? virtualColumnRange.start : undefined,
        columnEnd: isVirtualized ? virtualColumnRange.end : undefined,
        fitWidth: stretchToContainer ? usableViewportWidth : undefined,
        styleResolver,
      });
      return;
    }

    if (cornerCanvasRef.current != null && frozenRows > 0 && frozenCols > 0) {
      drawSheet({
        canvas: cornerCanvasRef.current,
        columns: [...view.columns],
        rows,
        data,
        defaultColumnWidth: view.defaultColumnWidth,
        defaultRowHeight: view.defaultRowHeight,
        frozenRows: view.frozenRows,
        frozenCols: view.frozenCols,
        rowStart: 0,
        rowEnd: frozenRows,
        columnStart: 0,
        columnEnd: frozenCols,
        backgroundColor: "#f8fafc",
        fitWidth: stretchToContainer ? usableViewportWidth : undefined,
        styleResolver,
      });
    }

    if (topCanvasRef.current != null && frozenRows > 0 && frozenCols < view.columns.length) {
      drawSheet({
        canvas: topCanvasRef.current,
        columns: [...view.columns],
        rows,
        data,
        defaultColumnWidth: view.defaultColumnWidth,
        defaultRowHeight: view.defaultRowHeight,
        frozenRows: view.frozenRows,
        frozenCols: view.frozenCols,
        rowStart: 0,
        rowEnd: frozenRows,
        columnStart: frozenCols,
        columnEnd: view.columns.length,
        backgroundColor: "#f8fafc",
        fitWidth: stretchToContainer ? usableViewportWidth : undefined,
        styleResolver,
      });
    }

    if (leftCanvasRef.current != null && frozenCols > 0 && frozenRows < rows.length) {
      drawSheet({
        canvas: leftCanvasRef.current,
        columns: [...view.columns],
        rows,
        data,
        defaultColumnWidth: view.defaultColumnWidth,
        defaultRowHeight: view.defaultRowHeight,
        frozenRows: view.frozenRows,
        frozenCols: view.frozenCols,
        rowStart: frozenRows,
        rowEnd: rows.length,
        columnStart: 0,
        columnEnd: frozenCols,
        backgroundColor: "#f8fafc",
        fitWidth: stretchToContainer ? usableViewportWidth : undefined,
        styleResolver,
      });
    }

    if (bodyCanvasRef.current != null) {
      drawSheet({
        canvas: bodyCanvasRef.current,
        columns: [...view.columns],
        rows,
        data,
        defaultColumnWidth: view.defaultColumnWidth,
        defaultRowHeight: view.defaultRowHeight,
        frozenRows: view.frozenRows,
        frozenCols: view.frozenCols,
        rowStart: frozenRows,
        rowEnd: rows.length,
        columnStart: frozenCols,
        columnEnd: view.columns.length,
        fitWidth: stretchToContainer ? usableViewportWidth : undefined,
        styleResolver,
      });
    }
  }, [
    data,
    frozenCols,
    frozenRows,
    hasFrozenPanes,
    isVirtualized,
    rows,
    stretchToContainer,
    usableViewportWidth,
    virtualColumnRange.end,
    virtualColumnRange.start,
    virtualRowRange.end,
    virtualRowRange.start,
    view.columns,
    view.defaultColumnWidth,
    view.defaultRowHeight,
    view.frozenCols,
    view.frozenRows,
    styleResolver,
  ]);

  function handleBodyScroll(event: React.UIEvent<HTMLDivElement>) {
    setScrollState({
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop,
    });
  }

  const imageOverlays = (view.images ?? []).map((image, index) => {
    const absoluteLeft =
      fittedLayout.columnWidths.slice(0, image.column).reduce((sum, width) => sum + width, 0) + (image.colOffset ?? 0);
    const absoluteTop =
      fittedLayout.rowHeights.slice(0, image.row).reduce((sum, height) => sum + height, 0) + (image.rowOffset ?? 0);
    const pane: SheetPaneName = !hasFrozenPanes
      ? "full"
      : image.column < frozenCols && image.row < frozenRows
        ? "corner"
        : image.row < frozenRows
          ? "top"
          : image.column < frozenCols
            ? "left"
            : "body";
    const left = pane === "top" || pane === "body" ? absoluteLeft - fittedLayout.frozenWidth : absoluteLeft;
    const top = pane === "left" || pane === "body" ? absoluteTop - fittedLayout.frozenHeight : absoluteTop;

    const node = (
      <img
        key={index}
        data-testid={`bf-sheet-image-${index}`}
        src={assetLoader.resolveAssetUrl(image.src) ?? image.src}
        alt=""
        style={{
          position: "absolute",
          left,
          top,
          width: image.width ?? 120,
          height: image.height ?? 80,
          objectFit: image.lockAspectRatio === false ? "fill" : "contain",
          pointerEvents: "none",
        }}
      />
    );

    return { pane, node };
  });
  const renderImagesForPane = (pane: SheetPaneName) =>
    imageOverlays.filter((image) => image.pane === pane).map((image) => image.node);
  const sheetForms = view.forms ?? [];
  const a11yTable = useMemo(() => buildAccessibleTable(view, rows), [view, rows]);

  return (
    <section
      ref={rootRef}
      className={embedded ? "bf-workbook-sheet-view bf-workbook-sheet-view-embedded" : "bf-workbook-sheet-view"}
      data-device={device}
      aria-label={view.label ?? view.name ?? "Sheet"}
    >
      {!embedded ? <h2>{view.label ?? view.name}</h2> : null}
      {/* Accessible fallback: hidden HTML table for screen readers */}
      <table
        aria-label={a11yTable.caption}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        }}
      >
        <caption>{a11yTable.caption}</caption>
        <thead>
          <tr>
            {a11yTable.headers.map((header, i) => (
              <th key={i} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {a11yTable.body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!hasFrozenPanes ? (
        isVirtualized ? (
          <div
            data-testid="bf-sheet-scroll-viewport"
            style={{
              width: resolvedViewportWidth,
              maxWidth: "100%",
              height: viewportHeight,
              margin: "0 auto",
              overflowX: hasHorizontalOverflow ? "auto" : "hidden",
              overflowY: hasVerticalOverflow ? "auto" : "hidden",
              scrollbarGutter: "stable",
              border: "1px solid #d1d5db",
              background: "#ffffff",
            }}
            onScroll={handleBodyScroll}
          >
            <div
              data-testid="bf-sheet-layer"
              style={{ position: "relative", width: fittedLayout.totalWidth, height: fittedLayout.totalHeight }}
            >
              <canvas
                ref={canvasRef}
                data-testid="bf-sheet-virtual-canvas"
                style={{ position: "absolute", left: virtualColumnRange.offset, top: virtualRowRange.offset }}
              />
              {renderImagesForPane("full")}
            </div>
          </div>
        ) : imageOverlays.length > 0 ? (
          <div
            data-testid="bf-sheet-layer"
            style={{
              position: "relative",
              width: fittedLayout.totalWidth,
              height: fittedLayout.totalHeight,
              margin: "0 auto",
            }}
          >
            <canvas ref={canvasRef} />
            {renderImagesForPane("full")}
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
        )
      ) : (
        <div
          data-testid="bf-sheet-viewport"
          style={{
            position: "relative",
            width: resolvedViewportWidth,
            maxWidth: "100%",
            height: viewportHeight,
            margin: "0 auto",
            overflow: "hidden",
            border: "1px solid #d1d5db",
            background: "#ffffff",
          }}
        >
          {frozenRows > 0 && frozenCols > 0 ? (
            <div
              data-testid="bf-sheet-pane-corner"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: fittedLayout.frozenWidth,
                height: fittedLayout.frozenHeight,
                overflow: "hidden",
                zIndex: 3,
                borderRight: "1px solid #d1d5db",
                borderBottom: "1px solid #d1d5db",
              }}
            >
              <div style={{ position: "relative", width: fittedLayout.frozenWidth, height: fittedLayout.frozenHeight }}>
                <canvas ref={cornerCanvasRef} />
                {renderImagesForPane("corner")}
              </div>
            </div>
          ) : null}

          {frozenRows > 0 && frozenCols < view.columns.length ? (
            <div
              data-testid="bf-sheet-pane-top"
              style={{
                position: "absolute",
                left: fittedLayout.frozenWidth,
                top: 0,
                width: bodyViewportWidth,
                height: fittedLayout.frozenHeight,
                overflow: "hidden",
                zIndex: 2,
                borderBottom: "1px solid #d1d5db",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: Math.max(0, fittedLayout.totalWidth - fittedLayout.frozenWidth),
                  height: fittedLayout.frozenHeight,
                  transform: `translateX(-${scrollState.left}px)`,
                }}
              >
                <canvas ref={topCanvasRef} data-testid="bf-sheet-pane-top-canvas" />
                {renderImagesForPane("top")}
              </div>
            </div>
          ) : null}

          {frozenCols > 0 && frozenRows < rows.length ? (
            <div
              data-testid="bf-sheet-pane-left"
              style={{
                position: "absolute",
                left: 0,
                top: fittedLayout.frozenHeight,
                width: fittedLayout.frozenWidth,
                height: bodyViewportHeight,
                overflow: "hidden",
                zIndex: 2,
                borderRight: "1px solid #d1d5db",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: fittedLayout.frozenWidth,
                  height: Math.max(0, fittedLayout.totalHeight - fittedLayout.frozenHeight),
                  transform: `translateY(-${scrollState.top}px)`,
                }}
              >
                <canvas ref={leftCanvasRef} data-testid="bf-sheet-pane-left-canvas" />
                {renderImagesForPane("left")}
              </div>
            </div>
          ) : null}

          <div
            data-testid="bf-sheet-pane-body"
            style={{
              position: "absolute",
              left: fittedLayout.frozenWidth,
              top: fittedLayout.frozenHeight,
              width: bodyViewportWidth,
              height: bodyViewportHeight,
              overflowX: hasHorizontalOverflow ? "auto" : "hidden",
              overflowY: hasVerticalOverflow ? "auto" : "hidden",
              scrollbarGutter: "stable",
            }}
            onScroll={handleBodyScroll}
          >
            <div
              data-testid="bf-sheet-pane-body-layer"
              style={{
                position: "relative",
                width: Math.max(0, fittedLayout.totalWidth - fittedLayout.frozenWidth),
                height: Math.max(0, fittedLayout.totalHeight - fittedLayout.frozenHeight),
              }}
            >
              <canvas ref={bodyCanvasRef} />
              {renderImagesForPane("body")}
            </div>
          </div>
        </div>
      )}
      {sheetForms.length > 0 ? (
        <div data-testid="bf-sheet-forms" className="bf-workbook-sheet-forms">
          {sheetForms.map((form, index) => (
            <FormView key={index} view={form} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
