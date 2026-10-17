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

  // Regression for #23: formulas used to be evaluated with `new Function`, which
  // a strict `script-src 'self'` CSP blocks (the cell then showed its raw text).
  it("evaluates arithmetic without runtime code generation", () => {
    const value = (formula: string) => resolveSheetCellDisplayValue({ column: 0, formula }, {});

    expect(value("=1+2*3")).toBe("7");
    expect(value("=(1+2)*3")).toBe("9");
    expect(value("=10/4")).toBe("2.5");
    expect(value("=10-2-3")).toBe("5");
    expect(value("=2**3**2")).toBe("512");
    expect(value("=." + "5*4")).toBe("2");
    expect(value("=1 +\n 2")).toBe("3");
    // JS semantics are preserved for the interesting corner cases.
    expect(value("=1/0")).toBe("Infinity");
    expect(value("=0/0")).toBe("NaN");
    // Malformed or non-arithmetic input still falls back to the raw formula.
    expect(value("=1+")).toBe("=1+");
    expect(value("=1//2")).toBe("=1//2");
    expect(value("=A1")).toBe("=A1");
  });
});
