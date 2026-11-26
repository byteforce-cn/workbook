import { useMemo, useRef } from "react";
import type { PageBlockDefinition, PageViewDefinition } from "../../core/types";
import { layoutPageView } from "../../renderers/page/pageLayout";
import { useEditorText } from "../i18n";
import { formatMeasurement, moveFloatingBlock, parseMeasurement, resizeFloatingBlock } from "../layout/floating";

type FloatingBlock = Extract<PageBlockDefinition, { type: "floating" }>;
type FloatingContainerBlock = FloatingBlock["content"];

export interface FloatingPanelProps {
  blocks: FloatingBlock[];
  pageSettings: PageViewDefinition["pageSettings"];
  onChange(next: FloatingBlock[]): void;
}

const CANVAS_SCALE = 0.5;

interface DragState {
  index: number;
  mode: "move" | "resize";
  lastX: number;
  lastY: number;
}

export function FloatingPanel({ blocks, pageSettings, onChange }: FloatingPanelProps) {
  const title = useEditorText("EDITOR_FLOATING", "浮动块");
  const addLabel = useEditorText("EDITOR_ADD", "添加");
  const textLabel = useEditorText("EDITOR_TEXT", "文本");
  const xLabel = useEditorText("EDITOR_X", "X 位置");
  const yLabel = useEditorText("EDITOR_Y", "Y 位置");
  const widthLabel = useEditorText("EDITOR_WIDTH", "宽度");
  const heightLabel = useEditorText("EDITOR_HEIGHT", "高度");
  const deleteLabel = useEditorText("EDITOR_DELETE", "删除");
  const dragRef = useRef<DragState | null>(null);

  const layout = useMemo(
    () =>
      layoutPageView({
        type: "page",
        pageSettings,
        content: blocks,
      }),
    [blocks, pageSettings],
  );

  const update = (index: number, next: FloatingBlock) => {
    onChange(blocks.map((block, blockIndex) => (blockIndex === index ? next : block)));
  };

  const updateMeasurement = (index: number, key: "x" | "y" | "width" | "height", raw: string) => {
    const value = parseMeasurement(raw);
    const block = blocks[index];
    if (value == null || block == null) {
      return;
    }
    update(index, { ...block, layout: { ...block.layout, [key]: value } });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag == null) {
      return;
    }

    const block = blocks[drag.index];
    if (block == null) {
      return;
    }

    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    update(
      drag.index,
      drag.mode === "move"
        ? moveFloatingBlock(block, deltaX, deltaY, CANVAS_SCALE, pageSettings.width, pageSettings.height)
        : resizeFloatingBlock(block, deltaX, deltaY, CANVAS_SCALE, pageSettings.width, pageSettings.height),
    );
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>, index: number, mode: DragState["mode"]) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { index, mode, lastX: event.clientX, lastY: event.clientY };
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <section className="bf-editor-panel" aria-label={title}>
      <div className="bf-editor-panel-actions">
        <button
          type="button"
          onClick={() =>
            onChange([
              ...blocks,
              {
                type: "floating",
                layout: { x: 40, y: 40, width: 200, height: 80 },
                content: { type: "paragraph", runs: [{ type: "text", text: "浮动内容" }] },
              },
            ])
          }
        >
          {addLabel} {title}
        </button>
      </div>

      <div className="bf-editor-floating-canvas" onPointerMove={handlePointerMove} onPointerUp={endDrag}>
        {layout.pages.map((page) => (
          <div
            key={page.pageIndex}
            className="bf-editor-floating-page"
            style={{
              position: "relative",
              width: page.width * CANVAS_SCALE,
              height: page.height * CANVAS_SCALE,
              background: "#ffffff",
              border: "1px solid var(--bf-border, #e5e7eb)",
              marginBottom: 12,
            }}
            data-page-index={page.pageIndex}
          >
            {page.floatingBlocks.map(({ block, x, y, width, height }) => {
              const index = blocks.indexOf(block);
              if (index < 0) {
                return null;
              }

              return (
                <div
                  key={`${page.pageIndex}-${index}`}
                  className="bf-editor-floating-box"
                  title={`${title} ${index + 1}`}
                  style={{
                    position: "absolute",
                    left: x * CANVAS_SCALE,
                    top: y * CANVAS_SCALE,
                    width: width * CANVAS_SCALE,
                    height: height * CANVAS_SCALE,
                    border: "1px dashed #2563eb",
                    background: "rgba(37, 99, 235, 0.08)",
                    cursor: "move",
                    touchAction: "none",
                  }}
                  onPointerDown={(event) => startDrag(event, index, "move")}
                >
                  <span className="bf-editor-floating-handle" aria-hidden="true">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`${widthLabel} / ${heightLabel}`}
                    style={{
                      position: "absolute",
                      right: -5,
                      bottom: -5,
                      width: 10,
                      height: 10,
                      background: "#2563eb",
                      cursor: "nwse-resize",
                    }}
                    onPointerDown={(event) => startDrag(event, index, "resize")}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {blocks.map((block, index) => (
        <div key={index} className="bf-editor-panel-item" data-floating-index={index}>
          <label>
            {textLabel}
            <input
              value={
                block.content.type === "paragraph" && block.content.runs[0]?.type === "text"
                  ? (block.content.runs[0].text ?? "")
                  : block.content.type
              }
              disabled={block.content.type !== "paragraph"}
              onChange={(event) => {
                const content: FloatingContainerBlock = {
                  type: "paragraph",
                  runs: [{ type: "text", text: event.target.value }],
                };
                update(index, { ...block, content });
              }}
            />
          </label>
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key}>
              {key === "x" ? xLabel : key === "y" ? yLabel : key === "width" ? widthLabel : heightLabel}
              <input
                value={formatMeasurement(block.layout[key])}
                onChange={(event) => updateMeasurement(index, key, event.target.value)}
              />
            </label>
          ))}
          <button type="button" onClick={() => onChange(blocks.filter((_block, blockIndex) => blockIndex !== index))}>
            {deleteLabel}
          </button>
        </div>
      ))}
    </section>
  );
}
