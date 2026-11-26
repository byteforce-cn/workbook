import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../../../core/types";
import { toProseMirror } from "../../codec/toProseMirror";
import { editorExtensions } from "../../schema/extensions";
import {
  addColumn,
  addRowAfter,
  deleteColumn,
  deleteRow,
  locateTable,
  mergeWithNextCell,
  splitCurrentCell,
} from "./commands";
import { normalizeColumnWidths, readTableRows, readTableWidths, validateTableGrid } from "./grid";

const pageSettings = { width: 595, height: 842 };

function tableView(columns: Array<number | string> = ["50%", "50%"]): PageViewDefinition {
  return {
    type: "page",
    pageSettings,
    content: [
      {
        type: "table",
        columns,
        rows: [
          {
            cells: [
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "left" }] }] },
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "right" }] }] },
            ],
          },
          {
            cells: [
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "a" }] }] },
              { content: [{ type: "paragraph", runs: [{ type: "text", text: "b" }] }] },
            ],
          },
        ],
      },
    ],
  } as unknown as PageViewDefinition;
}

const editors: Editor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

function makeEditor(view: PageViewDefinition): Editor {
  const { doc } = toProseMirror(view);
  const editor = new Editor({ extensions: editorExtensions, content: doc?.toJSON() });
  editors.push(editor);
  let textPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (textPos == null && node.isText) {
      textPos = pos;
    }
  });
  editor.commands.setTextSelection((textPos ?? 0) + 1);
  return editor;
}

function currentTable(editor: Editor) {
  const location = locateTable(editor);
  expect(location).not.toBeNull();
  return location as NonNullable<typeof location>;
}

describe("table grid", () => {
  it("validates a rectangular grid", () => {
    const rows = Array.from({ length: 3 }, () => ({ cells: [{}, {}] }));
    expect(validateTableGrid(rows).issues).toEqual([]);
    expect(validateTableGrid(rows).columns).toBe(2);
  });

  it("reports spans that overflow the declared columns or leave holes", () => {
    const overflow = validateTableGrid([{ cells: [{ colSpan: 2 }, {}] }], 2);
    expect(overflow.issues.some((issue) => issue.code === "overflow")).toBe(true);

    const hole = validateTableGrid([{ cells: [{ rowSpan: 2 }] }, { cells: [{}] }]);
    expect(hole.issues.some((issue) => issue.code === "hole")).toBe(true);

    const invalid = validateTableGrid([{ cells: [{ colSpan: 0 }] }]);
    expect(invalid.issues.some((issue) => issue.code === "invalid-span")).toBe(true);
  });

  it("normalizes percentage widths to exactly 100", () => {
    expect(normalizeColumnWidths(["33.33%", "33.33%", "33.34%"])).toEqual(["33.3%", "33.3%", "33.4%"]);
    expect(normalizeColumnWidths([100, "50%"])).toEqual([100, "50%"]);
  });
});

describe("table commands", () => {
  it("adds and deletes rows", () => {
    const editor = makeEditor(tableView());
    const before = readTableRows(currentTable(editor).table).length;
    expect(addRowAfter(editor)).toBe(true);
    expect(readTableRows(currentTable(editor).table).length).toBe(before + 1);
    expect(deleteRow(editor)).toBe(true);
    expect(readTableRows(currentTable(editor).table).length).toBe(before);
  });

  it("adds and deletes columns keeping widths", () => {
    const editor = makeEditor(tableView());
    expect(addColumn(editor)).toBe(true);
    expect(readTableWidths(currentTable(editor).table)).toHaveLength(3);
    expect(deleteColumn(editor)).toBe(true);
    expect(readTableWidths(currentTable(editor).table)).toHaveLength(2);
  });

  it("merges with the next cell and splits it again", () => {
    const editor = makeEditor(tableView());
    expect(mergeWithNextCell(editor)).toBe(true);
    const rows = readTableRows(currentTable(editor).table);
    expect(rows[0].cells).toHaveLength(1);
    expect(rows[0].cells[0].colSpan).toBe(2);

    const cell = currentTable(editor).cellIndex;
    expect(cell).toBe(0);
    expect(splitCurrentCell(editor)).toBe(true);
    expect(readTableRows(currentTable(editor).table)[0].cells).toHaveLength(2);
  });

  it("refuses to delete the last row or column", () => {
    const editor = makeEditor({
      type: "page",
      pageSettings,
      content: [
        {
          type: "table",
          columns: ["100%"],
          rows: [{ cells: [{ content: [{ type: "paragraph", runs: [{ type: "text", text: "only" }] }] }] }],
        },
      ],
    } as PageViewDefinition);
    expect(deleteRow(editor)).toBe(false);
    expect(deleteColumn(editor)).toBe(false);
  });
});
