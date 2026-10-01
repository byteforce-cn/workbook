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

afterEach(() => {
  cleanup();
});
