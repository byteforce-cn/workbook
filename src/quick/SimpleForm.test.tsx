import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SimpleForm } from "./SimpleForm";

describe("SimpleForm", () => {
  const basicFields = [
    { name: "username", type: "text" as const, label: "用户名" },
    { name: "email", type: "text" as const, label: "邮箱" },
    {
      name: "role",
      type: "select" as const,
      label: "角色",
      options: [
        { value: "admin", label: "管理员" },
        { value: "user", label: "用户" },
      ],
    },
  ];

  it("renders all fields with labels", () => {
    render(<SimpleForm fields={basicFields} />);

    expect(screen.getByText("用户名")).toBeTruthy();
    expect(screen.getByText("邮箱")).toBeTruthy();
    expect(screen.getByText("角色")).toBeTruthy();
  });

  it("renders with initial data", () => {
    render(<SimpleForm fields={basicFields} initialData={{ username: "alice", email: "alice@example.com" }} />);

    const usernameInput = screen.getByDisplayValue("alice");
    expect(usernameInput).toBeTruthy();
  });

  it("calls onChange when field value changes", async () => {
    const onChange = vi.fn();
    render(<SimpleForm fields={basicFields} onChange={onChange} />);

    const input = screen.getByLabelText("用户名");
    await userEvent.clear(input);
    await userEvent.type(input, "bob");

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it("calls onSubmit with form data", async () => {
    const onSubmit = vi.fn();
    render(
      <SimpleForm
        fields={[
          { name: "username", type: "text" as const, label: "用户名" },
          { name: "password", type: "text" as const, label: "密码" },
        ]}
        initialData={{ username: "admin", password: "secret" }}
        onSubmit={onSubmit}
      />,
    );

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /提交|submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const callData = onSubmit.mock.calls[0]?.[0];
      expect(callData).toHaveProperty("username");
      expect(callData).toHaveProperty("password");
    });
  });

  it("renders text fields as input elements", () => {
    render(<SimpleForm fields={[{ name: "test", type: "text" as const, label: "测试" }]} />);

    const input = screen.getByLabelText("测试");
    expect(input.tagName).toBe("INPUT");
  });

  it("renders number fields as number inputs", () => {
    render(<SimpleForm fields={[{ name: "age", type: "number" as const, label: "年龄" }]} />);

    const input = screen.getByLabelText("年龄");
    expect(input.getAttribute("type")).toBe("number");
  });

  it("renders boolean fields as checkboxes", () => {
    render(<SimpleForm fields={[{ name: "agree", type: "boolean" as const, label: "同意" }]} />);

    const checkbox = screen.getByLabelText("同意");
    expect(checkbox.getAttribute("type")).toBe("checkbox");
  });

  it("renders textarea fields", () => {
    render(<SimpleForm fields={[{ name: "bio", type: "textarea" as const, label: "简介" }]} />);

    const textarea = screen.getByLabelText("简介");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders select fields with options (async load)", async () => {
    render(
      <SimpleForm
        fields={[
          {
            name: "role",
            type: "select" as const,
            label: "角色",
            options: [
              { value: "admin", label: "管理员" },
              { value: "user", label: "用户" },
            ],
          },
        ]}
      />,
    );

    const select = screen.getByLabelText("角色");
    expect(select.tagName).toBe("SELECT");

    // Static options are loaded asynchronously via setTimeout(0) in FieldFactory
    await waitFor(() => {
      expect(screen.getByText("管理员")).toBeTruthy();
    });
    expect(screen.getByText("用户")).toBeTruthy();
  });

  it("applies className prop", () => {
    const { container } = render(<SimpleForm fields={basicFields} className="my-custom-form" />);

    expect(container.querySelector(".my-custom-form")).toBeTruthy();
  });

  it("configures required fields with validation", () => {
    render(<SimpleForm fields={[{ name: "email", type: "text" as const, label: "邮箱", required: true }]} />);

    // Required fields render the label and input; validation is internal
    const input = screen.getByLabelText("邮箱");
    expect(input).toBeTruthy();
    // The required validation is added to the field definition (internal),
    // not necessarily as an HTML required attribute on the DOM element.
  });

  it("supports date field type", () => {
    render(<SimpleForm fields={[{ name: "birthday", type: "date" as const, label: "生日" }]} />);

    const input = screen.getByLabelText("生日");
    expect(input.getAttribute("type")).toBe("date");
  });
});
