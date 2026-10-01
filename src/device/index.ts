/**
 * Multi-device (desktop / tablet / mobile) support.
 */

export type { DeviceProviderProps } from "./DeviceContext";
export { DeviceProvider, useDevice } from "./DeviceContext";
export { deriveDeviceFlags, detectDeviceFromWidth, resolveDeviceBreakpoints } from "./detectDevice";
export type { ResponsiveRendererProps } from "./ResponsiveRenderer";
export { DesktopRenderer, MobileRenderer, ResponsiveRenderer, TabletRenderer } from "./ResponsiveRenderer";
export type { DeviceBreakpoints, DeviceContextValue, DeviceMode, DeviceType } from "./types";
export { DEFAULT_DEVICE_BREAKPOINTS } from "./types";
