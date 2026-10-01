/**
 * Pure device detection — framework-agnostic, no React dependency.
 */
import type { DeviceBreakpoints, DeviceType } from "./types";
import { DEFAULT_DEVICE_BREAKPOINTS } from "./types";

/**
 * Classify a viewport width into a device class.
 *
 * - width <  breakpoints.mobile  → "mobile"
 * - width <  breakpoints.tablet  → "tablet"
 * - otherwise                    → "desktop"
 *
 * Boundary semantics: a width exactly at a threshold belongs to the
 * larger class (e.g. 768 → tablet, 1024 → desktop), matching the
 * Storybook viewport presets (mobile 390 / tablet 768 / desktop 1280).
 */
export function detectDeviceFromWidth(
  width: number,
  breakpoints: DeviceBreakpoints = DEFAULT_DEVICE_BREAKPOINTS,
): DeviceType {
  if (width < breakpoints.mobile) {
    return "mobile";
  }
  if (width < breakpoints.tablet) {
    return "tablet";
  }
  return "desktop";
}

/** Derive the boolean device flags for a resolved device class. */
export function deriveDeviceFlags(device: DeviceType): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  return {
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
  };
}

/** Merge user-supplied partial breakpoints with the defaults. */
export function resolveDeviceBreakpoints(breakpoints?: Partial<DeviceBreakpoints>): DeviceBreakpoints {
  return {
    mobile: breakpoints?.mobile ?? DEFAULT_DEVICE_BREAKPOINTS.mobile,
    tablet: breakpoints?.tablet ?? DEFAULT_DEVICE_BREAKPOINTS.tablet,
  };
}
