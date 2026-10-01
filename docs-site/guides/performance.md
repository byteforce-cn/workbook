# Performance Optimization

Guidelines for achieving optimal rendering performance with `@byteforce/workbook`.

## Benchmarks

Current performance baselines (tested 2026-08-01):

| Scenario | Target | Measured | Status |
|----------|--------|----------|--------|
| 100-field form | < 500ms | ~386ms | ✅ |
| 10-page document | < 2000ms | Pass | ✅ |
| 10,000-row sheet | < 3000ms | ~1503ms | ✅ |

## Bundle Size

| Entry | Raw | Gzip | Limit |
|-------|-----|------|-------|
| `index.js` | 23.3 KB | 6.8 KB | < 50 KB |
| `core.js` | 17.7 KB | 4.6 KB | < 50 KB |
| `react.js` | 8.5 KB | 2.2 KB | < 50 KB |
| `quick.js` | 3.3 KB | 1.3 KB | < 50 KB |

## Tree-Shaking

Import only what you need for minimal bundle size:

```ts
// ❌ Full import (heavier)
import { DocumentRenderer } from "@byteforce/workbook";

// ✅ Scoped imports (lighter)
import { SimpleForm } from "@byteforce/workbook/quick";
import { evaluateCondition } from "@byteforce/workbook/core";
import { DataProvider } from "@byteforce/workbook/react";
```

## Virtual Scrolling (Sheet)

For large datasets, the sheet renderer automatically enables virtual scrolling:

```json
{
  "runtimeConfig": {
    "sheet": {
      "virtualScrollThreshold": 500
    }
  }
}
```

Only visible rows are rendered to the Canvas. With 10,000+ rows, only ~50 are in the DOM at any time.

## Lazy Rendering (Page)

For multi-page documents, pages beyond the viewport render lazily:

```json
{
  "runtimeConfig": {
    "page": {
      "renderer": "svg",
      "measurementPrecision": "normal"
    }
  }
}
```

Set `measurementPrecision` to `"high"` only when needed — it increases layout computation cost.

## Rendering Strategy

The runtime automatically selects rendering strategies based on data volume:

```ts
import { resolveRenderingConfig } from "@byteforce/workbook/core";

const config = resolveRenderingConfig({
  fieldCount: 200,
  pageCount: 1,
  rowCount: 5000,
});
// Automatically selects canvas for sheet, virtualized for form
```

## Validation Mode

Choose the right validation trigger for your use case:

| Mode | Use Case | Performance |
|------|----------|-------------|
| `onSubmit` | Complex forms, many validations | Best |
| `onBlur` | Standard forms | Good |
| `onChange` | Real-time feedback | Heaviest |
| `onMount` | Initial state check | One-time |

```json
{
  "runtimeConfig": {
    "form": {
      "validateMode": "onBlur"
    }
  }
}
```

## Async Validation Debounce

For server-side validations, use debounce to avoid excessive API calls:

```json
{
  "dependencies": [
    {
      "fields": ["username"],
      "debounce": 500
    }
  ]
}
```

## Avoiding Unnecessary Re-renders

1. **Memoize plugin factories** — create the registry once, not on every render
2. **Use `useMemo` for schema objects** — inline object literals cause re-renders
3. **Keep data flat** — deeply nested data trees increase path resolution cost

```tsx
// ❌ Creates new schema on every render
<DocumentRenderer workbook={{ schemaVersion: "4.1.1", views: [...] }} />

// ✅ Stable reference
const workbook = useMemo(() => ({ schemaVersion: "4.1.1", views: [...] }), []);
<DocumentRenderer workbook={workbook} />
```

## Observability

Enable performance monitoring in development:

```json
{
  "runtimeConfig": {
    "observability": {
      "logLevel": "warn",
      "performanceMarks": true
    }
  }
}
```

This adds `performance.mark()` and `performance.measure()` entries for key rendering phases:

- `workbook:render:form`
- `workbook:render:page`
- `workbook:render:sheet`
- `workbook:validate`
- `workbook:resolveDependencies`

## Profiling Tips

1. **Watch validation count** — each field validation adds cost; prefer `onBlur` over `onChange`
2. **Limit option source calls** — use `dependsOn` + caching to avoid redundant loads
3. **Prefer Canvas for large sheets** — HTML table fallback is ~3x slower for 1000+ rows
4. **Use `useWorkbookData` selectively** — subscribe to specific paths, not the whole tree
