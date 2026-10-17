import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookDefinition } from "../../schema/generated-types";
import { FormRenderer } from "./FormRenderer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function makeWorkbook(
  overrides: Partial<WorkbookDefinition> = {},
  config: Record<string, unknown> = {},
): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { username: "alice", memo: "待审", role: "admin" },
    views: [
      {
        type: "form",
        id: "test-form",
        label: "变更申请",
        fields: [
          { name: "username", type: "string", label: "用户名" },
          { name: "memo", type: "textarea", label: "说明" },
          { name: "role", type: "select", label: "角色", options: [{ value: "admin", label: "管理员" }] },
        ],
        layout: [
          { type: "field", name: "username" },
          { type: "field", name: "memo" },
          { type: "field", name: "role" },
        ],
        config,
      },
      {
        type: "page",
        id: "test-page",
        pageSettings: { width: 595, height: 842 },
        content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
      },
    ],
    ...overrides,
  };
}

describe("FormView config.readOnly — 审核中表单只读", () => {
  it("readOnly: true 时所有字段均被禁用", () => {
    render(<DocumentRenderer workbook={makeWorkbook({}, { readOnly: true })} activeViewId="test-form" />);

    expect((screen.getByLabelText("用户名") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("说明") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByLabelText("角色") as HTMLSelectElement).disabled).toBe(true);
  });

  it('readOnlyDisplay: "text" 渲染标签 + 值，不产生任何输入控件', () => {
    const { container } = render(
      <DocumentRenderer
        workbook={makeWorkbook({}, { readOnly: true, readOnlyDisplay: "text" })}
        activeViewId="test-form"
      />,
    );

    // 验收标准（#27）：DOM 中没有 input / select / textarea
    expect(container.querySelectorAll("input, select, textarea")).toHaveLength(0);

    // 值正确呈现：普通文本原样，select 显示选项 label（而非存储值 admin）
    expect(screen.getByText("用户名").parentElement?.textContent).toContain("alice");
    expect(screen.getByText("角色").parentElement?.textContent).toContain("管理员");
    expect(screen.queryByText("admin")).toBeNull();
  });

  it('readOnlyDisplay: "text" 空值走占位', () => {
    const workbook = makeWorkbook({}, { readOnly: true, readOnlyDisplay: "text" });
    const view = workbook.views[0];
    (view as { fields: unknown[] }).fields.push({ name: "remark", type: "string", label: "备注" });
    (view as { layout: unknown[] }).layout.push({ type: "field", name: "remark" });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    const remark = screen.getByText("备注").parentElement;
    expect(remark?.querySelector(".bf-workbook-field-value--empty")?.textContent).toBe("—");
  });

  it('readOnlyDisplay: "text" 布尔与数组值有稳定呈现', () => {
    const workbook = makeWorkbook({}, { readOnly: true, readOnlyDisplay: "text" });
    const view = workbook.views[0] as { fields: unknown[]; layout: unknown[] };
    view.fields.push(
      { name: "approved", type: "boolean", label: "已审批" },
      { name: "tags", type: "array", label: "标签" },
    );
    view.layout.push({ type: "field", name: "approved" }, { type: "field", name: "tags" });
    (workbook.data as Record<string, unknown>).approved = true;
    (workbook.data as Record<string, unknown>).tags = ["甲", "乙"];

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    expect(screen.getByText("已审批").parentElement?.textContent).toContain("是");
    expect(screen.getByText("标签").parentElement?.textContent).toContain("甲, 乙");
  });

  it("未开启 text 模式时保持 1.0.0 行为（禁用输入框）", () => {
    const { container } = render(
      <DocumentRenderer workbook={makeWorkbook({}, { readOnly: true })} activeViewId="test-form" />,
    );

    expect(container.querySelectorAll(".bf-workbook-field--readonly")).toHaveLength(0);
    expect((screen.getByLabelText("用户名") as HTMLInputElement).disabled).toBe(true);
  });

  it("未配置 readOnly 时字段保持可编辑", () => {
    render(<DocumentRenderer workbook={makeWorkbook()} activeViewId="test-form" />);

    expect((screen.getByLabelText("用户名") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText("说明") as HTMLTextAreaElement).disabled).toBe(false);
    expect((screen.getByLabelText("角色") as HTMLSelectElement).disabled).toBe(false);
  });

  it("readOnly: true 时隐藏提交/重置按钮", () => {
    render(<DocumentRenderer workbook={makeWorkbook({}, { readOnly: true })} activeViewId="test-form" />);

    expect(screen.queryByRole("button", { name: /提交|submit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /重置|reset/i })).toBeNull();
  });

  it("未配置 readOnly 时正常渲染提交/重置按钮", () => {
    render(<DocumentRenderer workbook={makeWorkbook()} activeViewId="test-form" />);

    expect(screen.getByRole("button", { name: /提交|submit/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /重置|reset/i })).toBeTruthy();
  });

  it("readOnly 与字段级 disabled 叠加时仍为禁用", () => {
    const workbook = makeWorkbook({}, { readOnly: true });
    (workbook.views[0] as unknown as { fields: Array<Record<string, unknown>> }).fields[0].disabled = true;
    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    expect((screen.getByLabelText("用户名") as HTMLInputElement).disabled).toBe(true);
  });

  it("readOnly: true 时 repeat 布局的添加/删除按钮被禁用", () => {
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      locale: "zh-CN",
      data: { tags: [{ value: "a" }] },
      views: [
        {
          type: "form",
          id: "test-form",
          fields: [
            {
              name: "tags",
              type: "array",
              label: "标签",
              bind: { path: "tags", mode: "twoWay" },
              arrayConfig: {
                itemFields: [{ name: "value", type: "string" }],
                addLabel: "新增",
                removeLabel: "删除",
              },
            },
            { name: "value", type: "string", label: "值" },
          ],
          layout: [{ type: "repeat", field: "tags", children: [{ type: "field", name: "value" }] }],
          config: { readOnly: true },
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    };

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    expect((screen.getByLabelText("值") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "新增" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "删除" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("readOnly: true 时不触发 autoSave 提交", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    render(
      <DocumentRenderer
        workbook={makeWorkbook({}, { readOnly: true, autoSave: { enabled: true, debounce: 50 } })}
        activeViewId="test-form"
        onSubmit={onSubmit}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("FormRenderer 的 readOnly prop 透传为只读表单", () => {
    render(
      <FormRenderer
        fields={[
          { name: "username", type: "string" as const, label: "用户名" },
          { name: "memo", type: "textarea" as const, label: "说明" },
        ]}
        data={{ username: "alice", memo: "待审" }}
        readOnly
      />,
    );

    expect((screen.getByLabelText("用户名") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("说明") as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /提交|submit/i })).toBeNull();
  });

  it("readOnly: true 时输入值仍展示在数据树（只读可见）", async () => {
    const user = userEvent.setup();
    render(<DocumentRenderer workbook={makeWorkbook({}, { readOnly: true })} activeViewId="test-form" />);

    const input = screen.getByLabelText("用户名");
    // 只读模式下无法修改值
    await user.click(input);
    await user.keyboard("x");

    expect((input as HTMLInputElement).value).toBe("alice");
    await waitFor(() => {
      expect((screen.getByLabelText("用户名") as HTMLInputElement).value).toBe("alice");
    });
  });
});
