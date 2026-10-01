import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SheetRenderer } from "./SheetRenderer";

describe("SheetRenderer", () => {
  const basicColumns = [{ width: 100 }, { width: 150 }];

  const basicRows = [{ cells: [{ value: "Alice" }, { value: 100 }] }, { cells: [{ value: "Bob" }, { value: 200 }] }];

  it("renders standalone sheet with canvas", () => {
    const { container } = render(<SheetRenderer columns={basicColumns} rows={basicRows} />);
    // Sheet renders as canvas
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("renders with frozen panes", () => {
    const { container } = render(
      <SheetRenderer columns={basicColumns} rows={basicRows} frozenRows={1} frozenCols={1} />,
    );
    // With frozen panes, there are multiple canvas elements
    const canvases = container.querySelectorAll("canvas");
    expect(canvases.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with rowBind configuration", () => {
    const { container } = render(
      <SheetRenderer columns={basicColumns} rowBind={{ path: "items" }} data={{ items: [{ A: "x", B: 1 }] }} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("supports className prop", () => {
    const { container } = render(<SheetRenderer columns={basicColumns} className="sheet-view" />);
    expect(container.querySelector(".sheet-view")).toBeTruthy();
  });

  it("works standalone without external providers", () => {
    const { container } = render(<SheetRenderer columns={basicColumns} rows={basicRows} />);
    expect(container.querySelector("canvas")).toBeTruthy();
  });
});
