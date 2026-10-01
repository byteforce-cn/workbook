/**
 * RN page 视图数据路径集成测试
 *
 * 使用与真实业务样张（工程变更单）结构一致的 page 视图，验证：
 *  - AJV schema 校验通过（minItems / required / enum 等类型系统之外的限制）；
 *  - layoutPageView 正确分页（page-break）并挂载页眉/页脚/水印（overlay 块）；
 *  - spreadsheet 块 rowBind 台账按数据数组物化行（RNPageView 渲染数据源）。
 *
 * 不渲染 RN 组件（jsdom 无 react-native），仅验证 RN 文档渲染器依赖的
 * 纯数据路径；组件层由 RN 示例应用与真机验证。
 */

import { describe, expect, it } from "vitest";
import type { PageViewDefinition } from "../core/types";
import { layoutPageView } from "../renderers/page/pageLayout";
import { validateWorkbookDocument } from "../schema";
import type { WorkbookDefinition } from "../schema/generated-types";
import { buildSpreadsheetTableBlock } from "./sheetToTable";

const data: WorkbookDefinition["data"] = {
  doc_no: "CR-2026-0012",
  project_name: "科技园二期幕墙工程",
  change_title: "南立面三层单元板块尺寸调整",
  change_category: "设计变更",
  urgency: "一般",
  proposer: "张伟",
  propose_date: "2026-08-05",
  change_items: [
    { item_no: 1, location: "A 栋南立面", major: "幕墙", item_desc: "三层单元板块尺寸调整", quantity: 12, unit: "块" },
    { item_no: 2, location: "B 栋北立面", major: "幕墙", item_desc: "二层玻璃幕墙分隔调整", quantity: 8, unit: "块" },
  ],
  review_opinions: "",
};

const pageView: PageViewDefinition = {
  type: "page",
  id: "change_request-doc",
  label: "变更单文档",
  pageSettings: {
    width: 794,
    height: 1123,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
    defaultFontSize: 12,
    defaultLineHeight: 1.5,
    defaultColor: "#111827",
  },
  content: [
    {
      type: "header",
      alignment: "center",
      content: [
        {
          type: "paragraph",
          runs: [
            { type: "text", text: "工程变更申请单  " },
            { type: "text", bind: { path: "doc_no" }, fontWeight: "bold" },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      alignment: "center",
      spaceAfter: 16,
      runs: [{ type: "text", bind: { path: "project_name" }, fontWeight: "bold", fontSize: 15 }],
    },
    {
      type: "paragraph",
      runs: [
        { type: "text", text: "变更标题：" },
        { type: "text", bind: { path: "change_title" } },
      ],
    },
    {
      type: "table",
      columns: [130, 195, 130, 195],
      rows: [
        {
          cells: [
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "工程名称" }] }] },
            { content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "project_name" } }] }] },
            { content: [{ type: "paragraph", runs: [{ type: "text", text: "变更类别" }] }] },
            { content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "change_category" } }] }] },
          ],
        },
      ],
    },
    {
      type: "spreadsheet",
      sheet: {
        name: "变更明细",
        columns: [{ width: 48 }, { width: 110 }, { width: 60 }, { width: 210 }, { width: 60 }, { width: 48 }],
        rowBind: {
          path: "change_items",
          rowTemplate: {
            cellMapping: {
              "0": { bind: { path: "change_items[*].item_no" } },
              "1": { bind: { path: "change_items[*].location" } },
              "3": { bind: { path: "change_items[*].item_desc" } },
              "4": { bind: { path: "change_items[*].quantity" } },
            },
          },
        },
      },
      renderHints: { height: 150 },
    },
    { type: "page-break" },
    {
      type: "list",
      listType: "bullet",
      items: [
        [{ type: "paragraph", runs: [{ type: "text", text: "列表项一" }] }],
        [{ type: "paragraph", runs: [{ type: "text", text: "列表项二" }] }],
      ],
    },
    {
      type: "footer",
      alignment: "center",
      content: [{ type: "paragraph", runs: [{ type: "text", text: "页脚预览" }] }],
    },
    { type: "watermark", text: "草稿", color: "#9ca3af", opacity: 0.12, rotation: -30, repeat: true },
  ],
};

const workbook: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data,
  views: [pageView],
};

describe("RN page 视图数据路径", () => {
  it("page 视图通过 AJV schema 校验", () => {
    const result = validateWorkbookDocument(workbook);
    expect(result.valid, JSON.stringify(result.errors)).toBe(true);
  });

  it("layoutPageView 按 page-break 分页并挂载页眉/页脚/水印", () => {
    const layout = layoutPageView(pageView, { data });

    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    expect(layout.pages[0].headerBlocks.length).toBeGreaterThan(0);
    expect(layout.pages[0].footerBlocks.length).toBeGreaterThan(0);
    expect(layout.pages[0].watermarkBlocks.length).toBeGreaterThan(0);
    // 信息表格与嵌入式台账进入流式块
    expect(layout.pages[0].flowBlocks.some(({ block }) => block.type === "table")).toBe(true);
    expect(layout.pages[0].flowBlocks.some(({ block }) => block.type === "spreadsheet")).toBe(true);
  });

  it("spreadsheet 块 rowBind 按数据数组物化台账行", () => {
    const spreadsheet = pageView.content.find(
      (block): block is Extract<PageViewDefinition["content"][number], { type: "spreadsheet" }> =>
        block.type === "spreadsheet",
    );
    expect(spreadsheet).toBeDefined();
    const table = buildSpreadsheetTableBlock(spreadsheet!.sheet, data);

    expect(table.rows).toHaveLength(2);
    expect(table.columns).toEqual([48, 110, 60, 210, 60, 48]);
    // 第一行：序号 / 部位 / 变更内容 / 数量（column 3 有 bind，column 2 缺 cellMapping 应为空白占位）
    expect(table.rows[0].cells[0].content[0]).toMatchObject({ runs: [{ type: "text", text: "1" }] });
    expect(table.rows[0].cells[1].content[0]).toMatchObject({ runs: [{ type: "text", text: "A 栋南立面" }] });
    expect(table.rows[0].cells[2].content[0]).toMatchObject({ runs: [{ type: "text", text: "" }] });
    expect(table.rows[0].cells[3].content[0]).toMatchObject({ runs: [{ type: "text", text: "三层单元板块尺寸调整" }] });
    expect(table.rows[0].cells[4].content[0]).toMatchObject({ runs: [{ type: "text", text: "12" }] });
  });

  it("信息表格单元格 bind 经数据解析", () => {
    const tableBlock = pageView.content.find(
      (block): block is Extract<PageViewDefinition["content"][number], { type: "table" }> => block.type === "table",
    );
    expect(tableBlock).toBeDefined();
    const secondCell = tableBlock!.rows[0].cells[1].content[0];
    expect(secondCell).toMatchObject({ runs: [{ type: "text", bind: { path: "project_name" } }] });
  });
});
