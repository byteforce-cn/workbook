import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value() {
    return {
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      fillText() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      setTransform() {},
      measureText() {
        return { width: 0 };
      },
    } as unknown as CanvasRenderingContext2D;
  },
});

// ProseMirror's focus/scrollToSelection path reads selection rectangles, which
// jsdom does not implement. Zero-sized rectangles are enough for editor tests;
// no layout assertion depends on them.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
for (const proto of [Range.prototype, Text.prototype] as unknown as Array<Record<string, unknown>>) {
  if (typeof proto.getClientRects !== "function") {
    Object.defineProperty(proto, "getClientRects", {
      configurable: true,
      value() {
        return [] as unknown as DOMRectList;
      },
    });
  }
  if (typeof proto.getBoundingClientRect !== "function") {
    Object.defineProperty(proto, "getBoundingClientRect", {
      configurable: true,
      value() {
        return emptyRect;
      },
    });
  }
}

afterEach(() => {
  cleanup();
});
