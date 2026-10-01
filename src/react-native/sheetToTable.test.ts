/**
 * sheetToTable 纯函数单测：验证嵌入式台账的行源物化、单元格文本解析与隐藏列重映射。
 */

import { describe, expect, it } from "vitest";

import type { PageBlockDefinition, WorkbookData } from "../core/types";
import { buildSpreadsheetTableBlock, materializeSpreadsheetRows, resolveSpreadsheetCellText } from "./sheetToTable";

type SpreadsheetBlockDefinition = Extract<PageBlockDefinition, { type: "spreadsheet" }>;

const baseSheet = {
  name: "变更明细",
  columns: [{ width: 48 }, { width: 120 }, { width: 64 }, { width: 200 }],
} as SpreadsheetBlockDefinition["sheet"];

describe("materializeSpreadsheetRows", () => {
  it("无 rowBind 时使用静态 rows", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      ...baseSheet,
      rows: [{ cells: [{ column: 0, value: "a" }] }],
    };
    const sources = materializeSpreadsheetRows(sheet, {});

    expect(sources).toHaveLength(1);
    expect(sources[0].rowContext).toBeUndefined();
    expect(sources[0].row.cells?.[0]).toMatchObject({ column: 0, value: "a" });
  });

  it("rowBind 物化数据数组并按 cellMapping 生成行", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      ...baseSheet,
      rowBind: {
        path: "change_items",
        rowTemplate: {
          cellMapping: {
            "0": { bind: { path: "change_items[*].item_no" } },
            "1": { bind: { path: "change_items[*].location" } },
          },
        },
      },
    };
    const data: WorkbookData = {
      change_items: [
        { item_no: 1, location: "A 栋" },
        { item_no: 2, location: "B 栋" },
      ],
    };
    const sources = materializeSpreadsheetRows(sheet, data);

    expect(sources).toHaveLength(2);
    expect(sources[1].rowContext).toMatchObject({ index: 1, path: "change_items" });
    expect(sources[1].row.cells).toHaveLength(2);
    expect(sources[1].row.cells?.[0]).toMatchObject({ column: 0 });
  });

  it("rowBind 源非数组时返回空", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      ...baseSheet,
      rowBind: { path: "missing" },
    };
    expect(materializeSpreadsheetRows(sheet, {})).toEqual([]);
  });
});

describe("resolveSpreadsheetCellText", () => {
  it("value 优先于 bind", () => {
    const cell = { column: 0, value: 12, bind: { path: "x" } };
    expect(resolveSpreadsheetCellText(cell, {})).toBe("12");
  });

  it("bind 经 rowContext 解析数组元素", () => {
    const cell = { column: 0, bind: { path: "items[*].name" } };
    const items = [{ name: "甲" }, { name: "乙" }];
    const data: WorkbookData = { items };
    expect(resolveSpreadsheetCellText(cell, data, { index: 1, path: "items", item: items[1] })).toBe("乙");
  });

  it("formula 原样显示（计算留 Web 端）", () => {
    const cell = { column: 0, formula: "SUM(A1:A3)" };
    expect(resolveSpreadsheetCellText(cell, {})).toBe("=SUM(A1:A3)");
  });

  it("无 value/bind/formula 时为空串", () => {
    expect(resolveSpreadsheetCellText({ column: 0 }, {})).toBe("");
  });
});

describe("buildSpreadsheetTableBlock", () => {
  it("静态 rows → table block（段落文本单元格）", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      ...baseSheet,
      rows: [
        {
          cells: [
            { column: 0, value: "1" },
            { column: 1, value: "A 栋" },
          ],
        },
      ],
    };
    const table = buildSpreadsheetTableBlock(sheet, {});

    expect(table.type).toBe("table");
    expect(table.columns).toEqual([48, 120, 64, 200]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].cells).toHaveLength(2);
    expect(table.rows[0].cells[1].content[0]).toMatchObject({
      type: "paragraph",
      runs: [{ type: "text", text: "A 栋" }],
    });
  });

  it("rowBind 动态行 → 单元格文本为绑定解析结果", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      ...baseSheet,
      rowBind: {
        path: "change_items",
        rowTemplate: {
          cellMapping: {
            "0": { bind: { path: "change_items[*].item_no" } },
            "1": { bind: { path: "change_items[*].location" } },
          },
        },
      },
    };
    const data: WorkbookData = {
      change_items: [
        { item_no: 1, location: "A 栋" },
        { item_no: 2, location: "B 栋" },
      ],
    };
    const table = buildSpreadsheetTableBlock(sheet, data);

    expect(table.rows).toHaveLength(2);
    expect(table.rows[1].cells[0].content[0]).toMatchObject({ runs: [{ type: "text", text: "2" }] });
    expect(table.rows[1].cells[1].content[0]).toMatchObject({ runs: [{ type: "text", text: "B 栋" }] });
  });

  it("隐藏列剔除并重映射列号，空隙补 blank 单元格", () => {
    const sheet: SpreadsheetBlockDefinition["sheet"] = {
      name: "台账",
      columns: [{ width: 48 }, { width: 120, hidden: true }, { width: 64 }],
      rows: [
        {
          cells: [
            { column: 0, value: "a" },
            { column: 2, value: "c" },
          ],
        },
      ],
    };
    const table = buildSpreadsheetTableBlock(sheet, {});

    expect(table.columns).toEqual([48, 64]);
    expect(table.rows[0].cells).toHaveLength(2);
    expect(table.rows[0].cells[0].content[0]).toMatchObject({ runs: [{ type: "text", text: "a" }] });
    expect(table.rows[0].cells[1].content[0]).toMatchObject({ runs: [{ type: "text", text: "c" }] });
  });
});
