import type { Extensions } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import type { PageBlockDefinition, PageViewDefinition, WorkbookStyleCatalog } from "../../core/types";
import type { WorkbookPluginRegistry } from "../../react/registry";
import type { Paragraph } from "../../schema/generated-types";
import { fromProseMirror } from "../codec/fromProseMirror";
import { toProseMirror } from "../codec/toProseMirror";
import { useEditorText } from "../i18n";
import { createEditorExtensions } from "../schema/editorExtensions";

type HeaderFooterBlock = Extract<PageBlockDefinition, { type: "header" | "footer" }>;

const EMPTY_PARAGRAPH: Paragraph = {
  type: "paragraph",
  runs: [{ type: "text", text: "" }],
};

function fakeView(
  content: PageBlockDefinition[],
  pageSettings: PageViewDefinition["pageSettings"],
): PageViewDefinition {
  return { type: "page", pageSettings, content };
}

function FlowEditor({
  value,
  pageSettings,
  styles,
  registry,
  label,
  onChange,
}: {
  value: Paragraph[];
  pageSettings: PageViewDefinition["pageSettings"];
  styles: WorkbookStyleCatalog | undefined;
  registry: WorkbookPluginRegistry;
  label: string;
  onChange(next: Paragraph[]): void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const baseView = useMemo(
    () => fakeView(value.length === 0 ? [EMPTY_PARAGRAPH] : value, pageSettings),
    [pageSettings, value],
  );
  const [initialContent] = useState(() =>
    toProseMirror(baseView, { styles, registeredComponents: [...registry.pageBlock.keys()] }).doc?.toJSON(),
  );

  const extensions = useMemo<Extensions>(
    () =>
      createEditorExtensions(() => ({
        data: {},
        simulate: false,
        registry,
        styles,
      })),
    [registry, styles],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        "aria-label": label,
        class: "bf-editor-flow-content",
      },
    },
    onUpdate({ editor: current }) {
      try {
        const result = fromProseMirror(current.state.doc, baseView, {});
        onChangeRef.current(result.view.content.filter((block): block is Paragraph => block.type === "paragraph"));
      } catch {
        // Intermediate editor states can be unsaveable; the last valid value stays.
      }
    },
  });

  if (editor == null) {
    return null;
  }

  return <EditorContent editor={editor} className="bf-editor-flow" />;
}

export interface HeaderFooterPanelProps {
  blocks: HeaderFooterBlock[];
  pageSettings: PageViewDefinition["pageSettings"];
  styles: WorkbookStyleCatalog | undefined;
  registry: WorkbookPluginRegistry;
  onChange(next: HeaderFooterBlock[]): void;
}

export function HeaderFooterPanel({ blocks, pageSettings, styles, registry, onChange }: HeaderFooterPanelProps) {
  const headerLabel = useEditorText("EDITOR_HEADER", "页眉");
  const footerLabel = useEditorText("EDITOR_FOOTER", "页脚");
  const addLabel = useEditorText("EDITOR_ADD", "添加");
  const deleteLabel = useEditorText("EDITOR_DELETE", "删除");
  const alignmentLabel = useEditorText("EDITOR_ALIGNMENT", "对齐");
  const firstPageLabel = useEditorText("EDITOR_FIRST_PAGE", "首页显示");
  const oddPagesLabel = useEditorText("EDITOR_ODD_PAGES", "奇数页显示");
  const evenPagesLabel = useEditorText("EDITOR_EVEN_PAGES", "偶数页显示");
  const styleLabel = useEditorText("EDITOR_STYLE", "样式 id");

  const update = (index: number, patch: Partial<HeaderFooterBlock>) => {
    onChange(blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)));
  };

  const add = (type: "header" | "footer") => {
    onChange([
      ...blocks,
      {
        type,
        content: [EMPTY_PARAGRAPH],
        alignment: "left",
        showOnFirstPage: true,
        showOnEvenPages: true,
        showOnOddPages: true,
      } as HeaderFooterBlock,
    ]);
  };

  return (
    <section className="bf-editor-panel" aria-label={`${headerLabel} / ${footerLabel}`}>
      <div className="bf-editor-panel-actions">
        <button type="button" onClick={() => add("header")}>
          {addLabel} {headerLabel}
        </button>
        <button type="button" onClick={() => add("footer")}>
          {addLabel} {footerLabel}
        </button>
      </div>
      {blocks.map((block, index) => (
        <div key={`${block.type}-${index}`} className="bf-editor-panel-item" data-header-footer-type={block.type}>
          <h3>{block.type === "header" ? headerLabel : footerLabel}</h3>
          <FlowEditor
            value={block.content}
            pageSettings={pageSettings}
            styles={styles}
            registry={registry}
            label={block.type === "header" ? headerLabel : footerLabel}
            onChange={(content) => update(index, { content } as Partial<HeaderFooterBlock>)}
          />
          <label>
            {alignmentLabel}
            <select
              value={block.alignment ?? "left"}
              onChange={(event) =>
                update(index, {
                  alignment: event.target.value as HeaderFooterBlock["alignment"],
                } as Partial<HeaderFooterBlock>)
              }
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </label>
          <label>
            {styleLabel}
            <input
              value={block.style ?? ""}
              onChange={(event) =>
                update(index, {
                  style: event.target.value === "" ? undefined : event.target.value,
                } as Partial<HeaderFooterBlock>)
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.showOnFirstPage ?? true}
              onChange={(event) =>
                update(index, { showOnFirstPage: event.target.checked } as Partial<HeaderFooterBlock>)
              }
            />
            {firstPageLabel}
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.showOnOddPages ?? true}
              onChange={(event) =>
                update(index, { showOnOddPages: event.target.checked } as Partial<HeaderFooterBlock>)
              }
            />
            {oddPagesLabel}
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.showOnEvenPages ?? true}
              onChange={(event) =>
                update(index, { showOnEvenPages: event.target.checked } as Partial<HeaderFooterBlock>)
              }
            />
            {evenPagesLabel}
          </label>
          <button
            type="button"
            onClick={() => onChange(blocks.filter((_candidate, blockIndex) => blockIndex !== index))}
          >
            {deleteLabel}
          </button>
        </div>
      ))}
    </section>
  );
}
