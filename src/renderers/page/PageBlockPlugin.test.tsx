/**
 * Page block plugins (#26).
 *
 * A page view block `{ type: "custom", component: "app:flowStepper" }` is
 * rendered by the component registered under that id via
 * `registry.registerPageBlock()`. Unregistered ids keep the historical
 * `default: return null` behaviour.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageViewDefinition } from "../../core/types";
import { DocumentRenderer } from "../../DocumentRenderer";
import { createPluginRegistry } from "../../react/registry";
import { validateWorkbookDocument } from "../../schema";
import type { WorkbookDefinition } from "../../schema/generated-types";
import { measurePageBlockHeight } from "./pageLayout";

function createWorkbook(
  content: PageViewDefinition["content"],
  data: Record<string, unknown> = {},
): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data,
    views: [
      {
        type: "page",
        id: "doc",
        pageSettings: { width: 595, height: 842 },
        content,
      },
    ],
  } as unknown as WorkbookDefinition;
}

const customBlock = {
  type: "custom" as const,
  component: "app:flowStepper",
  renderHints: { height: 120 },
  props: { currentStep: 2 },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("page block plugins", () => {
  it("accepts a custom page block in the schema", () => {
    const validation = validateWorkbookDocument(createWorkbook([customBlock]));

    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("renders the registered plugin with width, height, props and data", () => {
    const registry = createPluginRegistry();
    registry.registerPageBlock("app:flowStepper", ({ block, width, height, data }) => (
      <div data-testid="flow-stepper">
        {`${width}x${height} step=${String(block.props?.currentStep)} name=${String(
          (data.employee as { name?: string } | undefined)?.name,
        )}`}
      </div>
    ));

    render(
      <DocumentRenderer
        workbook={createWorkbook([customBlock], { employee: { name: "李雷" } })}
        registry={registry}
        activeViewId="doc"
      />,
    );

    const stepper = screen.getByTestId("flow-stepper");
    // height comes from renderHints, props and the data tree are handed over, and
    // the width is the page's content width.
    expect(stepper.textContent).toMatch(/^\d+x120 step=2 name=李雷$/);
    const receivedWidth = Number(/^(\d+)x/.exec(stepper.textContent ?? "")?.[1]);
    expect(receivedWidth).toBeGreaterThan(0);
    expect(receivedWidth).toBeLessThan(595);
  });

  it("renders nothing (with one warning) for an unregistered block", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(<DocumentRenderer workbook={createWorkbook([customBlock])} activeViewId="doc" />);

    expect(container.querySelector('[data-testid="flow-stepper"]')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("registerPageBlock");
  });

  it("reserves the declared height for pagination, and none without a hint", () => {
    const view = createWorkbook([customBlock]).views[0] as PageViewDefinition;

    expect(measurePageBlockHeight(view, customBlock, 555)).toBe(120);
    expect(measurePageBlockHeight(view, { type: "custom", component: "app:x" }, 555)).toBe(0);
  });

  it("applies the namespace to page block registration", () => {
    const registry = createPluginRegistry({ namespace: "my-app" });
    const Stepper = () => <div />;
    registry.registerPageBlock("flowStepper", Stepper);

    expect(registry.pageBlock.get("my-app:flowStepper")).toBe(Stepper);
    expect(registry.pageBlock.has("flowStepper")).toBe(false);
  });
});
