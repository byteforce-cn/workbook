import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { DocumentRenderer, type DocumentRendererHandle } from "../../DocumentRenderer";
import type { WorkbookDefinition } from "../../schema/generated-types";

function makeWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { code: "A-1", memo: "edit me" },
    views: [
      {
        type: "form",
        id: "form",
        fields: [
          { name: "code", type: "string", label: "编号", readOnly: true },
          { name: "memo", type: "string", label: "说明" },
        ],
        layout: [
          { type: "field", name: "code" },
          { type: "field", name: "memo" },
        ],
      },
    ],
  } as WorkbookDefinition;
}

describe("field-level readOnly", () => {
  it("disables only the read-only field", () => {
    render(<DocumentRenderer workbook={makeWorkbook()} activeViewId="form" />);
    expect((screen.getByLabelText("编号") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("说明") as HTMLInputElement).disabled).toBe(false);
  });
});

describe("host field errors", () => {
  it("setFieldErrors shows the message, focuses the field, and clearFieldErrors removes it", async () => {
    const ref = createRef<DocumentRendererHandle>();
    render(<DocumentRenderer ref={ref} workbook={makeWorkbook()} activeViewId="form" />);

    await act(async () => {
      ref.current?.setFieldErrors("memo", "409: 已被他人修改");
    });

    expect(screen.getByText("409: 已被他人修改")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByDisplayValue("edit me"));

    await act(async () => {
      ref.current?.clearFieldErrors("memo");
    });
    expect(screen.queryByText("409: 已被他人修改")).toBeNull();
  });

  it("clearFieldErrors() clears every external error", async () => {
    const ref = createRef<DocumentRendererHandle>();
    render(<DocumentRenderer ref={ref} workbook={makeWorkbook()} activeViewId="form" />);

    await act(async () => {
      ref.current?.setFieldErrors("memo", ["one", "two"]);
    });
    expect(screen.getByText("one two")).toBeTruthy();

    await act(async () => {
      ref.current?.clearFieldErrors();
    });
    expect(screen.queryByText("one two")).toBeNull();
  });
});
