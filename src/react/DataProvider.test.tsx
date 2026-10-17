/**
 * DataProvider controlled / uncontrolled contract.
 *
 * `initialData` is a mount-time snapshot (uncontrolled). A controlled `data`
 * prop is what makes "fetch later, fill the form" work without remounting the
 * document — the case reported in issue #33.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkbookData } from "../core/types";
import { DataProvider, useDataValue, useWorkbookData } from "./DataProvider";

function Probe({ path }: { path: string }) {
  const value = useDataValue(path);
  const { setValue } = useWorkbookData();

  return (
    <>
      <output data-testid="value">{String(value ?? "")}</output>
      <button type="button" onClick={() => setValue(path, "edited")}>
        edit
      </button>
    </>
  );
}

describe("DataProvider", () => {
  it("reports edits in controlled mode without storing them", () => {
    const onDataChange = vi.fn();
    const { rerender } = render(
      <DataProvider data={{ name: "Alice" }} onDataChange={onDataChange}>
        <Probe path="name" />
      </DataProvider>,
    );

    expect(screen.getByTestId("value").textContent).toBe("Alice");

    fireEvent.click(screen.getByRole("button", { name: "edit" }));

    expect(onDataChange).toHaveBeenCalledTimes(1);
    expect(onDataChange.mock.calls[0][0]).toEqual({ name: "edited" });
    // The provider keeps rendering what the parent passed, not the edit.
    expect(screen.getByTestId("value").textContent).toBe("Alice");

    // Feeding the value back is what renders the edit.
    rerender(
      <DataProvider data={{ name: "edited" }} onDataChange={onDataChange}>
        <Probe path="name" />
      </DataProvider>,
    );
    expect(screen.getByTestId("value").textContent).toBe("edited");
  });

  it("follows external data updates in controlled mode (async fill-back)", () => {
    const { rerender } = render(
      <DataProvider data={{}} onDataChange={() => {}}>
        <Probe path="employee.name" />
      </DataProvider>,
    );

    expect(screen.getByTestId("value").textContent).toBe("");

    // The request resolves and the parent passes the loaded projection.
    rerender(
      <DataProvider data={{ employee: { name: "李雷" } }} onDataChange={() => {}}>
        <Probe path="employee.name" />
      </DataProvider>,
    );

    expect(screen.getByTestId("value").textContent).toBe("李雷");
  });

  it("ignores initialData while controlled", () => {
    render(
      <DataProvider initialData={{ name: "from-initial" }} data={{ name: "from-data" }} onDataChange={() => {}}>
        <Probe path="name" />
      </DataProvider>,
    );

    expect(screen.getByTestId("value").textContent).toBe("from-data");
  });

  it("drops an edit with a single warning when controlled without onDataChange", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      render(
        <DataProvider data={{ name: "Alice" }}>
          <Probe path="name" />
        </DataProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "edit" }));
      fireEvent.click(screen.getByRole("button", { name: "edit" }));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("controlled");
      expect(screen.getByTestId("value").textContent).toBe("Alice");
    } finally {
      warn.mockRestore();
    }
  });

  it("stays uncontrolled without a data prop, keeping initialData a snapshot", () => {
    const onDataChange = vi.fn();
    const { rerender } = render(
      <DataProvider initialData={{ name: "Alice" }}>
        <Probe path="name" />
      </DataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "edit" }));
    expect(screen.getByTestId("value").textContent).toBe("edited");

    // A new initialData is a fresh mount-time snapshot only: it must not
    // clobber what the user already edited.
    rerender(
      <DataProvider initialData={{ name: "from-parent" }}>
        <Probe path="name" />
      </DataProvider>,
    );
    expect(screen.getByTestId("value").textContent).toBe("edited");
    expect(onDataChange).not.toHaveBeenCalled();
  });

  it("composes two edits in the same tick when uncontrolled", () => {
    const data: WorkbookData = {};

    function DoubleEdit() {
      const { data: current, setValue } = useWorkbookData();
      return (
        <>
          <output data-testid="value">{JSON.stringify(current)}</output>
          <button
            type="button"
            onClick={() => {
              setValue("a", 1);
              setValue("b", 2);
            }}
          >
            edit both
          </button>
        </>
      );
    }

    render(
      <DataProvider initialData={data}>
        <DoubleEdit />
      </DataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "edit both" }));
    expect(screen.getByTestId("value").textContent).toBe(JSON.stringify({ a: 1, b: 2 }));
  });
});
