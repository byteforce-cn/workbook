import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { basicWorkbookFixture } from "../tests/fixtures/integration/basicWorkbook";
import { DocumentRenderer } from "./DocumentRenderer";
import { PluginProvider } from "./react/PluginProvider";
import { createPluginRegistry } from "./react/registry";
import type { WorkbookDefinition } from "./schema/generated-types";

function createJsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentRenderer", () => {
  it("keeps form edits and page preview in sync through shared data", async () => {
    render(<DocumentRenderer workbook={basicWorkbookFixture} />);

    const input = screen.getByLabelText("客户姓名") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Bob" } });

    await waitFor(() => {
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    });
  });

  it("renders sheet canvas for sheet views", () => {
    const { container } = render(<DocumentRenderer workbook={basicWorkbookFixture} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("honors remote option fetchOnMount, dependsOn, and searchDebounce", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      createJsonResponse({
        payload: {
          records: [{ id: "cd", name: "成都站" }],
        },
      }),
    );
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {
        region: "east",
      },
      views: [
        {
          type: "form",
          fields: [
            {
              name: "region",
              label: "区域",
              type: "select",
              options: [
                { value: "east", label: "东区" },
                { value: "west", label: "西区" },
              ],
            },
            {
              name: "city",
              label: "城市",
              type: "select",
              options: {
                type: "url",
                endpoint: "https://workbook.example/api/cities",
                method: "POST",
                params: {
                  region: { $field: "region" },
                },
                dataPath: "payload.records",
                valueKey: "id",
                labelKey: "name",
                dependsOn: ["region"],
                fetchOnMount: false,
                searchDebounce: 10,
              },
            },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} />);

    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "西区" })).not.toBeNull();
    });
    fireEvent.change(screen.getByLabelText("区域"), { target: { value: "west" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "成都站" })).not.toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toEqual({ region: "west" });
  });

  it("passes bound values into custom registry fields and keeps writeback working", async () => {
    const registry = createPluginRegistry();
    registry.field.set("storybook/status-picker", ({ value, onChange, onBlur }) => (
      <button
        type="button"
        onClick={() => {
          onChange("approved");
          onBlur();
        }}
      >
        当前状态：{String(value ?? "")}
      </button>
    ));

    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {
        status: "reviewing",
      },
      views: [
        {
          type: "form",
          fields: [
            {
              name: "status",
              type: "custom",
              label: "状态",
              component: "storybook/status-picker",
              bind: { path: "status", mode: "twoWay" },
            },
          ],
        },
        {
          type: "page",
          pageSettings: { width: 240, height: 160, marginTop: 24, marginRight: 24, marginBottom: 24, marginLeft: 24 },
          content: [{ type: "paragraph", runs: [{ type: "text", bind: { path: "status", mode: "oneWay" } }] }],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} registry={registry} />);

    const statusButton = screen.getByRole("button", { name: "当前状态：reviewing" });
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getAllByText(/approved/).length).toBeGreaterThan(0);
    });
  });

  it("renders array fields with tags widget as a tag selector instead of JSON textarea", async () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {
        tags: ["验收"],
      },
      views: [
        {
          type: "form",
          fields: [
            {
              name: "tags",
              type: "array",
              label: "交付标签",
              bind: { path: "tags", mode: "twoWay" },
              props: {
                widget: "tags",
                suggestions: ["验收", "打印", "台账"],
              },
            },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} />);

    expect(screen.queryByDisplayValue(/\[\s*"验收"/)).toBeNull();
    expect(screen.getByText("验收")).toBeTruthy();

    const input = screen.getByRole("combobox", { name: "新增交付标签" });
    fireEvent.change(input, { target: { value: "打印" } });
    fireEvent.click(screen.getByRole("button", { name: "添加交付标签" }));

    await waitFor(() => {
      expect(screen.getByText("打印")).toBeTruthy();
    });
  });

  it("lets table cell content inherit table and cell typography defaults", () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      styles: {
        tableStyles: {
          compact: { fontSize: 10, color: "#172033", cellPadding: 6 },
        },
        cellStyles: {
          quiet: { fontSize: 11, color: "#475569" },
        },
      },
      views: [
        {
          type: "page",
          pageSettings: {
            width: 320,
            height: 180,
            marginTop: 24,
            marginRight: 24,
            marginBottom: 24,
            marginLeft: 24,
            defaultFontSize: 18,
          },
          content: [
            {
              type: "table",
              style: "compact",
              columns: [120],
              rows: [
                {
                  cells: [
                    { style: "quiet", content: [{ type: "paragraph", runs: [{ type: "text", text: "表格内容" }] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} />);

    const paragraph = screen.getByText("表格内容").parentElement;
    expect(paragraph?.style.fontSize).toBe("11px");
    expect(paragraph?.style.color).toBe("rgb(71, 85, 105)");
  });

  it("supports block-level style fallback for page headers", () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      styles: {
        paragraphStyles: {
          pageHeader: { fontSize: 18, color: "#1d4ed8", fontWeight: "bold" },
        },
      },
      views: [
        {
          type: "page",
          pageSettings: { width: 320, height: 180, marginTop: 48, marginRight: 24, marginBottom: 24, marginLeft: 24 },
          content: [
            {
              type: "header",
              style: "pageHeader",
              content: [{ type: "paragraph", runs: [{ type: "text", text: "独立页眉" }] }],
            },
            { type: "paragraph", runs: [{ type: "text", text: "正文" }] },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} />);

    const headerParagraph = screen.getByText("独立页眉").parentElement;
    expect(headerParagraph?.style.fontSize).toBe("18px");
    expect(headerParagraph?.style.color).toBe("rgb(29, 78, 216)");
  });

  it("renders children inside custom layout plugins", () => {
    const registry = createPluginRegistry();
    registry.layout.set("storybook/card", ({ node, children }) => {
      const customNode = node as { props?: { title?: unknown } };
      return (
        <section data-testid="story-card">
          <h3>卡片：{String(customNode.props?.title ?? "")}</h3>
          {children}
        </section>
      );
    });

    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: { owner: "李雷" },
      views: [
        {
          type: "form",
          fields: [
            {
              name: "owner",
              type: "string",
              label: "负责人",
              bind: { path: "owner", mode: "twoWay" },
            },
          ],
          layout: [
            {
              type: "custom",
              component: "storybook/card",
              props: { title: "交付卡片" },
              children: [{ type: "field", name: "owner" }],
            },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} registry={registry} />);

    const card = screen.getByTestId("story-card");
    expect(card.querySelector("h3")?.textContent).toBe("卡片：交付卡片");
    // children 由渲染器递归渲染，自定义布局内的字段可见
    expect(screen.getByLabelText("负责人")).toBeTruthy();
  });

  it("falls back to a placeholder when a custom layout plugin is unregistered", () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      views: [
        {
          type: "form",
          fields: [{ name: "owner", type: "string", label: "负责人", bind: { path: "owner", mode: "twoWay" } }],
          layout: [{ type: "custom", component: "missing-layout", children: [{ type: "field", name: "owner" }] }],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} />);

    expect(screen.getByText("未注册自定义布局：missing-layout")).toBeTruthy();
  });

  it("validates the new value on change (validateMode=onChange)", async () => {
    const registry = createPluginRegistry();
    registry.validation.set("storybook/id-card", ({ value }) => {
      if (typeof value !== "string" || value === "") return undefined;
      return /^\d{17}[\dXx]$/.test(value) ? undefined : "身份证号必须为 18 位";
    });

    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: { idCard: "" },
      views: [
        {
          type: "form",
          config: { validateMode: "onChange" },
          fields: [
            {
              name: "idCard",
              type: "string",
              label: "身份证号",
              bind: { path: "idCard", mode: "twoWay" },
              validations: [{ type: "storybook/id-card", message: "身份证号不合法" }],
            },
          ],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} registry={registry} />);

    const input = screen.getByLabelText("身份证号") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123" } });

    await waitFor(() => {
      expect(screen.getByText("身份证号必须为 18 位")).toBeTruthy();
    });
  });

  it("resolves custom fields from a <PluginProvider> context when no registry prop is passed", () => {
    const registry = createPluginRegistry();
    registry.field.set("storybook/provider-field", () => <div>来自 PluginProvider 的字段</div>);

    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      views: [
        {
          type: "form",
          fields: [
            {
              name: "note",
              type: "custom",
              label: "备注",
              component: "storybook/provider-field",
            },
          ],
        },
      ],
    };

    render(
      <PluginProvider registry={registry}>
        <DocumentRenderer workbook={workbook} />
      </PluginProvider>,
    );

    expect(screen.getByText("来自 PluginProvider 的字段")).toBeTruthy();
    expect(screen.queryByText("未注册自定义字段：storybook/provider-field")).toBeNull();
  });

  it("keeps the registry prop as highest precedence over PluginProvider context", () => {
    const propRegistry = createPluginRegistry();
    propRegistry.field.set("storybook/picker", () => <div>prop 字段</div>);

    const contextRegistry = createPluginRegistry();
    contextRegistry.field.set("storybook/picker", () => <div>context 字段</div>);

    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: {},
      views: [
        {
          type: "form",
          fields: [
            {
              name: "note",
              type: "custom",
              label: "备注",
              component: "storybook/picker",
            },
          ],
        },
      ],
    };

    render(
      <PluginProvider registry={contextRegistry}>
        <DocumentRenderer workbook={workbook} registry={propRegistry} />
      </PluginProvider>,
    );

    expect(screen.getByText("prop 字段")).toBeTruthy();
    expect(screen.queryByText("context 字段")).toBeNull();
  });
});
