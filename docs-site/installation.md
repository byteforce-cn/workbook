# Installation

## Prerequisites

| Dependency | Version |
|------------|---------|
| Node.js | ≥ 18 |
| React | ^18.0.0 \|\| ^19.0.0 |
| React DOM | ^18.0.0 \|\| ^19.0.0 |

## Install

::: code-group

```bash [pnpm]
pnpm add @byteforce/workbook
```

```bash [npm]
npm install @byteforce/workbook
```

```bash [yarn]
yarn add @byteforce/workbook
```

:::

## Import Styles

Import the default theme CSS in your app entry point:

```ts
// In your main.tsx or App.tsx
import "@byteforce/workbook/styles.css";
```

## Package Exports

`@byteforce/workbook` provides multiple entry points for tree-shaking:

| Entry | Import | Description |
|-------|--------|-------------|
| Main | `@byteforce/workbook` | Full engine with React bindings |
| Core | `@byteforce/workbook/core` | Framework-agnostic pure functions |
| React | `@byteforce/workbook/react` | React binding layer (providers, hooks) |
| Quick | `@byteforce/workbook/quick` | Zero-config SimpleForm API |
| React Native | `@byteforce/workbook/react-native` | RN renderers — **experimental**, API may change between minors |
| Zod adapter | `@byteforce/workbook/adapters/zod` | Optional Zod validation adapter (requires `zod`) |

> **Experimental:** the React Native entry point is published for early adopters.
> Its API is not covered by the usual semver guarantees yet; pin exact versions
> if you build on it.

### Tree-Shaking

Each entry point is independently tree-shakeable. Import only what you need:

```ts
// ✅ Good: only imports form utilities
import { runValidations, resolveFieldState } from "@byteforce/workbook/core";

// ✅ Good: only imports React bindings
import { DataProvider, useWorkbookData } from "@byteforce/workbook/react";

// ⚠️ Full import (for convenience, use with bundler tree-shaking)
import { DocumentRenderer, evaluateCondition } from "@byteforce/workbook";
```

## TypeScript

Type definitions are included in the package. No additional `@types/` packages needed.

```ts
import type {
  FieldDefinition,
  WorkbookData,
  ValidationDefinition,
} from "@byteforce/workbook";
```

## Local Development (advanced)

When your app consumes the library through a local build (for example via `pnpm link` or a `file:` / workspace dependency), a rebuild does **not** automatically reach a running dev server. Two layers may cache the old build:

1. **Package manager link/copy** — re-run the install step after a rebuild so the consumer sees the new `dist/`.
2. **Vite `optimizeDeps` pre-bundle cache** (`node_modules/.vite`) — Vite pre-bundles the library into `deps/...`. If the package version hash is unchanged, this cache is **not** invalidated and the dev server keeps serving the old bundle — the classic symptom being "JS is stale but CSS is fresh" (CSS is served via hard links and updates immediately, pre-bundled JS does not).

The complete refresh chain:

```bash
# 1. Rebuild the library
pnpm build

# 2. Re-link the consumer dependency
pnpm install

# 3. In the CONSUMER app, clear Vite's pre-bundle cache
rm -rf node_modules/.vite

# 4. Restart the Vite dev server (clear cache so the new bundle is pre-bundled)
pnpm dev
```

> In a monorepo you may need to run `pnpm install` at the workspace root, and `node_modules/.vite` lives in the consumer app's `node_modules` (or the workspace root when hoisted). For one-off checks you can also force Vite to bypass caching with `vite --force` (equivalent to clearing `.vite`).

## Next Steps

- **[Getting Started](/getting-started)** — Render your first form
- **[Quick Start API](/api/quick-start)** — SimpleForm reference
