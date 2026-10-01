# Document Renderer

The `DocumentRenderer` is the primary component for rendering a complete BF Workbook Schema v4.1.1 definition. It handles form, page, and sheet views with shared data binding.

## Import

```ts
import { DocumentRenderer } from "@byteforce/workbook";
```

## Props

```typescript
interface DocumentRendererProps {
  /** A valid BF Workbook Schema v4.1.1 definition */
  workbook: WorkbookDefinition;
  /** Optional plugin registry (scoped, not global singleton) */
  registry?: WorkbookPluginRegistry;
  /** Optional initial data for the data tree */
  initialData?: WorkbookData;
  /** Locale override (default: "zh-CN") */
  locale?: string;
  /** ID of the active view (when omitted, all visible views render) */
  activeViewId?: string;
  /** Submit handler for form views */
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
  /** Data change callback */
  onDataChange?: (data: WorkbookData) => void;
  /** Error callback for rendering errors */
  onError?: (error: Error, context: string) => void;
}
```

## Basic Usage

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import myWorkbook from "./my-workbook.json";

function App() {
  return (
    <DocumentRenderer
      workbook={myWorkbook}
      onSubmit={(data) => console.log("Submitted:", data)}
    />
  );
}
```

## With Plugin Registry

Pass a scoped registry via the `registry` prop:

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import { createPluginRegistry } from "@byteforce/workbook/react";

const registry = createPluginRegistry({ namespace: "my-app" });
registry.registerField("my:richText", RichTextEditor);

function App() {
  return (
    <DocumentRenderer
      workbook={myWorkbook}
      registry={registry}
    />
  );
}
```

The same registry can also be supplied through a `PluginProvider` context (both are supported; the `registry` prop wins when both are present):

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import { PluginProvider, createPluginRegistry } from "@byteforce/workbook/react";

function App() {
  return (
    <PluginProvider registry={registry}>
      <DocumentRenderer workbook={myWorkbook} />
    </PluginProvider>
  );
}
```

## With Error Boundary

Wrap `DocumentRenderer` with `WorkbookErrorBoundary` for graceful error handling:

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import { WorkbookErrorBoundary } from "@byteforce/workbook/react";

<WorkbookErrorBoundary
  fallback={({ error, retry }) => (
    <div>
      <p>Failed to render: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error, severity) => reportError(error)}
>
  <DocumentRenderer workbook={myWorkbook} />
</WorkbookErrorBoundary>
```

## Schema Validation

The `DocumentRenderer` automatically validates the workbook definition against BF Schema v4.1.1 on mount. You can also validate independently:

```ts
import { validateWorkbookDocument } from "@byteforce/workbook";

const result = validateWorkbookDocument(myWorkbook);
if (!result.valid) {
  console.error("Schema errors:", result.errors);
}
```
