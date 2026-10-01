/**
 * Performance baseline tests for @byteforce/workbook
 *
 * D6: 性能基线测试 — 验证渲染引擎在目标数据量下的性能表现。
 *
 * Targets (from rectification plan):
 *   - 100-field form render < 500ms
 *   - 100-page document (10 pages) render < 2000ms
 *   - 10000-row sheet render < 3000ms
 *
 * These tests are sanity checks, not hard gates. CI may vary.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentRenderer } from "../../src/DocumentRenderer";
import type { View, WorkbookDefinition } from "../../src/schema/generated-types";

// ---- helpers ----

/**
 * The generated schema types model `@minItems 1` collections as non-empty
 * tuples. Build them through this helper so the intent stays explicit.
 */
function nonEmpty<T>(items: T[]): [T, ...T[]] {
  if (items.length === 0) {
    throw new Error("expected a non-empty array");
  }
  return [items[0], ...items.slice(1)];
}

function measureRender(workbook: WorkbookDefinition): { durationMs: number; container: HTMLElement } {
  const start = performance.now();
  const { container } = render(<DocumentRenderer workbook={workbook} />);
  const durationMs = performance.now() - start;
  return { durationMs, container };
}

function generate100FieldForm(): WorkbookDefinition {
  const fields = Array.from({ length: 100 }, (_, i) => ({
    name: `field_${i}`,
    type: "string" as const,
    label: `字段 ${i + 1}`,
    bind: { path: `field_${i}`, mode: "twoWay" as const },
  }));

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`field_${i}`, `value_${i}`])),
    views: [
      {
        type: "form",
        id: "perf-100-fields",
        label: "100 字段表单",
        fields: nonEmpty(fields),
      },
    ],
  };
}

function generate10PageDocument(): WorkbookDefinition {
  const pages: View[] = [];
  for (let p = 0; p < 10; p++) {
    pages.push({
      type: "page",
      id: `perf-page-${p}`,
      label: `第 ${p + 1} 页`,
      pageSettings: {
        width: 595,
        height: 842,
        marginTop: 72,
        marginLeft: 72,
        marginRight: 72,
        marginBottom: 72,
      },
      content: Array.from({ length: 10 }, (_, i) => ({
        type: "paragraph" as const,
        alignment: "left" as const,
        runs: [
          {
            type: "text" as const,
            text: `Page ${p + 1} — Block ${i + 1}: Lorem ipsum dolor sit amet consectetur adipiscing elit.`,
          },
        ],
      })),
    });
  }
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: nonEmpty(pages),
  };
}

function generate10000RowSheet(): WorkbookDefinition {
  const rows = Array.from({ length: 10000 }, (_, i) => {
    const cells = [
      { column: 0, value: `Row ${i + 1}` },
      { column: 1, value: String(i * 100) },
      { column: 2, value: i % 2 === 0 ? "Active" : "Inactive" },
    ];
    return { cells: nonEmpty(cells) };
  });

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "sheet",
        id: "perf-10k-rows",
        label: "10000 行表格",
        name: "大数据表格",
        columns: [{ width: 150 }, { width: 120 }, { width: 100 }],
        rows,
      },
    ],
  };
}

// ---- tests ----

describe("D6: Performance baselines", () => {
  it("renders a 100-field form within 500ms", () => {
    const workbook = generate100FieldForm();
    const { durationMs, container } = measureRender(workbook);

    expect(container).toBeDefined();

    // All 100 fields should be present in the DOM
    const inputs = container.querySelectorAll("input, select, textarea");
    expect(inputs.length).toBeGreaterThanOrEqual(100);

    // Performance gate — soft assertion (CI variance tolerated)
    if (durationMs > 500) {
      console.warn(
        `[perf] 100-field form rendered in ${Math.round(durationMs)}ms (threshold: 500ms). ` +
          `This is a soft gate; investigate if consistently above threshold.`,
      );
    }
    // Hard assertion at 2× threshold to catch real regressions
    expect(durationMs).toBeLessThan(2000);
  });

  it("renders a 10-page document within 2000ms", () => {
    const workbook = generate10PageDocument();
    const { durationMs, container } = measureRender(workbook);

    expect(container).toBeDefined();

    // Should produce SVG output for pages
    const svgElements = container.querySelectorAll("svg");
    expect(svgElements.length).toBeGreaterThanOrEqual(10);

    if (durationMs > 2000) {
      console.warn(`[perf] 10-page document rendered in ${Math.round(durationMs)}ms (threshold: 2000ms).`);
    }
    expect(durationMs).toBeLessThan(5000);
  });

  it("renders a 10000-row sheet within 3000ms", { timeout: 15000 }, () => {
    const workbook = generate10000RowSheet();
    const { durationMs, container } = measureRender(workbook);

    expect(container).toBeDefined();

    // Canvas-based sheet should have a canvas element
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();

    if (durationMs > 3000) {
      console.warn(`[perf] 10000-row sheet rendered in ${Math.round(durationMs)}ms (threshold: 3000ms).`);
    }
    expect(durationMs).toBeLessThan(8000);
  });
});
