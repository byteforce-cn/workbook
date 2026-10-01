import { describe, expect, it } from "vitest";

import { computeVisibleRange } from "./virtualization";

describe("computeVisibleRange", () => {
  it("returns an overscanned visible range and its leading offset", () => {
    expect(computeVisibleRange([30, 30, 30, 30, 30], 45, 60, 1)).toEqual({
      start: 0,
      end: 5,
      offset: 0,
    });

    expect(computeVisibleRange([100, 100, 100, 100], 250, 120, 0)).toEqual({
      start: 2,
      end: 4,
      offset: 200,
    });
  });
});
