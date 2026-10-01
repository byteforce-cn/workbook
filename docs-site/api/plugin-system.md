# Plugin System

The plugin system allows you to extend `@byteforce/workbook` with custom fields, layouts, validations, option sources, conditions, and hooks. Plugins are scoped to a registry instance — no global state.

## Creating a Registry

```ts
import { createPluginRegistry } from "@byteforce/workbook/react";

const registry = createPluginRegistry({
  namespace: "my-app",       // Namespace isolation
  errorBoundary: true,       // Plugin errors don't crash the app
  devTools: true,            // Log plugin calls in development
});
```

## Plugin Types

### Field Plugin

Register a custom field component:

```tsx
import type { FieldPluginComponent } from "@byteforce/workbook";

const RichTextEditor: FieldPluginComponent = ({ value, onChange, field }) => (
  <Editor value={value} onChange={onChange} />
);

// Register
registry.registerField("my:richText", RichTextEditor);

// Use in schema
// { name: "content", type: "custom", component: "my:richText" }
```

### Layout Plugin

Register a custom layout component:

```tsx
registry.registerLayout("my:card", CardLayout);
```

### Condition Plugin

Register a custom condition evaluator:

```ts
registry.registerCondition("my:isVIP", (ctx) => {
  return ctx.data.level === "vip";
});
```

### Validation Plugin

Register a custom validation rule:

```ts
registry.registerValidation("my:strongPassword", async (ctx) => {
  const { value } = ctx;
  if (typeof value !== "string" || value.length < 8) {
    return "Password must be at least 8 characters";
  }
  return undefined; // undefined = valid
});
```

### Option Source Plugin

Register a custom option loader:

```ts
registry.registerOptionSource("my:searchUsers", async (ctx) => {
  const { search, page, signal } = ctx;
  const res = await fetch(`/api/users?q=${search}&page=${page}`, { signal });
  const data = await res.json();
  return {
    options: data.users.map((u) => ({ value: u.id, label: u.name })),
    total: data.total,
    hasNextPage: data.hasNextPage,
  };
});
```

### Hook Plugin

Register lifecycle hooks:

```ts
registry.registerHook("my:auditLog", async (ctx) => {
  await api.log({ action: "submit", data: ctx.data });
});
```

## Hot Replacement

Replace a plugin at runtime — existing instances update automatically:

```ts
registry.replaceField("my:richText", NewRichTextEditor, {
  hotReload: true,          // Auto-refresh rendered instances
  fallback: OldRichTextEditor, // Fallback on error
});
```

## Batch Registration

Register multiple plugins at once:

```ts
registry.registerBatch({
  conditions: { "my:isAdmin": isAdminCheck },
  fields: { "my:richText": RichTextEditor },
  validations: { "my:strongPassword": passwordCheck },
  hooks: { "my:auditLog": auditLogger },
});
```

## Registry Management

```ts
// List all registered plugins
const fields = registry.list("field");

// Unregister a plugin
registry.unregister("field", "my:richText");

// Snapshot for undo/time-travel
const snapshot = registry.snapshot();
// ... make changes ...
registry.restore(snapshot);  // Roll back

// Clear everything
registry.clear();

// Check if a plugin exists
registry.has("field", "my:richText");
```

## Connecting to the App

The registry can be wired to the renderer in **either** of two equivalent ways — choose what fits your composition style:

**Option A — `registry` prop (explicit, recommended for single-renderer apps):**

```tsx
<DocumentRenderer workbook={myWorkbook} registry={registry} />
```

**Option B — `PluginProvider` (context, recommended for subtree scoping / multiple registries):**

```tsx
import { PluginProvider } from "@byteforce/workbook/react";

<PluginProvider registry={registry}>
  <DocumentRenderer workbook={myWorkbook} />
</PluginProvider>
```

Both are fully supported by the main-entry `DocumentRenderer`. When both are present, the explicit `registry` prop **takes precedence** over the `PluginProvider` context:

```tsx
<PluginProvider registry={registryA}>
  <DocumentRenderer workbook={myWorkbook} registry={registryB} /> {/* registryB wins */}
</PluginProvider>
```

`PluginProvider` also lets you scope **different registries to different subtrees** of the same tree (nested providers override for their subtree), which the single-prop form cannot express.

## Error Isolation

When `errorBoundary: true` is set, plugin errors are caught and reported without crashing the entire application. The plugin slot renders a fallback placeholder instead.
