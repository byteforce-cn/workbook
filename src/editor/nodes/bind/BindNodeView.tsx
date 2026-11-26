/**
 * Inline data-binding chip.
 *
 * The chip is an atom: editing path/format/placeholder happens in the popover,
 * never by typing inside the node. The template keeps `{{path}}` while the
 * print preview resolves it through the workbook renderer.
 */

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { bindChipLabel, bindFromAttrs, bindPlaceholderText, resolveBindPreview } from "../../data/preview";
import { useEditorContext } from "../../editorContext";
import { useEditorText } from "../../i18n";

export function BindNodeView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { previewData } = useEditorContext();
  const { attrs } = node;
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState(String(attrs.path ?? ""));
  const [format, setFormat] = useState(String(attrs.format ?? ""));
  const [placeholder, setPlaceholder] = useState(() => bindPlaceholderText(attrs));

  const label = useEditorText("EDITOR_INSERT_BIND", "插入数据绑定");
  const pathLabel = useEditorText("EDITOR_BIND_PATH", "绑定路径");
  const formatLabel = useEditorText("EDITOR_BIND_FORMAT", "绑定格式");
  const placeholderLabel = useEditorText("EDITOR_BIND_PLACEHOLDER", "绑定占位符");
  const insertLabel = useEditorText("EDITOR_INSERT", "插入");
  const cancelLabel = useEditorText("EDITOR_CANCEL", "取消");
  const deleteLabel = useEditorText("EDITOR_DELETE", "删除");

  const resolved = resolveBindPreview(bindFromAttrs(attrs), previewData);

  return (
    <NodeViewWrapper
      as="span"
      className={`bf-editor-bind${selected ? " bf-editor-bind--selected" : ""}`}
      contentEditable={false}
      data-wb-bind-chip="true"
      onMouseDown={(event: React.MouseEvent) => event.stopPropagation()}
    >
      <button
        type="button"
        className="bf-editor-bind-chip"
        aria-label={label}
        aria-expanded={editing}
        onClick={() => setEditing((current) => !current)}
      >
        {bindChipLabel(attrs)}
      </button>
      {editing ? (
        <span className="bf-editor-bind-popover" role="dialog" aria-label={label}>
          <label>
            {pathLabel}
            <input value={path} onChange={(event) => setPath(event.target.value)} />
          </label>
          <label>
            {formatLabel}
            <input value={format} onChange={(event) => setFormat(event.target.value)} />
          </label>
          <label>
            {placeholderLabel}
            <input value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} />
          </label>
          <span className="bf-editor-bind-actions">
            <button
              type="button"
              disabled={path.trim() === ""}
              onClick={() => {
                updateAttributes({
                  path: path.trim(),
                  format: format.trim() === "" ? null : format.trim(),
                  placeholder: placeholder === "" ? null : placeholder,
                });
                setEditing(false);
              }}
            >
              {insertLabel}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              {cancelLabel}
            </button>
            <button type="button" onClick={() => deleteNode()}>
              {deleteLabel}
            </button>
          </span>
        </span>
      ) : null}
      <span className="bf-editor-bind-preview" aria-hidden="true">
        {resolved ?? "—"}
      </span>
    </NodeViewWrapper>
  );
}
