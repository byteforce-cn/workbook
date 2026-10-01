/// <reference types="vite/client" />

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentRenderer } from "../../../src/DocumentRenderer";
import { validateWorkbookDocument } from "../../../src/schema";
import type { WorkbookDefinition } from "../../../src/schema/generated-types";

type FixtureExpectation = "valid" | "invalid";

interface FixtureEntry {
  path: string;
  expectation: FixtureExpectation;
  document: unknown;
}

const fixtureModules = import.meta.glob<unknown>("./**/*.json", {
  eager: true,
  import: "default",
});

const fixtures = Object.entries(fixtureModules)
  .map<FixtureEntry | null>(([path, document]) => {
    if (path.endsWith(".valid.json")) {
      return { path, expectation: "valid", document };
    }

    if (path.endsWith(".invalid.json")) {
      return { path, expectation: "invalid", document };
    }

    return null;
  })
  .filter((entry): entry is FixtureEntry => entry != null)
  .sort((left, right) => left.path.localeCompare(right.path));

const requiredCategories = [
  "fields",
  "layout",
  "dependencies",
  "options",
  "page",
  "sheet",
  "styles",
  "hooks",
  "assets",
  "form",
] as const;

function readFixtureCategory(path: string) {
  return path.replace(/^\.\//, "").split("/")[0] ?? "";
}

function createJsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function createConformanceFetchMock() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;

    if (requestUrl === "https://workbook.example/api/cities") {
      const region = typeof requestBody?.context?.region === "string" ? requestBody.context.region : "east";
      const records = region === "west" ? [{ id: "cd", name: "成都站" }] : [{ id: "sh", name: "上海站" }];
      return createJsonResponse({ payload: { records } });
    }

    if (requestUrl === "https://workbook.example/api/paged-cities") {
      const region = typeof requestBody?.region === "string" ? requestBody.region : "east";
      const records = region === "west" ? [{ id: "cd", name: "成都分页站" }] : [{ id: "sh", name: "上海分页站" }];
      return createJsonResponse({ payload: { total: 21, records } });
    }

    if (requestUrl === "https://workbook.example/graphql") {
      const mode = typeof requestBody?.variables?.mode === "string" ? requestBody.variables.mode : "standard";
      const nodes = mode === "rush" ? [{ code: "u3", displayName: "赵六" }] : [{ code: "u1", displayName: "张三" }];
      return createJsonResponse({ data: { assignees: { nodes } } });
    }

    if (requestUrl.startsWith("https://hooks.example/")) {
      return createJsonResponse({ ok: true });
    }

    return createJsonResponse({ ok: true });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

async function assertValidFixtureBehavior(
  fixture: FixtureEntry,
  container: HTMLElement,
  fetchMock: ReturnType<typeof createConformanceFetchMock>,
) {
  if (fixture.path.endsWith("/page/complex-page-preview.valid.json")) {
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("Alice");
    return;
  }

  if (fixture.path.endsWith("/page/header-footer-page-rules.valid.json")) {
    const pages = Array.from(container.querySelectorAll("svg"));
    expect(pages).toHaveLength(2);

    const firstPageText = pages[0]?.textContent ?? "";
    const secondPageText = pages[1]?.textContent ?? "";

    expect(firstPageText).toContain("首页页眉");
    expect(firstPageText).toContain("奇数页页脚");
    expect(firstPageText).not.toContain("偶数页页眉");

    expect(secondPageText).toContain("偶数页页眉");
    expect(secondPageText).not.toContain("首页页眉");
    expect(secondPageText).not.toContain("奇数页页脚");

    const firstHeaderText = screen.getByText("首页页眉");
    const oddFooterText = screen.getByText("奇数页页脚");
    const evenHeaderText = screen.getByText("偶数页页眉");

    expect(firstHeaderText.parentElement?.style.textAlign).toBe("right");
    expect(oddFooterText.parentElement?.style.textAlign).toBe("center");
    expect(evenHeaderText.parentElement?.style.textAlign).toBe("left");
    return;
  }

  if (fixture.path.endsWith("/page/repeated-image-watermark.valid.json")) {
    const watermarkImages = Array.from(container.querySelectorAll("svg image")).filter(
      (element) => element.getAttribute("href") === "https://assets.example/watermark.png",
    );

    expect(watermarkImages.length).toBeGreaterThan(1);
    return;
  }

  if (fixture.path.endsWith("/page/image-alignment-and-alt.valid.json")) {
    const image = Array.from(container.querySelectorAll("svg image")).find(
      (element) => element.getAttribute("href") === "https://assets.example/centered-image.png",
    );

    expect(image?.getAttribute("x")).toBe("240");
    expect(image?.getAttribute("width")).toBe("120");
    expect(image?.getAttribute("height")).toBe("80");
    expect(image?.getAttribute("aria-label")).toBe("居中图片");
    return;
  }

  if (fixture.path.endsWith("/page/floating-absolute-and-percent-layout.valid.json")) {
    const floatingParagraph = screen.getByText("绝对定位浮动段落").closest("foreignObject");
    const floatingImage = Array.from(container.querySelectorAll("svg image")).find(
      (element) => element.getAttribute("href") === "https://assets.example/floating-badge.png",
    );

    expect(floatingParagraph?.getAttribute("x")).toBe("36");
    expect(floatingParagraph?.getAttribute("y")).toBe("48");
    expect(floatingParagraph?.getAttribute("width")).toBe("180");
    expect(floatingParagraph?.getAttribute("height")).toBe("64");

    expect(floatingImage?.getAttribute("x")).toBe("300");
    expect(floatingImage?.getAttribute("y")).toBe("200");
    expect(floatingImage?.getAttribute("width")).toBe("120");
    expect(floatingImage?.getAttribute("height")).toBe("80");
    return;
  }

  if (fixture.path.endsWith("/page/paragraph-list-table-fields.valid.json")) {
    const paragraphText = screen.getByText("段落字段消费");
    const paragraphHost = paragraphText.parentElement;

    expect(paragraphHost?.style.textAlign).toBe("center");
    expect(paragraphHost?.style.paddingLeft).toBe("24px");
    expect(paragraphHost?.style.marginTop).toBe("12px");
    expect(paragraphHost?.style.marginBottom).toBe("18px");
    expect(paragraphHost?.style.lineHeight).toBe("1.6");

    const orderedList = screen.getByText("第二项").closest("ol");
    expect(orderedList?.getAttribute("start")).toBe("3");
    expect(orderedList?.style.listStyleType).toBe("upper-roman");

    const bulletList = screen.getByText("自定义项目符号").closest("ul");
    expect(bulletList?.style.listStyleType).toContain("◆");

    const table = screen.getByText("宽列").closest("table");
    const row = screen.getByText("宽列").closest("tr");
    const narrowCell = screen.getByText("窄单元格").closest("td");

    expect(table?.style.width).toBe("320px");
    expect(table?.style.backgroundColor).toBe("rgb(254, 243, 199)");
    expect(table?.querySelectorAll("col")[0]?.style.width).toBe("160px");
    expect(row?.style.height).toBe("54px");
    expect(narrowCell?.style.width).toBe("80px");
    expect(narrowCell?.style.borderTopWidth).toBe("3px");
    expect(narrowCell?.style.borderTopStyle).toBe("solid");
    expect(narrowCell?.style.borderTopColor).toBe("rgb(37, 99, 235)");
    return;
  }

  if (fixture.path.endsWith("/page/page-settings-defaults.valid.json")) {
    const paragraphText = screen.getByText("默认页面样式");
    const paragraphHost = paragraphText.parentElement;
    const paragraphFrame = paragraphText.closest("foreignObject");

    expect(paragraphFrame?.getAttribute("x")).toBe("80");
    expect(paragraphFrame?.getAttribute("y")).toBe("60");
    expect(paragraphHost?.style.fontFamily).toContain("Times New Roman");
    expect(paragraphHost?.style.fontSize).toBe("17px");
    expect(paragraphHost?.style.lineHeight).toBe("1.7");
    expect(paragraphHost?.style.color).toBe("rgb(15, 23, 42)");
    return;
  }

  if (fixture.path.endsWith("/page/spreadsheet-block-embedded.valid.json")) {
    const spreadsheetFrame = container.querySelector('foreignObject[aria-label="内嵌进度表"]');

    expect(spreadsheetFrame?.getAttribute("height")).toBe("260");
    expect(spreadsheetFrame?.querySelector(".bf-workbook-sheet-view-embedded")).not.toBeNull();
    expect(spreadsheetFrame?.querySelector('[data-testid="bf-sheet-pane-corner"]')).not.toBeNull();
    return;
  }

  if (fixture.path.endsWith("/sheet/rowbind-formula-sheet.valid.json")) {
    expect(container.querySelector("canvas")).not.toBeNull();
    return;
  }

  if (fixture.path.endsWith("/sheet/frozen-panes-sheet.valid.json")) {
    const cornerPane = screen.getByTestId("bf-sheet-pane-corner");
    expect(cornerPane.querySelector("canvas")).not.toBeNull();
    expect(cornerPane.style.width).toBe("80px");
    expect(screen.getByTestId("bf-sheet-pane-top").querySelector("canvas")).not.toBeNull();
    expect(screen.getByTestId("bf-sheet-pane-left").querySelector("canvas")).not.toBeNull();
    expect(screen.getByTestId("bf-sheet-pane-body").querySelector("canvas")).not.toBeNull();
    return;
  }

  if (fixture.path.endsWith("/sheet/sheet-image-overlay.valid.json")) {
    const image = screen.getByTestId("bf-sheet-image-0") as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("https://assets.example/sheet-logo.png");
    expect(image.style.left).toBe("128px");
    expect(image.style.top).toBe("36px");
    expect(image.style.width).toBe("64px");
    expect(image.style.height).toBe("32px");
    return;
  }

  if (fixture.path.endsWith("/sheet/frozen-image-and-form-overlay.valid.json")) {
    const cornerPane = screen.getByTestId("bf-sheet-pane-corner");
    const bodyPane = screen.getByTestId("bf-sheet-pane-body");
    const cornerImage = within(cornerPane).getByTestId("bf-sheet-image-0") as HTMLImageElement;
    const bodyImage = within(bodyPane).getByTestId("bf-sheet-image-1") as HTMLImageElement;

    expect(cornerImage.getAttribute("src")).toBe("https://assets.example/sheet-logo.png");
    expect(cornerImage.style.left).toBe("8px");
    expect(cornerImage.style.top).toBe("6px");
    expect(bodyImage.style.left).toBe("105px");
    expect(bodyImage.style.top).toBe("36px");
    expect((screen.getByRole("textbox", { name: "负责人" }) as HTMLInputElement).value).toBe("王五");
    return;
  }

  if (fixture.path.endsWith("/styles/conditional-style-catalog.valid.json")) {
    const titleText = screen.getByText("样式标题");
    const titleLink = titleText.closest("a");
    const paragraphHost = titleLink?.parentElement;
    expect(paragraphHost).not.toBeNull();
    expect(paragraphHost?.style.fontFamily).toContain("Georgia");
    expect(paragraphHost?.style.fontSize).toBe("18px");
    expect(paragraphHost?.style.fontWeight).toBe("bold");
    expect(paragraphHost?.style.fontStyle).toBe("italic");
    expect(paragraphHost?.style.textDecoration).toContain("underline");
    expect(paragraphHost?.style.textAlign).toBe("right");
    expect(paragraphHost?.style.paddingLeft).toBe("32px");
    expect(paragraphHost?.style.marginTop).toBe("8px");
    expect(paragraphHost?.style.marginBottom).toBe("10px");
    expect(paragraphHost?.style.lineHeight).toBe("1.4");
    expect([
      paragraphHost?.style.color,
      paragraphHost?.getAttribute("style")?.includes("220, 38, 38") ? "rgb(220, 38, 38)" : undefined,
    ]).toContain("rgb(220, 38, 38)");

    expect(titleLink?.getAttribute("href")).toBe("https://workbook.example/style-title");
    expect(titleLink?.getAttribute("title")).toBe("打开样式标题");
    expect(titleLink?.style.fontFamily).toContain("Verdana");
    expect(titleLink?.style.fontSize).toBe("15px");
    expect(titleLink?.style.color).toBe("rgb(37, 99, 235)");
    expect(titleLink?.style.fontWeight).toBe("bold");
    expect(titleLink?.style.fontStyle).toBe("italic");
    expect(titleLink?.style.textDecoration).toContain("underline");

    const styledList = screen.getByText("样式清单项").closest("ol");
    expect(styledList?.getAttribute("start")).toBe("4");
    expect(styledList?.style.listStyleType).toBe("lower-alpha");
    expect(styledList?.style.textAlign).toBe("center");
    expect(styledList?.style.paddingLeft).toBe("40px");

    const listHost = styledList?.parentElement;
    expect(listHost?.style.fontFamily).toContain("Georgia");
    expect(listHost?.style.fontSize).toBe("15px");
    expect(listHost?.style.color).toBe("rgb(15, 118, 110)");
    expect(listHost?.style.fontWeight).toBe("bold");
    expect(listHost?.style.fontStyle).toBe("italic");
    expect(listHost?.style.textDecoration).toContain("underline");
    expect(listHost?.style.marginTop).toBe("6px");
    expect(listHost?.style.marginBottom).toBe("9px");

    const styledTable = screen.getByText("样式单元格").closest("table");
    const styledCell = screen.getByText("样式单元格").closest("td");
    expect(styledTable?.style.fontFamily).toContain("Arial");
    expect(styledTable?.style.fontSize).toBe("13px");
    expect(styledTable?.style.color).toBe("rgb(17, 24, 39)");
    expect(styledTable?.style.fontWeight).toBe("bold");
    expect(styledTable?.style.fontStyle).toBe("italic");
    expect(styledTable?.style.textDecoration).toContain("underline");
    expect(styledTable?.style.backgroundColor).toBe("rgb(236, 253, 245)");
    expect(styledCell?.getAttribute("colspan")).toBe("2");
    expect(styledCell?.style.padding).toBe("12px");
    expect(styledCell?.style.textAlign).toBe("right");
    expect(styledCell?.style.verticalAlign).toBe("bottom");
    expect(styledCell?.style.backgroundColor).toBe("rgb(254, 226, 226)");
    expect(styledCell?.style.color).toBe("rgb(153, 27, 27)");
    expect(styledCell?.style.fontFamily).toContain("Courier New");
    expect(styledCell?.style.fontSize).toBe("12px");
    expect(styledCell?.style.fontWeight).toBe("bold");
    expect(styledCell?.style.fontStyle).toBe("italic");
    expect(styledCell?.style.textDecoration).toContain("line-through");
    expect(styledCell?.style.borderTopWidth).toBe("2px");
    expect(styledCell?.style.borderRightStyle).toBe("dashed");
    expect(styledCell?.style.borderBottomStyle).toBe("dotted");
    expect(styledCell?.style.borderLeftWidth).toBe("3px");
    expect(styledCell?.style.borderLeftStyle).toBe("solid");
    expect(styledCell?.style.borderLeftColor).toBe("rgb(124, 58, 237)");
    expect(styledCell?.style.whiteSpace).toBe("nowrap");
    expect(styledCell?.style.transform).toBe("rotate(12deg)");
    return;
  }

  if (fixture.path.endsWith("/assets/asset-mapped-images.valid.json")) {
    const svgImage = container.querySelector("image");
    const inlineImage = container.querySelector("img");
    expect(svgImage?.getAttribute("href")).toBe("https://assets.example/logo.svg");
    expect(inlineImage?.getAttribute("src")).toBe("https://assets.example/badge.png");
    return;
  }

  if (fixture.path.endsWith("/hooks/onmount-and-change-hooks.valid.json")) {
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://hooks.example/on-mount");

    fireEvent.change(screen.getByRole("textbox", { name: "状态" }), { target: { value: "review" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://hooks.example/on-change");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      data: {
        status: "review",
      },
    });
    return;
  }

  if (fixture.path.endsWith("/options/url-and-graphql-remote-options.valid.json")) {
    const citySelect = screen.getByLabelText("远端城市") as HTMLSelectElement;
    const assigneeSelect = screen.getByLabelText("远端负责人") as HTMLSelectElement;

    await waitFor(() => {
      expect(citySelect.querySelector('option[value="sh"]')).not.toBeNull();
      expect(assigneeSelect.querySelector('option[value="u1"]')).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }

  if (fixture.path.endsWith("/form/readonly-form.valid.json")) {
    // 审核中只读：所有字段禁用、提交/重置按钮不渲染
    expect((screen.getByLabelText("单据编号") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("变更标题") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("发起人") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("审批状态") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /提交|submit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /重置|reset/i })).toBeNull();
    return;
  }

  if (fixture.path.endsWith("/layout/row-field-span-mixing.valid.json")) {
    // row 布局消费 layoutField.span（相对跨列）：1+1 / 1+2 / 2+1 / 3 混排
    const rows = Array.from(container.querySelectorAll(".bf-workbook-row"));
    expect(rows).toHaveLength(4);

    const spansOf = (row: Element) =>
      Array.from(row.querySelectorAll(".bf-workbook-row-item")).map(
        (item) => item.getAttribute("style")?.match(/grid-column:\s*span (\d+)/)?.[1],
      );

    // [A(1), B(1)] → 2 列等宽（基线，与无 span 一致）
    expect(rows[0]?.getAttribute("data-cols")).toBe("2");
    expect(rows[0]?.getAttribute("style")).toContain("repeat(2, minmax(0, 1fr))");
    expect(spansOf(rows[0] as Element)).toEqual(["1", "1"]);

    // [C(1), D(2)] → 3 列，D 跨 2 列
    expect(rows[1]?.getAttribute("data-cols")).toBe("3");
    expect(rows[1]?.getAttribute("style")).toContain("repeat(3, minmax(0, 1fr))");
    expect(spansOf(rows[1] as Element)).toEqual(["1", "2"]);

    // [E(2), F(1)] → 3 列，E 跨 2 列
    expect(rows[2]?.getAttribute("data-cols")).toBe("3");
    expect(spansOf(rows[2] as Element)).toEqual(["2", "1"]);

    // [G(3)] → 3 列整行
    expect(rows[3]?.getAttribute("data-cols")).toBe("3");
    expect(spansOf(rows[3] as Element)).toEqual(["3"]);

    // 全部字段完整渲染
    for (const label of ["短字段A", "短字段B", "短字段C", "宽字段D", "宽字段E", "短字段F", "整行字段G"]) {
      expect(container.textContent).toContain(label);
    }
    return;
  }

  if (fixture.path.endsWith("/options/paginated-dependent-options.valid.json")) {
    expect(fetchMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "华西" })).not.toBeNull();
    });
    fireEvent.change(screen.getByLabelText("区域"), { target: { value: "west" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "成都分页站" })).not.toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      region: "west",
      page: 1,
      pageSize: 10,
    });
  }
}

describe("workbook conformance fixtures", () => {
  it("discovers both valid and invalid fixtures", () => {
    expect(fixtures.filter((fixture) => fixture.expectation === "valid").length).toBeGreaterThan(0);
    expect(fixtures.filter((fixture) => fixture.expectation === "invalid").length).toBeGreaterThan(0);

    const validCategories = new Set(
      fixtures.filter((fixture) => fixture.expectation === "valid").map((fixture) => readFixtureCategory(fixture.path)),
    );
    const invalidCategories = new Set(
      fixtures
        .filter((fixture) => fixture.expectation === "invalid")
        .map((fixture) => readFixtureCategory(fixture.path)),
    );

    for (const category of requiredCategories) {
      expect(validCategories.has(category)).toBe(true);
      expect(invalidCategories.has(category)).toBe(true);
    }
  });

  for (const fixture of fixtures) {
    it(`${fixture.expectation}: ${fixture.path}`, async () => {
      const validation = validateWorkbookDocument(fixture.document);

      if (fixture.expectation === "invalid") {
        expect(validation.valid).toBe(false);
        return;
      }

      expect(validation.valid).toBe(true);
      const fetchMock = createConformanceFetchMock();
      let container: HTMLElement | undefined;

      let thrownError: unknown;
      await act(async () => {
        try {
          container = render(
            <DocumentRenderer workbook={structuredClone(fixture.document as WorkbookDefinition)} />,
          ).container;
        } catch (error) {
          thrownError = error;
        }

        await Promise.resolve();
      });

      expect(thrownError).toBeUndefined();
      expect(container).toBeDefined();
      await assertValidFixtureBehavior(fixture, container as HTMLElement, fetchMock);
    });
  }
});
