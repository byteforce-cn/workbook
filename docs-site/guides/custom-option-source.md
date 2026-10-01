# Custom Option Sources

Load select/multiselect options from external APIs, databases, or custom logic.

## Option Source Interface

```typescript
type OptionSourcePlugin = (
  ctx: OptionSourceContext
) => OptionResult | Promise<OptionResult>;

interface OptionSourceContext {
  data: WorkbookData;
  signal?: AbortSignal;
  page?: number;
  search?: string;
  params?: unknown;
}

interface OptionResult {
  options: WorkbookOption[];
  total?: number;
  hasNextPage?: boolean;
}

interface WorkbookOption {
  value: unknown;
  label: string;
  disabled?: boolean;
  group?: string;
}
```

## Static Options (Built-in)

```json
{
  "type": "select",
  "options": [
    { "value": "en", "label": "English" },
    { "value": "zh", "label": "中文" }
  ]
}
```

## URL Source (Built-in)

```json
{
  "type": "select",
  "optionsSource": {
    "type": "url",
    "url": "/api/departments",
    "mapping": { "value": "id", "label": "name" }
  }
}
```

## Custom Loader

```ts
registry.registerOptionSource("searchUsers", async (ctx) => {
  const { search, page, signal } = ctx;
  const params = new URLSearchParams();

  if (search) params.set("q", search);
  if (page) params.set("page", String(page));
  params.set("limit", "20");

  const response = await fetch(`/api/users/search?${params}`, { signal });
  if (!response.ok) throw new Error("Failed to load users");

  const data = await response.json();

  return {
    options: data.items.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.email})`,
      group: u.department,
    })),
    total: data.total,
    hasNextPage: data.page < data.totalPages,
  };
});
```

## Dependent Options

Options that depend on other field values use `dependsOn`:

```json
{
  "name": "city",
  "type": "select",
  "optionsSource": {
    "type": "url",
    "url": "/api/cities?province={{province}}",
    "dependsOn": ["province"]
  }
}
```

When `province` changes, the city options are automatically reloaded.

## Pagination Support

For large option sets, enable search and pagination:

```json
{
  "optionsSource": {
    "type": "url",
    "url": "/api/users",
    "pagination": {
      "pageParam": "page",
      "searchParam": "q",
      "limitParam": "limit"
    }
  }
}
```

The built-in select component supports:
- Search-as-you-type with debounce
- Infinite scroll for paginated results
- Cache invalidation on dependency changes

## Caching

Option results are automatically cached per source. Clear the cache when needed:

```ts
import { clearOptionCache } from "@byteforce/workbook/core";

// Clear memory cache
clearOptionCache("memory");

// Clear all caches
clearOptionCache("all");
```

## Best Practices

1. **Support `signal`** — respect AbortSignal for cancellation during unmount or re-fetch
2. **Handle errors gracefully** — catch and return empty options on error
3. **Use `search` parameter** — enable filtering for large datasets
4. **Return `total` and `hasNextPage`** — enables infinite scroll in select components
5. **Keep loaders pure** — avoid side effects; option loading should be idempotent
