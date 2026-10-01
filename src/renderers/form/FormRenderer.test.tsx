import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormRenderer } from "./FormRenderer";

describe("FormRenderer", () => {
  const basicFields = [
    { name: "username", type: "string" as const, label: "用户名" },
    { name: "email", type: "string" as const, label: "邮箱" },
  ];

  it("renders standalone form with fields", () => {
    render(<FormRenderer fields={basicFields} />);
    expect(screen.getByText("用户名")).toBeTruthy();
    expect(screen.getByText("邮箱")).toBeTruthy();
  });

  it("renders with initial data", () => {
    render(<FormRenderer fields={basicFields} data={{ username: "alice", email: "alice@example.com" }} />);
    expect(screen.getByDisplayValue("alice")).toBeTruthy();
    expect(screen.getByDisplayValue("alice@example.com")).toBeTruthy();
  });

  it("calls onSubmit with data", async () => {
    const onSubmit = vi.fn();
    render(
      <FormRenderer
        fields={[{ name: "name", type: "string" as const, label: "姓名" }]}
        data={{ name: "test" }}
        onSubmit={onSubmit}
      />,
    );

    const button = screen.getByRole("button", { name: /提交|submit/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it("calls onDataChange when field changes", async () => {
    const onChange = vi.fn();
    render(<FormRenderer fields={basicFields} onDataChange={onChange} />);

    const input = screen.getByLabelText("用户名");
    await userEvent.type(input, "x");

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it("renders without DocumentRenderer context", () => {
    // FormRenderer works standalone without external providers
    const { container } = render(<FormRenderer fields={basicFields} />);
    expect(container.querySelector("form")).toBeTruthy();
  });

  it("supports className prop", () => {
    const { container } = render(<FormRenderer fields={basicFields} className="standalone-form" />);
    expect(container.querySelector(".standalone-form")).toBeTruthy();
  });

  it("marks required fields with data-required for the theme star marker", () => {
    const { container } = render(
      <FormRenderer
        fields={[
          {
            name: "name",
            type: "string" as const,
            label: "姓名",
            validations: [{ type: "required", message: "请填写姓名" }],
          },
          { name: "note", type: "string" as const, label: "备注" },
        ]}
      />,
    );

    // 必填字段标签带 data-required="true"（主题 ::after 渲染红星），非必填不带；
    // 且标签文本保持纯净（星号不进 a11y 树 / 标签匹配文本）
    const requiredSpan = container.querySelector('.bf-workbook-field > span[data-required="true"]');
    expect(requiredSpan?.textContent).toBe("姓名");
    expect(screen.getByText("备注")?.getAttribute("data-required")).toBeNull();
    expect(screen.getByLabelText("姓名")).toBeTruthy();
  });
});
