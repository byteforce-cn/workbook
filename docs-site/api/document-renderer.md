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
  /** Locale override (default: "zh-CN") */
  locale?: string;
  /** Fallback locale (default: "en-US") */
  fallbackLocale?: string;
  /** ID of the active view (when omitted, all visible views render) */
  activeViewId?: string;
  /** Data for an uncontrolled document (snapshot taken on mount) */
  initialData?: WorkbookData;
  /** Controlled data tree — see "Controlled data" below */
  data?: WorkbookData;
  /**
   * Uncontrolled: called whenever the data tree changes, including the initial
   * render. Controlled (`data` set): called with the next tree for every edit,
   * and not on mount.
   */
  onDataChange?: (data: WorkbookData) => void;
  /** Submit handler for form views */
  onSubmit?: (data: WorkbookData) => void | Promise<void>;
  /** Replace the built-in schema validator (e.g. a precompiled one under strict CSP) */
  validate?: (document: unknown) => WorkbookValidationResult;
}
```

## Controlled data

`initialData` is a **mount-time snapshot**: later values are ignored, which is
why documents filled from an async request used to need a remount (`key` on a
data fingerprint) — losing whatever the user had typed.

Pass `data` instead to drive the document from your own state. The document then
renders exactly the value you pass, and every edit arrives through
`onDataChange`; feed the next tree back to render it (the same contract as a
controlled `<input>`).

```tsx
function EmployeeDocument({ employeeId }: { employeeId: string }) {
  const [data, setData] = useState<WorkbookData>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchEmployeeProjection(employeeId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <Skeleton />;

  return (
    <DocumentRenderer
      workbook={documentDefinition}
      data={data}
      onDataChange={setData}
      onSubmit={(next) => saveEmployeeProjection(employeeId, next)}
    />
  );
}
```

Notes:

- `initialData` is ignored while `data` is set.
- In controlled mode a document cannot edit itself: if you pass `data` without
  `onDataChange`, an edit is dropped and workbook logs a warning once.
- Editors you don't want overwritten should stay uncontrolled (`initialData` +
  `onDataChange`) or keep their own draft state per field.


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

## Imperative handle (`ref`)

`DocumentRenderer` exposes `submit()` for hosts that render their own action bar
(`config.hideActions`):

```tsx
const ref = useRef<DocumentRendererHandle>(null);

<DocumentRenderer ref={ref} workbook={workbook} onSubmit={save} />;
// later
const submitted = await ref.current?.submit(); // false when validation fails
```

`submit()` runs exactly what the built-in button runs: field validation,
`onValidate` hooks, `onSubmit` and the save hooks. It resolves `false` when
validation fails, the form is read-only, or no form view is currently mounted.

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
