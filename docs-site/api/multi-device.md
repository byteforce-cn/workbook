# Multi-Device Rendering

The `ResponsiveRenderer` family renders the **same workbook schema** on
desktop, tablet, and mobile. Form, page, and sheet views adapt to the target
device without any schema changes.

## Import

```ts
import {
  ResponsiveRenderer,
  DesktopRenderer,
  TabletRenderer,
  MobileRenderer,
  useWorkbookDevice,
} from "@byteforce/workbook";
```

## Device classes & breakpoints

| Device | Viewport width        | Layout behavior                                                     |
| ------ | --------------------- | ------------------------------------------------------------------- |
| desktop | `≥ 1024px`            | Multi-column `row` layouts as declared (`layoutField.span` honored), full-size page & sheet |
| tablet  | `768 – 1023px`        | Rows capped at 2 columns (span clamped to 2), 40px touch targets        |
| mobile  | `< 768px`             | Rows collapse to a single column (span ignored), 44px touch targets, sticky action bar |

Both breakpoints are configurable via the `breakpoints` prop.

## Usage

### Auto-detect (recommended)

Detect the device from the viewport width and re-render on resize:

```tsx
<ResponsiveRenderer workbook={myWorkbook} device="auto" />
```

### Force a device

Preview/QA on a specific device regardless of viewport size:

```tsx
<ResponsiveRenderer workbook={myWorkbook} device="mobile" />
```

The three device-specific renderers are thin aliases:

```tsx
<DesktopRenderer workbook={myWorkbook} />   // ≡ device="desktop"
<TabletRenderer workbook={myWorkbook} />    // ≡ device="tablet"
<MobileRenderer workbook={myWorkbook} />    // ≡ device="mobile"
```

`ResponsiveRenderer` accepts every `DocumentRenderer` prop plus:

```typescript
interface ResponsiveRendererProps extends DocumentRendererProps {
  /** "desktop" | "tablet" | "mobile" | "auto" (default) */
  device?: DeviceMode;
  /** Custom breakpoint thresholds (px), used in "auto" mode */
  breakpoints?: Partial<DeviceBreakpoints>;
  /** Optional CSS class on the responsive wrapper */
  className?: string;
}
```

## What adapts per device

- **Form** — `row` layouts collapse by device (desktop: declared column count,
  tablet: max 2, mobile: single column). On mobile the form action bar becomes
  a full-width sticky bottom bar and inputs grow to 44px touch targets.
- **Page** — A4/configured pages scale proportionally to fit the container
  (`viewBox` scaling), keeping headers, footers, and watermarks intact.
- **Sheet** — the viewport follows the container width (including scrollbar
  reserve); frozen panes stay visible and horizontal scrolling engages on
  narrow screens.

## Manual control

For custom device logic, use `DeviceProvider` and `useWorkbookDevice`:

```tsx
import { DeviceProvider, useWorkbookDevice, DocumentRenderer } from "@byteforce/workbook";

function DeviceBadge() {
  const { device, isMobile, isTablet, isDesktop } = useWorkbookDevice();
  return <span data-testid="device-badge">{device}</span>;
}

function App() {
  return (
    <DeviceProvider device="tablet">
      <DeviceBadge />
      <DocumentRenderer workbook={myWorkbook} />
    </DeviceProvider>
  );
}
```

`useWorkbookDevice()` returns a stable `desktop` fallback when no
`DeviceProvider` is mounted, so existing `DocumentRenderer` usage is
unaffected. Pure CSS `@media` fallbacks additionally keep views responsive on
narrow viewports even without a provider.

## Behavior without a provider

`DocumentRenderer` alone renders with desktop defaults, but the theme stylesheet
still applies `@media` queries on real narrow viewports (single-column rows,
larger touch targets, sticky action bar). Wrap with `DeviceProvider` or
`ResponsiveRenderer` for JS-driven device behavior (e.g. forced device
previews in a desktop frame).

## Related

- [Document Renderer](./document-renderer) — the underlying renderer
- Storybook **Workbook/Device** examples — switch desktop / tablet / mobile /
  auto in the browser (`pnpm storybook`)
