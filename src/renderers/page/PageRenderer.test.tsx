import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Run } from "../../schema/generated-types";
import { PageRenderer } from "./PageRenderer";

describe("PageRenderer", () => {
  const sampleRun: Run = { type: "text", text: "Hello World" };
  const basicBlocks = [
    {
      type: "paragraph" as const,
      runs: [sampleRun] as [Run, ...Run[]],
    },
  ];

  it("renders standalone page with default A4 dimensions", () => {
    const { container } = render(<PageRenderer blocks={basicBlocks} />);
    // Page renders as SVG
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with custom page dimensions", () => {
    const { container } = render(<PageRenderer blocks={basicBlocks} pageWidth={612} pageHeight={792} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders text content in foreignObject", () => {
    const testRun: Run = { type: "text", text: "Test Content" };
    const { container } = render(
      <PageRenderer
        blocks={[
          {
            type: "paragraph" as const,
            runs: [testRun] as [Run, ...Run[]],
          },
        ]}
      />,
    );
    // Text runs are rendered inside foreignObject
    expect(container.querySelector("foreignObject")).toBeTruthy();
  });

  it("supports className prop", () => {
    const { container } = render(<PageRenderer blocks={basicBlocks} className="doc-preview" />);
    expect(container.querySelector(".doc-preview")).toBeTruthy();
  });

  it("works standalone without external providers", () => {
    const { container } = render(<PageRenderer blocks={basicBlocks} />);
    // Should render without errors
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
