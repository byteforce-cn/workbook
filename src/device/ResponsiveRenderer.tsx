import type { ComponentProps } from "react";

import { DocumentRenderer } from "../DocumentRenderer";
import { DeviceProvider } from "./DeviceContext";
import type { DeviceBreakpoints, DeviceMode } from "./types";

export interface ResponsiveRendererProps extends ComponentProps<typeof DocumentRenderer> {
  /**
   * Target device. "auto" (default) detects from the viewport width.
   * Force "desktop" | "tablet" | "mobile" to render for a specific device.
   */
  device?: DeviceMode;
  /** Custom breakpoint thresholds (px), used in "auto" mode. */
  breakpoints?: Partial<DeviceBreakpoints>;
  /** Optional CSS class on the responsive wrapper. */
  className?: string;
}

/**
 * ResponsiveRenderer — multi-device renderer for workbook documents.
 *
 * Wraps `DocumentRenderer` with a `DeviceProvider`, making form, page and
 * sheet views adapt to the target device:
 *
 *   - desktop: multi-column rows, full-size page & sheet
 *   - tablet : rows capped at 2 columns, larger touch targets
 *   - mobile : single-column layout, 44px touch targets, sticky action bar
 *
 * @example
 * ```tsx
 * // Auto-detect: same schema, responsive on every device
 * <ResponsiveRenderer workbook={workbook} />
 *
 * // Force a device (preview / QA / stories)
 * <ResponsiveRenderer workbook={workbook} device="mobile" />
 * ```
 */
export function ResponsiveRenderer({ device = "auto", breakpoints, className, ...rest }: ResponsiveRendererProps) {
  return (
    <DeviceProvider device={device} breakpoints={breakpoints}>
      <div className={className} data-workbook-responsive-mode={device}>
        <DocumentRenderer {...rest} />
      </div>
    </DeviceProvider>
  );
}

/** Desktop-only renderer: forces the desktop layout regardless of viewport. */
export function DesktopRenderer(props: Omit<ResponsiveRendererProps, "device">) {
  return <ResponsiveRenderer device="desktop" {...props} />;
}

/** Tablet-only renderer: forces the tablet layout regardless of viewport. */
export function TabletRenderer(props: Omit<ResponsiveRendererProps, "device">) {
  return <ResponsiveRenderer device="tablet" {...props} />;
}

/** Mobile-only renderer: forces the mobile layout regardless of viewport. */
export function MobileRenderer(props: Omit<ResponsiveRendererProps, "device">) {
  return <ResponsiveRenderer device="mobile" {...props} />;
}
