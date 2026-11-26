import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PageBlockDefinition } from "../../../core/types";
import type { WorkbookDefinition } from "../../../schema/generated-types";
import { DocumentEditor, type DocumentEditorHandle } from "../../DocumentEditor";

function makeWorkbook(content: PageBlockDefinition[]): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "page",
        id: "main",
        pageSettings: { width: 595, height: 842, marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72 },
        content,
      },
    ],
  } as unknown as WorkbookDefinition;
}

function bindParagraph(path: string, format?: string): PageBlockDefinition {
  return {
    type: "paragraph",
    runs: [{ type: "text", bind: { path, ...(format == null ? {} : { format }) } }],
  };
}

function chips(): HTMLElement[] {
  // The toolbar also has an "insert bind" button; scope to the node views.
  return Array.from(document.querySelectorAll<HTMLElement>("[data-wb-bind-chip] > .bf-editor-bind-chip"));
}

async function openChip(user: ReturnType<typeof userEvent.setup>, index = 0): Promise<HTMLElement> {
  await waitFor(() => expect(chips().length).toBeGreaterThan(index));
  await user.click(chips()[index] as HTMLElement);
  return screen.getByRole("dialog", { name: "插入数据绑定" });
}

function chipContainer(chip: HTMLElement): HTMLElement {
  const container = chip.closest<HTMLElement>("[data-wb-bind-chip]");
  if (container == null) {
    throw new Error("chip is not wrapped in a bind node view");
  }
  return container;
}

describe("BindNodeView", () => {
  it("shows the template on the chip and the resolved value beside it", async () => {
    const workbook = makeWorkbook([
      bindParagraph("customer.name", "upper"),
      bindParagraph("when", "date"),
      bindParagraph("missing"),
    ]);

    render(
      <DocumentEditor
        workbook={workbook}
        previewData={{
          customer: { name: "Alice" },
          when: new Date("2026-01-02T03:04:05.000Z"),
        }}
      />,
    );

    await waitFor(() => expect(chips().length).toBeGreaterThan(0));
    const [name, when, missing] = chips();
    expect(name?.textContent).toBe("{{customer.name | upper}}");
    expect(chipContainer(name as HTMLElement).textContent).toContain("ALICE");
    expect(when?.textContent).toBe("{{when | date}}");
    expect(chipContainer(when as HTMLElement).textContent).toContain("2026-01-02T03:04:05.000Z");
    expect(missing?.textContent).toBe("{{missing}}");
    expect(chipContainer(missing as HTMLElement).textContent).toContain("—");
  });

  it("edits path, format and placeholder and saves them back", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const ref = createRef<DocumentEditorHandle>();
    const workbook = makeWorkbook([bindParagraph("customer.name")]);
    render(
      <DocumentEditor ref={ref} workbook={workbook} previewData={{ customer: { name: "Alice" } }} onSave={onSave} />,
    );

    const dialog = await openChip(user);

    const path = within(dialog).getByLabelText("绑定路径");
    await user.clear(path);
    await user.type(path, "customer.name");
    const format = within(dialog).getByLabelText("绑定格式");
    await user.clear(format);
    await user.type(format, "lower");
    const placeholder = within(dialog).getByLabelText("绑定占位符");
    await user.type(placeholder, "n/a");

    await user.click(within(dialog).getByRole("button", { name: "插入" }));
    expect(screen.queryByRole("dialog", { name: "插入数据绑定" })).toBeNull();
    expect(chips()[0]?.textContent).toBe("{{customer.name | lower}}");
    expect(chipContainer(chips()[0] as HTMLElement).textContent).toContain("alice");

    let saved: ReturnType<DocumentEditorHandle["save"]>;
    await act(async () => {
      saved = ref.current?.save();
    });
    const savedPage = saved?.views[0];
    expect(savedPage?.type).toBe("page");
    if (savedPage?.type === "page") {
      const paragraph = savedPage.content[0];
      expect(paragraph?.type).toBe("paragraph");
      if (paragraph?.type === "paragraph") {
        expect(paragraph.runs).toEqual([
          { type: "text", bind: { path: "customer.name", format: "lower", placeholder: "n/a" } },
        ]);
      }
    }
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("cancels an edit without touching the document", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor workbook={makeWorkbook([bindParagraph("customer.name")])} previewData={{}} />);

    const dialog = await openChip(user);
    const path = within(dialog).getByLabelText("绑定路径");
    await user.clear(path);
    await user.type(path, "customer.title");
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(screen.queryByRole("dialog", { name: "插入数据绑定" })).toBeNull();
    expect(chips()[0]?.textContent).toBe("{{customer.name}}");
  });

  it("disables insert while the path is blank", async () => {
    const user = userEvent.setup();
    render(<DocumentEditor workbook={makeWorkbook([bindParagraph("customer.name")])} />);

    const dialog = await openChip(user);
    await user.clear(within(dialog).getByLabelText("绑定路径"));
    expect(within(dialog).getByRole("button", { name: "插入" })).toHaveProperty("disabled", true);
  });

  it("deletes the bind node", async () => {
    const user = userEvent.setup();
    const ref = createRef<DocumentEditorHandle>();
    render(<DocumentEditor ref={ref} workbook={makeWorkbook([bindParagraph("customer.name")])} previewData={{}} />);

    const dialog = await openChip(user);
    expect(chips()).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "删除" }));
    expect(chips()).toHaveLength(0);

    let saved: ReturnType<DocumentEditorHandle["save"]>;
    await act(async () => {
      saved = ref.current?.save();
    });
    const savedPage = saved?.views[0];
    if (savedPage?.type === "page") {
      const paragraph = savedPage.content[0];
      if (paragraph?.type === "paragraph") {
        expect(JSON.stringify(paragraph.runs)).not.toContain('"bind"');
      }
    }
  });
});
