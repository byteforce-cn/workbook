import type { PageBlockDefinition } from "../../core/types";
import { useEditorText } from "../i18n";

type WatermarkBlock = Extract<PageBlockDefinition, { type: "watermark" }>;

export interface WatermarkPanelProps {
  blocks: WatermarkBlock[];
  onChange(next: WatermarkBlock[]): void;
}

export function WatermarkPanel({ blocks, onChange }: WatermarkPanelProps) {
  const title = useEditorText("EDITOR_WATERMARK", "水印");
  const addLabel = useEditorText("EDITOR_ADD", "添加");
  const textLabel = useEditorText("EDITOR_TEXT", "文本");
  const opacityLabel = useEditorText("EDITOR_OPACITY", "透明度");
  const rotationLabel = useEditorText("EDITOR_ROTATION", "旋转");
  const repeatLabel = useEditorText("EDITOR_REPEAT", "平铺");
  const imageLabel = useEditorText("EDITOR_IMAGE", "图片资源键");
  const deleteLabel = useEditorText("EDITOR_DELETE", "删除");
  const fontSizeLabel = useEditorText("EDITOR_FONT_SIZE", "字号");
  const colorLabel = useEditorText("EDITOR_COLOR", "文字颜色");

  const update = (index: number, patch: Partial<WatermarkBlock>) => {
    onChange(blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)));
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
                type: "watermark",
                text: "机密",
                fontSize: 48,
                color: "#9ca3af",
                opacity: 0.2,
                rotation: -30,
                repeat: false,
              },
            ])
          }
        >
          {addLabel} {title}
        </button>
      </div>
      {blocks.map((block, index) => (
        <div key={index} className="bf-editor-panel-item" data-watermark-index={index}>
          <label>
            {textLabel}
            <input value={block.text} onChange={(event) => update(index, { text: event.target.value })} />
          </label>
          <label>
            {imageLabel}
            <input
              value={block.image ?? ""}
              onChange={(event) => update(index, { image: event.target.value === "" ? undefined : event.target.value })}
            />
          </label>
          <label>
            {fontSizeLabel}
            <input
              type="number"
              min={1}
              value={block.fontSize ?? 48}
              onChange={(event) => update(index, { fontSize: Number(event.target.value) })}
            />
          </label>
          <label>
            {colorLabel}
            <input
              type="color"
              value={block.color ?? "#9ca3af"}
              onChange={(event) => update(index, { color: event.target.value })}
            />
          </label>
          <label>
            {opacityLabel}
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={block.opacity ?? 0.2}
              onChange={(event) => update(index, { opacity: Number(event.target.value) })}
            />
          </label>
          <label>
            {rotationLabel}
            <input
              type="number"
              step={1}
              value={block.rotation ?? -30}
              onChange={(event) => update(index, { rotation: Number(event.target.value) })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.repeat ?? false}
              onChange={(event) => update(index, { repeat: event.target.checked })}
            />
            {repeatLabel}
          </label>
          <button type="button" onClick={() => onChange(blocks.filter((_block, blockIndex) => blockIndex !== index))}>
            {deleteLabel}
          </button>
        </div>
      ))}
    </section>
  );
}
