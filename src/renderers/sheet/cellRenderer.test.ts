import { describe, expect, it } from "vitest";

import { resolveSheetCellDisplayValue } from "./cellRenderer";

describe("resolveSheetCellDisplayValue", () => {
  it("applies sheet cell format after resolving literal values", () => {
    expect(resolveSheetCellDisplayValue({ column: 0, value: "  待处理  ", format: "trim" }, {})).toBe("待处理");
  });

  it("evaluates formulas with cell references and aggregate ranges", () => {
    const formulaContext = {
      getCellValue(address: string) {
        return { A1: 2, B1: 3, C1: 4 }[address as "A1" | "B1" | "C1"];
      },
      getRangeValues(startAddress: string, endAddress: string) {
        expect(startAddress).toBe("A1");
        expect(endAddress).toBe("C1");
        return [2, 3, 4];
      },
    };

    expect(
      resolveSheetCellDisplayValue(
        { column: 3, formula: "=SUM(A1:C1) + C1" },
        {},
        undefined,
        undefined,
        formulaContext,
      ),
    ).toBe("13");
    expect(
      resolveSheetCellDisplayValue({ column: 3, formula: "=AVG(A1:C1)" }, {}, undefined, undefined, formulaContext),
    ).toBe("3");
  });
});
