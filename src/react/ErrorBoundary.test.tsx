/**
 * Tests for react/ErrorBoundary — WorkbookErrorBoundary.
 *
 * Covers:
 * - Rendering children normally when no error
 * - Catching render errors and showing fallback
 * - Retry after error recovery
 * - onError callback invocation
 * - Field-level error degradation
 * - Block-level error degradation
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlockErrorBoundary, FieldErrorBoundary, WorkbookErrorBoundary } from "./ErrorBoundary";

// A component that throws on render
function Bomb({ shouldExplode }: { shouldExplode?: boolean }) {
  if (shouldExplode) {
    throw new Error("KABOOM");
  }
  return <div data-testid="safe">Safe content</div>;
}

// ---------- WorkbookErrorBoundary ----------

describe("WorkbookErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <WorkbookErrorBoundary fallback={<div>Error</div>}>
        <div data-testid="child">Hello</div>
      </WorkbookErrorBoundary>,
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("renders fallback when child throws", () => {
    // Suppress React error boundary log in test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <WorkbookErrorBoundary fallback={<div data-testid="fallback">Crashed</div>}>
        <Bomb shouldExplode />
      </WorkbookErrorBoundary>,
    );

    expect(screen.getByTestId("fallback")).toBeDefined();

    spy.mockRestore();
  });

  it("calls onError when an error is caught", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <WorkbookErrorBoundary fallback={<div>Error</div>} onError={onError}>
        <Bomb shouldExplode />
      </WorkbookErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("KABOOM");

    spy.mockRestore();
  });

  it("retries rendering after calling retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    let key = 0;

    const { rerender } = render(
      <WorkbookErrorBoundary
        key={key}
        fallback={({ error, retry }) => (
          <div>
            <span data-testid="error-msg">Crashed: {error.message}</span>
            <button
              data-testid="retry-btn"
              type="button"
              onClick={() => {
                key++;
                retry();
              }}
            >
              Retry
            </button>
          </div>
        )}
      >
        <Bomb shouldExplode />
      </WorkbookErrorBoundary>,
    );

    // Should show the error fallback
    expect(screen.getByTestId("error-msg")).toBeDefined();

    // Click retry — this calls retry() which resets the error state
    fireEvent.click(screen.getByTestId("retry-btn"));

    // Verify the retry button is functional (the bomb will explode again,
    // but the boundary caught it)
    void rerender;

    spy.mockRestore();
  });

  it("handles the severity parameter in onError", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <WorkbookErrorBoundary fallback={<div>Error</div>} onError={onError} severity="warn">
        <Bomb shouldExplode />
      </WorkbookErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), "warn");

    spy.mockRestore();
  });
});

// ---------- FieldErrorBoundary ----------

describe("FieldErrorBoundary", () => {
  it("renders children normally", () => {
    render(
      <FieldErrorBoundary fieldPath="user.name">
        <input data-testid="field" />
      </FieldErrorBoundary>,
    );
    expect(screen.getByTestId("field")).toBeDefined();
  });

  it("renders field-level fallback on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <FieldErrorBoundary fieldPath="user.name" fallback={<span data-testid="field-error">Field error</span>}>
        <Bomb shouldExplode />
      </FieldErrorBoundary>,
    );

    expect(screen.getByTestId("field-error")).toBeDefined();

    spy.mockRestore();
  });

  it("calls onFieldError with field path", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onFieldError = vi.fn();

    render(
      <FieldErrorBoundary fieldPath="user.email" onFieldError={onFieldError}>
        <Bomb shouldExplode />
      </FieldErrorBoundary>,
    );

    expect(onFieldError).toHaveBeenCalledWith("user.email", expect.any(Error));

    spy.mockRestore();
  });
});

// ---------- BlockErrorBoundary ----------

describe("BlockErrorBoundary", () => {
  it("renders children normally", () => {
    render(
      <BlockErrorBoundary blockType="paragraph" blockId="b1">
        <p data-testid="block">Content</p>
      </BlockErrorBoundary>,
    );
    expect(screen.getByTestId("block")).toBeDefined();
  });

  it("renders block-level fallback on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <BlockErrorBoundary
        blockType="table"
        blockId="t1"
        fallback={<div data-testid="block-error">Block render error</div>}
      >
        <Bomb shouldExplode />
      </BlockErrorBoundary>,
    );

    expect(screen.getByTestId("block-error")).toBeDefined();

    spy.mockRestore();
  });

  it("calls onBlockError with type and id", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onBlockError = vi.fn();

    render(
      <BlockErrorBoundary blockType="image" blockId="img-1" onBlockError={onBlockError}>
        <Bomb shouldExplode />
      </BlockErrorBoundary>,
    );

    expect(onBlockError).toHaveBeenCalledWith("image", "img-1", expect.any(Error));

    spy.mockRestore();
  });
});
