# v0 → v1 Migration Guide

This guide helps you migrate from `@byteforce/workbook` v0.x to v1.0.0.

## Overview

v1.0.0 is a major refactor that introduces framework-agnostic core logic, scoped plugin registries, and multi-entry package exports — while maintaining **full backward compatibility** for the `DocumentRenderer` API.

## Breaking Changes (Minimal)

The v1.0.0 release is designed to be **backward compatible** with v0.x for the main `DocumentRenderer` API. The following changes may require action:

### 1. Plugin Registry: Global → Scoped

**Before (v0.x):**
```ts
import { pluginRegistry } from "@byteforce/workbook";

// Global singleton — multiple instances conflict
pluginRegistry.field.set("myField", MyComponent);
```

**After (v1.0.0):**
```ts
import { createPluginRegistry } from "@byteforce/workbook/react";

// Scoped registry — safe for multiple instances
const registry = createPluginRegistry({ namespace: "my-app" });
registry.registerField("myField", MyComponent);

// Pass registry explicitly
<DocumentRenderer workbook={myWorkbook} registry={registry} />
```

**Migration**: Replace `pluginRegistry.field.set()` with `registry.registerField()`. The old `pluginRegistry` is still available but marked as deprecated.

### 2. Package Entry Points

**Before (v0.x):**
```ts
// Single entry, everything bundled together
import { DocumentRenderer, evaluateCondition, SimpleForm } from "@byteforce/workbook";
```

**After (v1.0.0):**
```ts
// Recommended: use sub-path imports for tree-shaking
import { DocumentRenderer } from "@byteforce/workbook";
import { evaluateCondition } from "@byteforce/workbook/core";
import { SimpleForm } from "@byteforce/workbook/quick";
import { DataProvider } from "@byteforce/workbook/react";
```

**Migration**: The unified import from `@byteforce/workbook` still works. Sub-path imports are recommended for better tree-shaking but not required.

### 3. Error Boundary

**Before (v0.x):**
```tsx
// No built-in error boundary
<DocumentRenderer workbook={myWorkbook} />
```

**After (v1.0.0):**
```tsx
import { WorkbookErrorBoundary } from "@byteforce/workbook/react";

<WorkbookErrorBoundary
  fallback={({ error, retry }) => <ErrorView error={error} onRetry={retry} />}
>
  <DocumentRenderer workbook={myWorkbook} />
</WorkbookErrorBoundary>
```

**Migration**: Optional but recommended. The ErrorBoundary prevents a single field/block error from crashing the entire application.

## New Features (Opt-in)

These features are new in v1.0.0 and require no migration — they're additive:

### Quick Start API

```tsx
// New: SimpleForm — no schema needed
import { SimpleForm } from "@byteforce/workbook/quick";

<SimpleForm
  fields={[
    { name: "email", type: "email", label: "Email", required: true },
  ]}
  onSubmit={handleSubmit}
/>
```

### Standalone Renderers

```tsx
// New: Use renderers without DocumentRenderer
import { WorkbookFormView } from "@byteforce/workbook";

<DataProvider initialData={{}}>
  <WorkbookRuntimeProvider registry={myRegistry}>
    <WorkbookFormView view={myFormView} />
  </WorkbookRuntimeProvider>
</DataProvider>
```

### Zod Adapter

```ts
// New: Zod validation integration
import { validateWithZod } from "@byteforce/workbook/adapters/zod";
import { z } from "zod";

const validator = validateWithZod(z.string().email());
```

### Schema Dynamic Loading

```ts
// New: Load schemas from remote URLs
import { createSchemaLoader } from "@byteforce/workbook/core";

const loader = createSchemaLoader();
const workbook = await loader.load({
  source: "https://cdn.example.com/schemas/my-form.json",
  cache: "memory",
  timeout: 5000,
});
```

## API Renames

| v0.x | v1.0.0 | Notes |
|------|--------|-------|
| `pluginRegistry.field.set()` | `registry.registerField()` | Global → scoped |
| `pluginRegistry.layout.set()` | `registry.registerLayout()` | Global → scoped |
| `pluginRegistry.condition.set()` | `registry.registerCondition()` | Global → scoped |
| `pluginRegistry.validation.set()` | `registry.registerValidation()` | Global → scoped |
| `pluginRegistry.optionSource.set()` | `registry.registerOptionSource()` | Global → scoped |
| `pluginRegistry.hook.set()` | `registry.registerHook()` | Global → scoped |

## Deprecation Timeline

| Deprecated API | Removed In | Replacement |
|---------------|------------|-------------|
| `pluginRegistry` (global) | v2.0.0 | `createPluginRegistry()` |
| `WORKBOOK_PACKAGE_NAME` | v1.0.0 (already removed) | No replacement needed |

## Testing Your Migration

1. **Run tests**: All existing tests should pass without changes
2. **TypeScript**: `pnpm typecheck` should report zero errors
3. **Bundle**: Verify your bundle size hasn't increased significantly
4. **Runtime**: Smoke-test all views (form, page, sheet) render correctly

## Need Help?

- **[GitHub Issues](https://github.com/byteforce-cn/workbook/issues)** — Report bugs or ask questions
- **[API Reference](/api/document-renderer)** — Full API documentation
- **[Guides](/guides/custom-field)** — How-to guides for custom development
