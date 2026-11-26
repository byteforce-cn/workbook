/**
 * ProseMirror schema for the document editor.
 *
 * The schema is deliberately the only definition: the codec, the Tiptap editor,
 * and the contract tests all consume `editorSchema`. Node and mark names carry
 * the `wb` prefix so the projection never looks like a storage format.
 *
 * `wbText` is a single mark carrying every run property. Separate marks
 * (bold/italic/...) would make mark order affect round-trips and lose named
 * style ids the moment a character is edited.
 */

import { getSchema, Mark, Node } from "@tiptap/core";
import Text from "@tiptap/extension-text";
import type { Schema } from "@tiptap/pm/model";

const visibleAttribute = { default: null };
const commentAttribute = { default: null };
const renderHintsAttribute = { default: null };

function styleString(entries: Array<[string, unknown]>): string {
  return entries
    .filter(([, value]) => value != null && value !== "")
    .map(([property, value]) => `${property}: ${String(value)}`)
    .join("; ");
}

function dataAttribute(name: string, value: unknown): Record<string, string> {
  return value == null ? {} : { [name]: String(value) };
}

const WbDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

const WbParagraph = Node.create({
  name: "wbParagraph",
  group: "block wbCellBlock",
  content: "inline*",
  marks: "wbText",
  defining: true,
  addAttributes() {
    return {
      style: { default: null },
      visible: visibleAttribute,
      alignment: { default: null },
      indent: { default: null },
      spaceBefore: { default: null },
      spaceAfter: { default: null },
      lineHeight: { default: null },
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "p[data-wb-paragraph]" }];
  },
  renderHTML({ node }) {
    const css = styleString([
      ["text-align", node.attrs.alignment],
      ["margin-left", node.attrs.indent == null ? null : `${Number(node.attrs.indent) * 12}px`],
      ["margin-top", node.attrs.spaceBefore == null ? null : `${Number(node.attrs.spaceBefore)}px`],
      ["margin-bottom", node.attrs.spaceAfter == null ? null : `${Number(node.attrs.spaceAfter)}px`],
      ["line-height", node.attrs.lineHeight],
    ]);
    return [
      "p",
      {
        "data-wb-paragraph": "true",
        "data-wb-style": node.attrs.style ?? undefined,
        ...dataAttribute("data-wb-visible", node.attrs.visible == null ? null : JSON.stringify(node.attrs.visible)),
        ...(css === "" ? {} : { style: css }),
      },
      0,
    ];
  },
});

const WbTable = Node.create({
  name: "wbTable",
  group: "block",
  content: "wbTableColgroup? wbTableRow+",
  defining: true,
  addAttributes() {
    return {
      style: { default: null },
      visible: visibleAttribute,
      width: { default: null },
      border: { default: null },
      fill: { default: null },
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "table[data-wb-table]" }];
  },
  renderHTML({ node }) {
    return [
      "table",
      {
        "data-wb-table": "true",
        "data-wb-style": node.attrs.style ?? undefined,
        ...(node.attrs.width == null
          ? {}
          : {
              style: styleString([
                ["width", typeof node.attrs.width === "number" ? `${node.attrs.width}px` : node.attrs.width],
              ]),
            }),
      },
      0,
    ];
  },
});

const WbTableColgroup = Node.create({
  name: "wbTableColgroup",
  content: "",
  atom: true,
  selectable: false,
  addAttributes() {
    return { widths: { default: [] } };
  },
  parseHTML() {
    return [{ tag: "colgroup[data-wb-colgroup]" }];
  },
  renderHTML() {
    return ["colgroup", { "data-wb-colgroup": "true" }];
  },
});

const WbTableRow = Node.create({
  name: "wbTableRow",
  content: "wbTableCell+",
  addAttributes() {
    return { height: { default: null } };
  },
  parseHTML() {
    return [{ tag: "tr[data-wb-row]" }];
  },
  renderHTML({ node }) {
    return [
      "tr",
      {
        "data-wb-row": "true",
        ...(node.attrs.height == null ? {} : { style: `height: ${Number(node.attrs.height)}px` }),
      },
      0,
    ];
  },
});

const WbTableCell = Node.create({
  name: "wbTableCell",
  content: "wbCellBlock+",
  isolating: true,
  addAttributes() {
    return {
      colSpan: { default: null },
      rowSpan: { default: null },
      style: { default: null },
      width: { default: null },
      verticalAlign: { default: null },
      comment: commentAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "td[data-wb-cell]" }];
  },
  renderHTML({ node }) {
    return [
      "td",
      {
        "data-wb-cell": "true",
        ...(node.attrs.colSpan == null ? {} : { colspan: String(node.attrs.colSpan) }),
        ...(node.attrs.rowSpan == null ? {} : { rowspan: String(node.attrs.rowSpan) }),
        style: styleString([
          ["vertical-align", node.attrs.verticalAlign],
          ["width", typeof node.attrs.width === "number" ? `${node.attrs.width}px` : node.attrs.width],
        ]),
      },
      0,
    ];
  },
});

const WbImage = Node.create({
  name: "wbImage",
  group: "block wbCellBlock",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "" },
      width: { default: null },
      height: { default: null },
      lockAspectRatio: { default: null },
      alignment: { default: null },
      alt: { default: null },
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "img[data-wb-image]" }];
  },
  renderHTML({ node }) {
    return [
      "img",
      {
        "data-wb-image": "true",
        src: node.attrs.src ?? "",
        alt: node.attrs.alt ?? "",
        ...(node.attrs.width == null ? {} : { width: String(node.attrs.width) }),
        ...(node.attrs.height == null ? {} : { height: String(node.attrs.height) }),
        style: styleString([["display", "block"]]),
      },
    ];
  },
});

const WbList = Node.create({
  name: "wbList",
  group: "block wbCellBlock",
  content: "wbListItem+",
  defining: true,
  addAttributes() {
    return {
      style: { default: null },
      visible: visibleAttribute,
      listType: { default: null },
      bulletChar: { default: null },
      numberFormat: { default: null },
      start: { default: null },
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "div[data-wb-list]" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-wb-list": "true",
        "data-wb-list-type": node.attrs.listType ?? "bullet",
        "data-wb-style": node.attrs.style ?? undefined,
      },
      0,
    ];
  },
});

const WbListItem = Node.create({
  name: "wbListItem",
  content: "wbCellBlock+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-wb-list-item]" }];
  },
  renderHTML() {
    return ["div", { "data-wb-list-item": "true" }, 0];
  },
});

const WbPageBreak = Node.create({
  name: "wbPageBreak",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { comment: commentAttribute };
  },
  parseHTML() {
    return [{ tag: "hr[data-wb-page-break]" }];
  },
  renderHTML() {
    return ["hr", { "data-wb-page-break": "true" }];
  },
});

const WbSpreadsheet = Node.create({
  name: "wbSpreadsheet",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      sheet: { default: null },
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "div[data-wb-spreadsheet]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-wb-spreadsheet": "true" }, String(node.attrs.sheet?.name ?? "")];
  },
});

const WbCustom = Node.create({
  name: "wbCustom",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      component: { default: null },
      props: { default: null },
      visible: visibleAttribute,
      comment: commentAttribute,
      renderHints: renderHintsAttribute,
      rawBlock: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-wb-custom]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-wb-custom": "true" }, String(node.attrs.component ?? "")];
  },
});

const WbBind = Node.create({
  name: "wbBind",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      path: { default: "" },
      placeholder: { default: null },
      format: { default: null },
      mode: { default: null },
      text: { default: null },
      style: { default: null },
      fontWeight: { default: null },
      fontStyle: { default: null },
      textDecoration: { default: null },
      fontFamily: { default: null },
      fontSize: { default: null },
      color: { default: null },
      link: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-wb-bind]" }];
  },
  renderHTML({ node }) {
    return ["span", { "data-wb-bind": "true" }, `{{${String(node.attrs.path ?? "")}}}`];
  },
});

const WbInlineImage = Node.create({
  name: "wbInlineImage",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "" },
      width: { default: null },
      height: { default: null },
      lockAspectRatio: { default: null },
      alt: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-wb-inline-image]" }];
  },
  renderHTML({ node }) {
    return [
      "img",
      {
        "data-wb-inline-image": "true",
        src: node.attrs.src ?? "",
        alt: node.attrs.alt ?? "",
        ...(node.attrs.width == null ? {} : { width: String(node.attrs.width) }),
        ...(node.attrs.height == null ? {} : { height: String(node.attrs.height) }),
      },
    ];
  },
});

const WbHardBreak = Node.create({
  name: "hardBreak",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  parseHTML() {
    return [{ tag: "br" }];
  },
  renderHTML() {
    return ["br"];
  },
});

const WbText = Mark.create({
  name: "wbText",
  inclusive: true,
  addAttributes() {
    return {
      style: { default: null },
      fontWeight: { default: null },
      fontStyle: { default: null },
      textDecoration: { default: null },
      fontFamily: { default: null },
      fontSize: { default: null },
      color: { default: null },
      link: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-wb-text]" }];
  },
  renderHTML({ mark }) {
    const css = styleString([
      ["font-weight", mark.attrs.fontWeight],
      ["font-style", mark.attrs.fontStyle],
      ["text-decoration", mark.attrs.textDecoration],
      ["font-family", mark.attrs.fontFamily],
      ["font-size", mark.attrs.fontSize == null ? null : `${Number(mark.attrs.fontSize)}px`],
      ["color", mark.attrs.color],
    ]);
    return [
      "span",
      {
        "data-wb-text": "true",
        "data-wb-style": mark.attrs.style ?? undefined,
        ...(css === "" ? {} : { style: css }),
      },
      0,
    ];
  },
});

export const editorExtensions = [
  WbDocument,
  Text,
  WbParagraph,
  WbTable,
  WbTableColgroup,
  WbTableRow,
  WbTableCell,
  WbImage,
  WbList,
  WbListItem,
  WbPageBreak,
  WbSpreadsheet,
  WbCustom,
  WbBind,
  WbInlineImage,
  WbHardBreak,
  WbText,
];

/** Schema shared by the codec and the editor. */
export const editorSchema: Schema = getSchema(editorExtensions);

export {
  WbBind,
  WbCustom,
  WbDocument,
  WbHardBreak,
  WbImage,
  WbInlineImage,
  WbList,
  WbListItem,
  WbPageBreak,
  WbParagraph,
  WbSpreadsheet,
  WbTable,
  WbTableCell,
  WbTableColgroup,
  WbTableRow,
  WbText,
};
