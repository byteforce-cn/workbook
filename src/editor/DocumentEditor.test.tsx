import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { WorkbookDefinition } from "../schema/generated-types";
import { DocumentEditor, type DocumentEditorHandle } from "./DocumentEditor";

function makeWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    data: { customer: { name: "Alice" } },
    views: [
      {
        type: "page",
        id: "main",
        pageSettings: { width: 595, height: 842, marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72 },
        content: [
          {
            type: "header",
            content: [{ type: "paragraph", runs: [{ type: "text", text: "Header" }] }],
          },
          {
            type: "paragraph",
            runs: [{ type: "text", text: "Hello contract", style: "Body" }],
          } as never,
          { type: "watermark", text: "DRAFT" },
        ],
      },
    ],
  } as WorkbookDefinition;
}

describe("DocumentEditor", () => {
  it("renders the flow, panels, and saves the current content", async () => {
    const onSave = vi.fn();
    const ref = createRef<DocumentEditorHandle>();
    render(<DocumentEditor ref={ref} workbook={makeWorkbook()} onSave={onSave} />);

    expect(screen.getByText("Hello contract")).toBeTruthy();
    expect(screen.getByLabelText("页眉")).toBeTruthy();
    expect(screen.getByLabelText("水印")).toBeTruthy();

    const editable = document.querySelector(".bf-editor-content");
    expect(editable?.getAttribute("contenteditable")).toBe("true");

    let saved: ReturnType<DocumentEditorHandle["save"]>;
    await act(async () => {
      saved = ref.current?.save();
    });
    const alert = screen.queryByRole("alert");
    expect(alert?.textContent ?? null).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(saved).toBeDefined();
    const page = saved?.views[0];
    expect(page?.type).toBe("page");
    if (page?.type === "page") {
      const paragraph = page.content.find((block) => block.type === "paragraph");
      expect(JSON.stringify(paragraph)).toContain("Hello contract");
      expect(page.content.map((block) => block.type)).toEqual(["header", "paragraph", "watermark"]);
    }
  });

  it("keeps focus and zoom across the edit / preview switch", async () => {
    const user = userEvent.setup();
    const { container } = render(<DocumentEditor workbook={makeWorkbook()} />);
    await waitFor(() => expect(container.querySelector(".bf-editor-content")).not.toBeNull());

    const editable = container.querySelector<HTMLElement>(".bf-editor-content");
    const zoom = screen.getByLabelText("缩放");
    fireEvent.change(zoom, { target: { value: "1.5" } });
    editable?.focus();
    expect(document.activeElement).toBe(editable);

    await user.click(screen.getByRole("button", { name: "打印预览" }));
    const preview = container.querySelector<HTMLElement>("[data-bf-editor-preview]");
    expect(preview).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(preview));
    expect(preview?.querySelector<HTMLElement>("div")?.style.transform).toBe("scale(1.5)");

    await user.click(screen.getByRole("button", { name: "编辑" }));
    await waitFor(() => expect(document.activeElement).toBe(editable));
    expect(container.querySelector<HTMLElement>(".bf-editor-canvas")?.style.transform).toBe("scale(1.5)");
  });

  it("does not mark the document dirty when preview data changes", () => {
    const onSave = vi.fn();
    const ref = createRef<DocumentEditorHandle>();
    const workbook = makeWorkbook();
    const { rerender } = render(
      <DocumentEditor ref={ref} workbook={workbook} previewData={{ customer: { name: "Alice" } }} />,
    );
    expect(ref.current?.isDirty()).toBe(false);

    rerender(<DocumentEditor ref={ref} workbook={workbook} previewData={{ customer: { name: "Bob" } }} />);
    expect(ref.current?.isDirty()).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});
