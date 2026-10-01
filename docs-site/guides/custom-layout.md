# Custom Layout Development

Create custom layout components to organize fields in novel ways beyond the built-in row, group, tabs, and steps layouts.

## Layout Component Interface

```typescript
interface LayoutPluginProps {
  /** Layout node definition from schema */
  node: LayoutNodeDefinition;
  /** Child nodes (fields or nested layouts) rendered by the engine */
  children: ReactNode;
  /** Current data tree for conditional evaluation */
  data: WorkbookData;
  /** Plugin registry for resolving custom types */
  registry: WorkbookPluginRegistry;
}
```

## Example: Accordion Layout

```tsx
import { useState } from "react";
import type { LayoutPluginComponent } from "@byteforce/workbook";

const AccordionLayout: LayoutPluginComponent = ({
  node,
  children,
  data,
}) => {
  const [expanded, setExpanded] = useState(
    node.props?.defaultExpanded ?? false
  );

  return (
    <div className="accordion-layout">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>{node.label ?? "Section"}</span>
        <span className="indicator">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="accordion-content" role="region">
          {children}
        </div>
      )}
    </div>
  );
};
```

## Example: Fieldset Layout

```tsx
const FieldsetLayout: LayoutPluginComponent = ({ node, children }) => (
  <fieldset className="fieldset-layout">
    {node.label && <legend>{node.label}</legend>}
    {node.description && <p className="description">{node.description}</p>}
    <div className="fieldset-body">{children}</div>
  </fieldset>
);
```

## Registering

```ts
registry.registerLayout("accordion", AccordionLayout);
registry.registerLayout("fieldset", FieldsetLayout);
```

## Using in Schema

```json
{
  "layout": [
    {
      "type": "accordion",
      "label": "Advanced Options",
      "props": { "defaultExpanded": false },
      "children": [
        { "type": "field", "name": "timezone" },
        { "type": "field", "name": "language" }
      ]
    }
  ]
}
```

## Using with Layout Nodes

Custom layouts can appear anywhere in the layout tree:

```tsx
// In your schema layout definition:
const layout: LayoutNodeDefinition[] = [
  { type: "field", name: "name" },
  {
    type: "accordion",
    label: "Details",
    children: [
      { type: "field", name: "bio" },
      {
        type: "row",
        children: [
          { type: "field", name: "city" },
          { type: "field", name: "country" },
        ],
      },
    ],
  },
];
```

## Built-in `row` spans (`layoutField.span`)

The built-in `row` layout consumes a field node's `layoutField.span` for
relative column spans: each child defaults to `span: 1`, the row's column count
= the sum of child spans (e.g. `[A(1), B(2)]` → 3 columns, B takes 2/3), and
all-`span: 1` renders as equal-width columns. Responsive behavior: mobile
stacks single-column, tablet caps at two columns, desktop renders declared
spans.

Custom layout plugins can read child spans straight from `node` (the optional
`span?: number` on `type: "field"` children of `node.children`) and apply
their own strategy; the engine does not add spanning behavior to custom layouts.

```tsx
// Reading child spans inside a custom layout
function consumeChildSpans(children: LayoutNodeDefinition[]) {
  return children.map((child) =>
    child.type === "field" ? child.span ?? 1 : 1
  );
}
```

## Best Practices

1. **Render `children`** — the layout must render its children for fields to appear
2. **Use `node.props`** — make layouts configurable through schema
3. **Respect `data`** — use it for conditional rendering decisions
4. **Add ARIA roles** — `role="region"` for collapsible sections, `role="group"` for field groups
5. **Handle empty state** — a layout with no visible children should gracefully render nothing
