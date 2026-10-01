/**
 * Multi-device (desktop / tablet / mobile) support types.
 *
 * A "device" describes how a workbook should be presented on screen:
 *   - desktop: wide layout, multi-column rows, full-size page & sheet
 *   - tablet : medium layout, rows capped at 2 columns, larger touch targets
 *   - mobile : single-column layout, 44px touch targets, sticky action bar
 */

/** Target rendering device */
export type DeviceType = "desktop" | "tablet" | "mobile";

/** Device selection mode: force a device or auto-detect from viewport width */
export type DeviceMode = DeviceType | "auto";

/** Breakpoint thresholds (CSS px). A viewport width below the threshold falls into the smaller class. */
export interface DeviceBreakpoints {
  /** Width below which a viewport is treated as mobile (default 768) */
  mobile: number;
  /** Width below which a viewport is treated as tablet (default 1024) */
  tablet: number;
}

/** Default breakpoints, aligned with the Storybook viewport presets (390/768/1280). */
export const DEFAULT_DEVICE_BREAKPOINTS: DeviceBreakpoints = {
  mobile: 768,
  tablet: 1024,
};

/** Value exposed by the device context / useDevice() hook. */
export interface DeviceContextValue {
  /** Resolved device for the current viewport / forced mode */
  device: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** "auto" when device was detected from viewport width; otherwise the forced device */
  mode: DeviceMode;
  /** Current viewport width in px (only meaningful in "auto" mode) */
  containerWidth?: number;
  /** Effective breakpoints in use */
  breakpoints: DeviceBreakpoints;
}
