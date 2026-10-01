import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LayoutNodeDefinition } from "../../core/types";
import { resolveLayoutSpan } from "../../core/types";
import { DeviceProvider } from "../../device";
import { FormRenderer } from "./FormRenderer";

const fields = [
  { name: "a", type: "string" as const, label: "字段A" },
  { name: "b", type: "string" as const, label: "字段B" },
  { name: "c", type: "string" as const, label: "字段C" },
];

function rowLayout(children: LayoutNodeDefinition[]): LayoutNodeDefinition[] {
  return [{ type: "row", children: children as [LayoutNodeDefinition, ...LayoutNodeDefinition[]] }];
}

function getRows(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".bf-workbook-row"));
}

function spansOf(row: Element) {
  return Array.from(row.querySelectorAll(".bf-workbook-row-item")).map(
    (item) => item.getAttribute("style")?.match(/grid-column:\s*span (\d+)/)?.[1],
  );
}

function renderForm(layout: LayoutNodeDefinition[], device: "desktop" | "tablet" | "mobile" = "desktop") {
  return render(
    <DeviceProvider device={device}>
      <FormRenderer fields={fields} layout={layout} />
    </DeviceProvider>,
  );
}

describe("resolveLayoutSpan", () => {
  it("field 缺省 span=1，声明 span 生效", () => {
    expect(resolveLayoutSpan({ type: "field", name: "a" })).toBe(1);
    expect(resolveLayoutSpan({ type: "field", name: "a", span: 3 })).toBe(3);
  });

  it("span 小于 1（非法/历史数据）防御性收敛为 1", () => {
    // SimpleForm grid 在 >12 字段时 Math.floor(12 / n) 会产出 0
    expect(resolveLayoutSpan({ type: "field", name: "a", span: 0 })).toBe(1);
    expect(resolveLayoutSpan({ type: "field", name: "a", span: -2 })).toBe(1);
  });

  it("非 field 节点固定为 1", () => {
    expect(resolveLayoutSpan({ type: "group", children: [{ type: "field", name: "a" }] })).toBe(1);
    expect(resolveLayoutSpan({ type: "html", content: "<p>x</p>" })).toBe(1);
    expect(resolveLayoutSpan({ type: "repeat", field: "a", children: [{ type: "field", name: "a" }] })).toBe(1);
  });
});

describe("LayoutRenderer row 跨列（layoutField.span）", () => {
  it("desktop 全 span:1 → 等宽，与现状一致", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a" },
        { type: "field", name: "b" },
      ]),
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("2");
    expect(row.getAttribute("style")).toContain("repeat(2, minmax(0, 1fr))");
    expect(spansOf(row)).toEqual(["1", "1"]);
  });

  it("desktop [A(1), B(2)] → 3 列，B 跨 2 列", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a" },
        { type: "field", name: "b", span: 2 },
      ]),
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("3");
    expect(row.getAttribute("style")).toContain("repeat(3, minmax(0, 1fr))");
    expect(spansOf(row)).toEqual(["1", "2"]);
  });

  it("desktop [A(2), B(1)] → 3 列，A 跨 2 列", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a", span: 2 },
        { type: "field", name: "b" },
      ]),
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("3");
    expect(spansOf(row)).toEqual(["2", "1"]);
  });

  it("desktop [A(3)] → 整行 3 列", () => {
    const { container } = renderForm(rowLayout([{ type: "field", name: "a", span: 3 }]));
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("3");
    expect(spansOf(row)).toEqual(["3"]);
  });

  it("desktop 3 个无 span 字段 → 3 列等宽（向后兼容）", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a" },
        { type: "field", name: "b" },
        { type: "field", name: "c" },
      ]),
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("3");
    expect(row.getAttribute("style")).toContain("repeat(3, minmax(0, 1fr))");
    expect(spansOf(row)).toEqual(["1", "1", "1"]);
  });

  it("mobile 单列堆叠，span 不生效（全部放大为整行）", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a" },
        { type: "field", name: "b", span: 2 },
      ]),
      "mobile",
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("1");
    expect(row.getAttribute("style")).toContain("repeat(1, minmax(0, 1fr))");
    expect(spansOf(row)).toEqual(["1", "1"]);
  });

  it("tablet 最多两列，span 收敛为 2", () => {
    const { container } = renderForm(
      rowLayout([
        { type: "field", name: "a" },
        { type: "field", name: "b", span: 2 },
        { type: "field", name: "c" },
      ]),
      "tablet",
    );
    const row = getRows(container)[0]!;
    expect(row.getAttribute("data-cols")).toBe("2");
    expect(spansOf(row)).toEqual(["1", "2", "1"]);
  });
});
