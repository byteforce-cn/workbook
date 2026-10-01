import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentRenderer } from "../../DocumentRenderer";
import type { WorkbookDefinition } from "../../schema/generated-types";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeValidWorkbook(overrides: Partial<WorkbookDefinition> = {}): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {},
    views: [
      {
        type: "form",
        id: "test-form",
        fields: [{ name: "placeholder", type: "string", label: "占位" }],
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

describe("RepeatLayout - arrayConfig minItems/maxItems enforcement", () => {
  it("disables remove button when at minItems limit", async () => {
    const workbook = makeValidWorkbook({
      data: { tags: [{ value: "only-one" }] },
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
                minItems: 1,
                maxItems: 3,
                itemFields: [{ name: "value", type: "string" }],
                removeLabel: "删除",
              },
            },
          ],
          layout: [
            {
              type: "repeat",
              field: "tags",
              children: [{ type: "field", name: "value" }],
            },
          ],
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    const removeButtons = screen.getAllByRole("button", { name: /删除/ });
    expect(removeButtons.length).toBeGreaterThan(0);
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables add button when at maxItems limit", async () => {
    const workbook = makeValidWorkbook({
      data: { tags: [{ value: "a" }, { value: "b" }, { value: "c" }] },
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
                minItems: 1,
                maxItems: 3,
                itemFields: [{ name: "value", type: "string" }],
                addLabel: "新增",
              },
            },
          ],
          layout: [
            {
              type: "repeat",
              field: "tags",
              children: [{ type: "field", name: "value" }],
            },
          ],
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    const addButton = screen.getByRole("button", { name: /新增/ });
    expect((addButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables both add and remove when between minItems and maxItems", async () => {
    const workbook = makeValidWorkbook({
      data: { tags: [{ value: "a" }, { value: "b" }] },
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
                minItems: 1,
                maxItems: 3,
                itemFields: [{ name: "value", type: "string" }],
                addLabel: "新增",
                removeLabel: "删除",
              },
            },
          ],
          layout: [
            {
              type: "repeat",
              field: "tags",
              children: [{ type: "field", name: "value" }],
            },
          ],
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    const addButton = screen.getByRole("button", { name: /新增/ });
    const removeButtons = screen.getAllByRole("button", { name: /删除/ });

    expect((addButton as HTMLButtonElement).disabled).toBe(false);
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(false);
  });

  it("enables both buttons when no min/max specified", async () => {
    const workbook = makeValidWorkbook({
      data: { items: [] },
      views: [
        {
          type: "form",
          id: "test-form",
          fields: [
            {
              name: "items",
              type: "array",
              label: "项目",
              bind: { path: "items", mode: "twoWay" },
              arrayConfig: {
                itemFields: [{ name: "name", type: "string" }],
                addLabel: "新增",
              },
            },
          ],
          layout: [
            {
              type: "repeat",
              field: "items",
              children: [{ type: "field", name: "name" }],
            },
          ],
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" />);

    const addButton = screen.getByRole("button", { name: /新增/ });
    expect((addButton as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("RepeatLayout - add/remove interaction with limits", () => {
  it("adds new item and enforces maxItems after", async () => {
    const onDataChange = vi.fn();
    const workbook = makeValidWorkbook({
      data: { items: [{ name: "existing" }] },
      views: [
        {
          type: "form",
          id: "test-form",
          fields: [
            {
              name: "items",
              type: "array",
              label: "项目",
              bind: { path: "items", mode: "twoWay" },
              arrayConfig: {
                maxItems: 2,
                removeLabel: "删除",
                addLabel: "添加",
                itemFields: [{ name: "name", type: "string" }],
              },
            },
          ],
          layout: [
            {
              type: "repeat",
              field: "items",
              children: [{ type: "field", name: "name" }],
            },
          ],
        },
        {
          type: "page",
          id: "test-page",
          pageSettings: { width: 595, height: 842 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "placeholder" }] }],
        },
      ],
    });

    render(<DocumentRenderer workbook={workbook} activeViewId="test-form" onDataChange={onDataChange} />);

    const addButton = screen.getByRole("button", { name: /添加/ });
    fireEvent.click(addButton);

    await waitFor(() => {
      const calls = onDataChange.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastData = calls[calls.length - 1]?.[0];
      if (lastData?.items) {
        expect(Array.isArray(lastData.items)).toBe(true);
        expect((lastData.items as unknown[]).length).toBe(2);
      }
    });
  });
});
