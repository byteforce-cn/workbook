import { describe, expect, it } from "vitest";
import type { Border } from "../../schema/generated-types";
import { formatBorder, resolveBorderParts } from "./tableBorders";

describe("table border resolution", () => {
  it("defaults to a 1px solid #d1d5db border", () => {
    expect(resolveBorderParts(undefined, undefined, undefined)).toEqual({
      width: 1,
      style: "solid",
      color: "#d1d5db",
    });
  });

  it("uses the table style's width and colour when no cell border is authored", () => {
    expect(resolveBorderParts(undefined, 2, "#94a3b8")).toEqual({ width: 2, style: "solid", color: "#94a3b8" });
  });

  it("maps authored border styles onto width and line style", () => {
    expect(resolveBorderParts({ style: "none" }, 1, "#000")).toEqual({ width: 0, style: "none", color: "#000" });
    expect(resolveBorderParts({ style: "medium", color: "#111" }, 1, "#000")).toEqual({
      width: 2,
      style: "solid",
      color: "#111",
    });
    expect(resolveBorderParts({ style: "thick" }, 1, "#000")).toEqual({ width: 3, style: "solid", color: "#000" });
    expect(resolveBorderParts({ style: "dashed" }, 1, "#000")).toEqual({ width: 1, style: "dashed", color: "#000" });
    expect(resolveBorderParts({ style: "dotted" }, 1, "#000")).toEqual({ width: 1, style: "dotted", color: "#000" });
  });

  it("formats a border for CSS", () => {
    expect(formatBorder({ width: 2, style: "dashed", color: "#94a3b8" })).toBe("2px dashed #94a3b8");
  });

  it("accepts the schema's Border shape", () => {
    const border: Border = { style: "medium", color: "#123456" };
    expect(resolveBorderParts(border, 1, "#000").color).toBe("#123456");
  });
});
