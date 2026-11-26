import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useState } from "react";
import type { WorkbookStyleCatalog } from "../../core/types";
import { applyTextFormat, clearTextFormatting } from "../format/applyFormat";
import { styleOptions } from "../format/textFormat";
import { useEditorText } from "../i18n";
import {
  addColumn,
  addRowAfter,
  deleteColumn,
  deleteRow,
  mergeWithNextCell,
  splitCurrentCell,
} from "../nodes/table/commands";
import { StylePicker } from "./StylePicker";

export interface ToolbarProps {
  editor: Editor;
  styles: WorkbookStyleCatalog | undefined;
  simulateConditions: boolean;
  onSimulateConditionsChange(nextValue: boolean): void;
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick(): void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bf-editor-toolbar-button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      // Preserve the text selection while clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor, styles, simulateConditions, onSimulateConditionsChange }: ToolbarProps) {
  const [bindPath, setBindPath] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [color, setColor] = useState("#111827");

  const labels = {
    toolbar: useEditorText("EDITOR_TOOLBAR", "编辑器工具栏"),
    bold: useEditorText("EDITOR_BOLD", "加粗"),
    italic: useEditorText("EDITOR_ITALIC", "斜体"),
    underline: useEditorText("EDITOR_UNDERLINE", "下划线"),
    strikethrough: useEditorText("EDITOR_STRIKETHROUGH", "删除线"),
    fontSize: useEditorText("EDITOR_FONT_SIZE", "字号"),
    color: useEditorText("EDITOR_COLOR", "文字颜色"),
    link: useEditorText("EDITOR_LINK", "链接地址"),
    alignLeft: useEditorText("EDITOR_ALIGN_LEFT", "左对齐"),
    alignCenter: useEditorText("EDITOR_ALIGN_CENTER", "居中"),
    alignRight: useEditorText("EDITOR_ALIGN_RIGHT", "右对齐"),
    alignJustify: useEditorText("EDITOR_ALIGN_JUSTIFY", "两端对齐"),
    paragraphStyle: useEditorText("EDITOR_PARAGRAPH_STYLE", "段落样式"),
    characterStyle: useEditorText("EDITOR_CHARACTER_STYLE", "字符样式"),
    clearFormat: useEditorText("EDITOR_CLEAR_FORMAT", "清除直接格式"),
    insertBind: useEditorText("EDITOR_INSERT_BIND", "插入数据绑定"),
    bindPath: useEditorText("EDITOR_BIND_PATH", "绑定路径"),
    insert: useEditorText("EDITOR_INSERT", "插入"),
    insertPageBreak: useEditorText("EDITOR_INSERT_PAGE_BREAK", "插入分页符"),
    insertTable: useEditorText("EDITOR_INSERT_TABLE", "插入表格"),
    addRow: useEditorText("EDITOR_TABLE_ADD_ROW", "增加行"),
    deleteRow: useEditorText("EDITOR_TABLE_DELETE_ROW", "删除行"),
    addColumn: useEditorText("EDITOR_TABLE_ADD_COLUMN", "增加列"),
    deleteColumn: useEditorText("EDITOR_TABLE_DELETE_COLUMN", "删除列"),
    merge: useEditorText("EDITOR_TABLE_MERGE", "与右侧单元格合并"),
    split: useEditorText("EDITOR_TABLE_SPLIT", "拆分单元格"),
    simulate: useEditorText("EDITOR_SIMULATE_CONDITIONS", "按当前数据模拟条件显隐"),
  };

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("wbText", { fontWeight: "bold" }),
      italic: current.isActive("wbText", { fontStyle: "italic" }),
      underline: current.isActive("wbText", { textDecoration: "underline" }),
      strike: current.isActive("wbText", { textDecoration: "line-through" }),
      alignment: current.getAttributes("wbParagraph").alignment,
      paragraphStyle: current.getAttributes("wbParagraph").style,
      characterStyle: current.getAttributes("wbText").style,
      inTable: current.isActive("wbTable"),
      canMerge: current.isActive("wbTableCell"),
    }),
  });

  const applyMark = (patch: Record<string, unknown>) => {
    editor.chain().focus().run();
    applyTextFormat(editor, patch);
  };

  const insertTable = () => {
    const { schema } = editor;
    const emptyParagraph = () => schema.nodes.wbParagraph.create();
    const cells = (count: number) =>
      Array.from({ length: count }, () => schema.nodes.wbTableCell.create(null, [emptyParagraph()]));
    const table = schema.nodes.wbTable.create(null, [
      schema.nodes.wbTableColgroup.create({ widths: ["34%", "33%", "33%"] }),
      schema.nodes.wbTableRow.create(null, cells(3)),
      schema.nodes.wbTableRow.create(null, cells(3)),
    ]);
    editor.chain().focus().insertContent(table).run();
  };

  return (
    <div className="bf-editor-toolbar" role="toolbar" aria-label={labels.toolbar}>
      <ToolbarButton
        label={labels.bold}
        pressed={state.bold}
        onClick={() => applyMark({ fontWeight: state.bold ? null : "bold" })}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label={labels.italic}
        pressed={state.italic}
        onClick={() => applyMark({ fontStyle: state.italic ? null : "italic" })}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label={labels.underline}
        pressed={state.underline}
        onClick={() => applyMark({ textDecoration: state.underline ? null : "underline" })}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </ToolbarButton>
      <ToolbarButton
        label={labels.strikethrough}
        pressed={state.strike}
        onClick={() => applyMark({ textDecoration: state.strike ? null : "line-through" })}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </ToolbarButton>

      <label className="bf-editor-toolbar-field">
        {labels.fontSize}
        <input
          type="number"
          min={1}
          step={1}
          value={fontSize}
          onChange={(event) => setFontSize(event.target.value)}
          onBlur={() => {
            const value = Number(fontSize);
            if (fontSize.trim() === "" || !Number.isFinite(value) || value <= 0) {
              return;
            }
            applyMark({ fontSize: value });
          }}
        />
      </label>

      <label className="bf-editor-toolbar-field">
        {labels.color}
        <input
          type="color"
          value={color}
          onChange={(event) => {
            setColor(event.target.value);
            applyMark({ color: event.target.value });
          }}
        />
      </label>

      <label className="bf-editor-toolbar-field">
        {labels.link}
        <input
          type="url"
          value={linkHref}
          onChange={(event) => setLinkHref(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            applyMark({ link: linkHref.trim() === "" ? null : { href: linkHref.trim() } });
          }}
        />
      </label>

      <StylePicker
        kind="paragraph"
        label={labels.paragraphStyle}
        value={typeof state.paragraphStyle === "string" ? state.paragraphStyle : ""}
        options={styleOptions(styles, "paragraphStyles")}
        onChange={(styleId) => {
          editor
            .chain()
            .focus()
            .updateAttributes("wbParagraph", { style: styleId === "" ? null : styleId })
            .run();
        }}
      />

      <StylePicker
        kind="character"
        label={labels.characterStyle}
        value={typeof state.characterStyle === "string" ? state.characterStyle : ""}
        options={styleOptions(styles, "characterStyles")}
        onChange={(styleId) => applyMark({ style: styleId === "" ? null : styleId })}
      />

      <ToolbarButton
        label={labels.clearFormat}
        onClick={() => {
          editor.chain().focus().run();
          clearTextFormatting(editor);
        }}
      >
        {/* 用图标而不是 "Tx"：字母会成为可见文本，与 aria-label「清除直接格式」对不上。 */}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" focusable="false">
          <path d="M2.5 2.5h9M7 2.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3.5 12.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      {(["left", "center", "right", "justify"] as const).map((alignment) => (
        <ToolbarButton
          key={alignment}
          label={
            alignment === "left"
              ? labels.alignLeft
              : alignment === "center"
                ? labels.alignCenter
                : alignment === "right"
                  ? labels.alignRight
                  : labels.alignJustify
          }
          pressed={state.alignment === alignment}
          onClick={() => editor.chain().focus().updateAttributes("wbParagraph", { alignment }).run()}
        >
          {alignment === "left" ? "L" : alignment === "center" ? "C" : alignment === "right" ? "R" : "J"}
        </ToolbarButton>
      ))}

      <span className="bf-editor-toolbar-group">
        <label className="bf-editor-toolbar-field">
          {labels.bindPath}
          <input value={bindPath} onChange={(event) => setBindPath(event.target.value)} />
        </label>
        <ToolbarButton
          label={labels.insertBind}
          disabled={bindPath.trim() === ""}
          onClick={() => {
            editor
              .chain()
              .focus()
              .insertContent({ type: "wbBind", attrs: { path: bindPath.trim() } })
              .run();
            setBindPath("");
          }}
        >
          {"{}"}
        </ToolbarButton>
      </span>

      <ToolbarButton
        label={labels.insertPageBreak}
        onClick={() => editor.chain().focus().insertContent({ type: "wbPageBreak" }).run()}
      >
        ¶
      </ToolbarButton>
      <ToolbarButton label={labels.insertTable} onClick={insertTable}>
        ▦
      </ToolbarButton>

      {state.inTable ? (
        <>
          <ToolbarButton label={labels.addRow} onClick={() => addRowAfter(editor)}>
            +R
          </ToolbarButton>
          <ToolbarButton label={labels.deleteRow} onClick={() => deleteRow(editor)}>
            -R
          </ToolbarButton>
          <ToolbarButton label={labels.addColumn} onClick={() => addColumn(editor)}>
            +C
          </ToolbarButton>
          <ToolbarButton label={labels.deleteColumn} onClick={() => deleteColumn(editor)}>
            -C
          </ToolbarButton>
          <ToolbarButton label={labels.merge} onClick={() => mergeWithNextCell(editor)}>
            M
          </ToolbarButton>
          <ToolbarButton label={labels.split} onClick={() => splitCurrentCell(editor)}>
            S
          </ToolbarButton>
        </>
      ) : null}

      <label className="bf-editor-toolbar-field">
        <input
          type="checkbox"
          checked={simulateConditions}
          onChange={(event) => onSimulateConditionsChange(event.target.checked)}
        />
        {labels.simulate}
      </label>
    </div>
  );
}
