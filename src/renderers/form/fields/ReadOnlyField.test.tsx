import { describe, expect, it } from "vitest";

import type { WorkbookOption } from "../../../react/registry";
import { formatReadOnlyValue } from "./ReadOnlyField";

const texts = { emptyText: "—", trueText: "是", falseText: "否" };

describe("formatReadOnlyValue", () => {
  it("renders empty values as the placeholder", () => {
    for (const value of [null, undefined, "", []]) {
      expect(formatReadOnlyValue(value, texts)).toEqual({ text: "—", empty: true });
    }
  });

  it("renders booleans through the configured texts", () => {
    expect(formatReadOnlyValue(true, texts)).toEqual({ text: "是", empty: false });
    expect(formatReadOnlyValue(false, texts)).toEqual({ text: "否", empty: false });
  });

  it("maps stored option values onto their labels", () => {
    const options: WorkbookOption[] = [
      { value: "a1", label: "管理员" },
      { value: 2, label: "第二部门" },
    ];

    expect(formatReadOnlyValue("a1", texts, options)).toEqual({ text: "管理员", empty: false });
    expect(formatReadOnlyValue(2, texts, options)).toEqual({ text: "第二部门", empty: false });
    // Unknown values fall back to the raw value instead of disappearing.
    expect(formatReadOnlyValue("a9", texts, options)).toEqual({ text: "a9", empty: false });
  });

  it("joins arrays and drops empty entries", () => {
    expect(formatReadOnlyValue(["甲", "乙"], texts)).toEqual({ text: "甲, 乙", empty: false });
    expect(formatReadOnlyValue(["甲", ""], texts)).toEqual({ text: "甲", empty: false });
    expect(formatReadOnlyValue([], texts)).toEqual({ text: "—", empty: true });
  });

  it("falls back to JSON for nested objects", () => {
    expect(formatReadOnlyValue({ a: 1 }, texts)).toEqual({ text: '{"a":1}', empty: false });
  });

  it("keeps 0 and false as values, not as empty", () => {
    expect(formatReadOnlyValue(0, texts)).toEqual({ text: "0", empty: false });
    expect(formatReadOnlyValue(false, texts)).toEqual({ text: "否", empty: false });
  });
});
