import { describe, expect, it } from "vitest";

import { deriveDeviceFlags, detectDeviceFromWidth, resolveDeviceBreakpoints } from "./detectDevice";

describe("detectDeviceFromWidth", () => {
  it("classifies default breakpoints (mobile < 768, tablet < 1024, else desktop)", () => {
    expect(detectDeviceFromWidth(320)).toBe("mobile");
    expect(detectDeviceFromWidth(390)).toBe("mobile");
    expect(detectDeviceFromWidth(767)).toBe("mobile");
    // 边界：恰好等于断点属于较大一类
    expect(detectDeviceFromWidth(768)).toBe("tablet");
    expect(detectDeviceFromWidth(1023)).toBe("tablet");
    expect(detectDeviceFromWidth(1024)).toBe("desktop");
    expect(detectDeviceFromWidth(1280)).toBe("desktop");
    expect(detectDeviceFromWidth(1600)).toBe("desktop");
  });

  it("respects custom breakpoints", () => {
    expect(detectDeviceFromWidth(600, { mobile: 640, tablet: 900 })).toBe("mobile");
    expect(detectDeviceFromWidth(640, { mobile: 640, tablet: 900 })).toBe("tablet");
    expect(detectDeviceFromWidth(900, { mobile: 640, tablet: 900 })).toBe("desktop");
  });

  it("handles edge widths (0, negative, very large)", () => {
    expect(detectDeviceFromWidth(0)).toBe("mobile");
    expect(detectDeviceFromWidth(-1)).toBe("mobile");
    expect(detectDeviceFromWidth(3840)).toBe("desktop");
  });
});

describe("deriveDeviceFlags", () => {
  it("derives the correct boolean flags per device", () => {
    expect(deriveDeviceFlags("desktop")).toEqual({ isMobile: false, isTablet: false, isDesktop: true });
    expect(deriveDeviceFlags("tablet")).toEqual({ isMobile: false, isTablet: true, isDesktop: false });
    expect(deriveDeviceFlags("mobile")).toEqual({ isMobile: true, isTablet: false, isDesktop: false });
  });
});

describe("resolveDeviceBreakpoints", () => {
  it("falls back to defaults when no overrides are provided", () => {
    expect(resolveDeviceBreakpoints()).toEqual({ mobile: 768, tablet: 1024 });
    expect(resolveDeviceBreakpoints({})).toEqual({ mobile: 768, tablet: 1024 });
  });

  it("merges partial overrides with defaults", () => {
    expect(resolveDeviceBreakpoints({ mobile: 600 })).toEqual({ mobile: 600, tablet: 1024 });
    expect(resolveDeviceBreakpoints({ tablet: 900 })).toEqual({ mobile: 768, tablet: 900 });
    expect(resolveDeviceBreakpoints({ mobile: 600, tablet: 900 })).toEqual({ mobile: 600, tablet: 900 });
  });
});
