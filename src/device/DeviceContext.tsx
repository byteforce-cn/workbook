import { createContext, type PropsWithChildren, useContext, useMemo, useSyncExternalStore } from "react";

import { deriveDeviceFlags, detectDeviceFromWidth, resolveDeviceBreakpoints } from "./detectDevice";
import type { DeviceBreakpoints, DeviceContextValue, DeviceMode, DeviceType } from "./types";

/** Fallback used when no DeviceProvider is mounted (backward-compatible desktop). */
const FALLBACK_DEVICE: DeviceContextValue = {
  device: "desktop",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  mode: "auto",
  containerWidth: undefined,
  breakpoints: { mobile: 768, tablet: 1024 },
};

const DeviceContext = createContext<DeviceContextValue>(FALLBACK_DEVICE);

/** Width used for server-side rendering / environments without a window. */
const SSR_VIEWPORT_WIDTH = 1280;

function readViewportWidth(): number {
  if (typeof window === "undefined") {
    return SSR_VIEWPORT_WIDTH;
  }
  return window.innerWidth;
}

/**
 * Auto-detect the device class from the viewport width, reacting to
 * viewport changes via matchMedia listeners.
 */
function useAutoDetectedDevice(breakpoints: DeviceBreakpoints): DeviceContextValue {
  const width = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const mobileQuery = window.matchMedia(`(max-width: ${breakpoints.mobile - 1}px)`);
      const tabletQuery = window.matchMedia(`(max-width: ${breakpoints.tablet - 1}px)`);
      mobileQuery.addEventListener("change", onStoreChange);
      tabletQuery.addEventListener("change", onStoreChange);
      return () => {
        mobileQuery.removeEventListener("change", onStoreChange);
        tabletQuery.removeEventListener("change", onStoreChange);
      };
    },
    readViewportWidth,
    () => SSR_VIEWPORT_WIDTH,
  );

  const device = detectDeviceFromWidth(width, breakpoints);
  return {
    device,
    ...deriveDeviceFlags(device),
    mode: "auto",
    containerWidth: width,
    breakpoints,
  };
}

export interface DeviceProviderProps extends PropsWithChildren {
  /**
   * Target device. "auto" (default) detects the device class from the
   * viewport width. Force "desktop" | "tablet" | "mobile" to render for a
   * specific device regardless of viewport size (useful for stories and
   * device previews).
   */
  device?: DeviceMode;
  /** Custom breakpoint thresholds (px). */
  breakpoints?: Partial<DeviceBreakpoints>;
}

/**
 * DeviceProvider — provides the current device class (desktop/tablet/mobile)
 * to the workbook renderers below it.
 *
 * @example
 * ```tsx
 * // Auto-detect from viewport
 * <DeviceProvider>
 *   <DocumentRenderer workbook={workbook} />
 * </DeviceProvider>
 *
 * // Force mobile rendering (e.g. inside a desktop preview frame)
 * <DeviceProvider device="mobile">
 *   <DocumentRenderer workbook={workbook} />
 * </DeviceProvider>
 * ```
 */
export function DeviceProvider({ children, device = "auto", breakpoints }: DeviceProviderProps) {
  const resolvedBreakpoints = useMemo(() => resolveDeviceBreakpoints(breakpoints), [breakpoints]);
  const autoDetected = useAutoDetectedDevice(resolvedBreakpoints);

  const value = useMemo<DeviceContextValue>(() => {
    if (device !== "auto") {
      const resolved = device as DeviceType;
      return {
        device: resolved,
        ...deriveDeviceFlags(resolved),
        mode: device,
        containerWidth: undefined,
        breakpoints: resolvedBreakpoints,
      };
    }
    return autoDetected;
  }, [autoDetected, device, resolvedBreakpoints]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

/**
 * useDevice — read the current device class.
 *
 * Returns the forced device when wrapped in `<DeviceProvider device=...>`,
 * the viewport-detected device when wrapped in `<DeviceProvider device="auto">`,
 * and a stable "desktop" fallback when no provider is mounted.
 */
export function useDevice(): DeviceContextValue {
  return useContext(DeviceContext);
}
