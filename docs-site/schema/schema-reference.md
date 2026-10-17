# BF Workbook Schema v4.1.1 Reference

The BF Workbook Schema is a JSON-based schema for defining forms, documents, and spreadsheets in a single definition.

## Schema Structure

```json
{
  "schemaVersion": "4.1.1",
  "i18n": { /* Internationalization */ },
  "styles": { /* Style catalog */ },
  "assets": { /* Asset map */ },
  "hooks": [ /* Lifecycle hooks */ ],
  "data": { /* Initial data */ },
  "views": [ /* View definitions */ ]
}
```

## Views

A workbook can contain multiple views of three types:

### Form View

```json
{
  "type": "form",
  "id": "my-form",
  "visible": true,
  "fields": [ /* Field definitions */ ],
  "layout": [ /* Layout nodes */ ],
  "hooks": [ /* View-level hooks */ ]
}
```

### Page View

```json
{
  "type": "page",
  "id": "my-document",
  "visible": true,
  "pageSettings": {
    "format": "A4",
    "orientation": "portrait",
    "margins": { "top": 72, "right": 72, "bottom": 72, "left": 72 },
    "defaultFontSize": 12,
    "defaultLineHeight": 1.5,
    "printConfig": { "copies": 1, "collate": true }
  },
  "blocks": [ /* Block definitions */ ],
  "hooks": [ /* View-level hooks */ ]
}
```

### Sheet View

```json
{
  "type": "sheet",
  "id": "my-sheet",
  "visible": true,
  "widthMode": "fixed",   // "fixed" | "stretch"
  "columns": [ /* Column definitions */ ],
  "rows": [ /* Row definitions */ ],
  "rowBind": { /* Dynamic row binding */ },
  "frozenRows": 1,
  "frozenCols": 0,
  "hooks": [ /* View-level hooks */ ]
}
```

> `widthMode` controls how a sheet adapts to its container width: `fixed`
> (default) keeps natural column widths and centers the sheet in wide
> containers; `stretch` distributes any surplus width proportionally across
> columns (respecting each column's `maxWidth` cap) to fill the container,
> while narrow containers still shrink / scroll horizontally as with `fixed`.

## Field Types

| Type | Description | Props |
|------|-------------|-------|
| `string` | Text input | placeholder, format, maxLength |
| `number` | Number input | min, max, step |
| `boolean` | Checkbox / toggle | — |
| `date` | Date picker | min, max |
| `textarea` | Multi-line text | rows, maxLength |
| `select` | Single select dropdown | options / optionsSource |
| `multiselect` | Multi-select | options / optionsSource |
| `array` | Repeatable field group | arrayConfig (minItems, maxItems) |
| `custom` | Plugin component | component, arbitrary props |

## Layout Types

| Type | Description |
|------|-------------|
| `field` | Single field |
| `row` | Horizontal row of children |
| `group` | Group with label and optional collapsible |
| `tabs` | Tabbed container |
| `steps` | Wizard-style steps |
| `repeat` | Repeating group (for array fields) |
| `html` | Raw HTML (sanitized) |

## Page Block Types

| Type | Description |
|------|-------------|
| `paragraph` | Rich text with runs (textRun, lineBreak, inlineImage) |
| `table` | Tabular data with colspan/rowspan |
| `list` | Ordered/unordered lists |
| `image` | Embedded images |
| `header` | Page headers |
| `footer` | Page footers |
| `watermark` | Text/image watermarks |
| `floating` | Absolutely positioned blocks |
| `pageBreak` | Manual page breaks |
| `spreadsheet` | Embedded sheet view |

## Dependency Types

Dependencies define how fields affect each other:

```json
{
  "fields": ["sourceField"],
  "effect": {
    "visible": { "type": "equals", "field": "sourceField", "value": "show" },
    "disabled": { "type": "empty", "field": "sourceField" },
    "required": { "type": "equals", "field": "type", "value": "special" },
    "options": { "type": "url", "url": "/api/items?type={{sourceField}}" },
    "validations": [ /* Conditional validations */ ],
    "defaultValue": "computed value"
  },
  "debounce": 300
}
```

## Condition Types

| Type | Description |
|------|-------------|
| `equals` | Value equals |
| `notEquals` | Value not equals |
| `gt` / `gte` | Greater than / or equal |
| `lt` / `lte` | Less than / or equal |
| `contains` | String/array contains |
| `notContains` | String/array does not contain |
| `empty` | Value is empty |
| `notEmpty` | Value is not empty |
| `and` | Logical AND of conditions |
| `or` | Logical OR of conditions |
| `not` | Logical NOT of condition |
| `custom` | Plugin-registered evaluator |

## Validation Types

| Type | Description |
|------|-------------|
| `required` | Value must be non-empty |
| `minLength` | Minimum string/array length |
| `maxLength` | Maximum string/array length |
| `min` | Minimum numeric value |
| `max` | Maximum numeric value |
| `pattern` | Regex pattern match |
| `custom` | Plugin-registered validator |
| `async` | Async (server-side) validation |

## Option Source Types

A field's `optionsSource` is either an inline option array or an object with a
`type` discriminator:

| Type | Description |
|------|-------------|
| `static` | Inline option array: `[{ "value": "a", "label": "A" }]` |
| `url` | HTTP request returning records, mapped onto options |
| `graphql` | GraphQL query returning records |
| `custom` | Plugin-registered loader |

### Remote options (`url` / `graphql`)

The request URL is carried by **`endpoint`**, and the records are read through
**`dataPath`**. A `url` key at the top level of the source does not exist in the
schema: it is rejected by validation, and at runtime a source without `endpoint`
logs a warning and renders an empty option list.

```json
{
  "name": "positionId",
  "type": "select",
  "label": "职位",
  "optionsSource": {
    "type": "url",
    "endpoint": "/api/hr/positions",
    "method": "GET",
    "params": { "orgUnitId": { "$field": "orgUnitId" } },
    "dependsOn": ["orgUnitId"],
    "dataPath": "items",
    "valueKey": "id",
    "labelKey": "name",
    "cache": "memory",
    "searchDebounce": 300
  }
}
```

| Property | Required | Meaning |
|----------|----------|---------|
| `type` | yes | `url` or `graphql` |
| `endpoint` | yes | Request URL; relative paths resolve against the page origin |
| `dataPath` | yes | Path to the records array inside the response body |
| `method` | no | `GET` (default) or `POST`; GraphQL defaults to `POST` |
| `params` | no | Query parameters (`GET`) or request body (`POST`); `{ "$field": "path" }` binds a value from the form data |
| `query` / `operationName` | GraphQL | Query document and optional operation name |
| `valueKey` / `labelKey` | no | Response keys mapped to `value` / `label` (defaults: `value` / `label`) |
| `dependsOn` | no | Field paths that trigger a refetch when they change |
| `cache` | no | `none` (default), `memory`, or `session` |
| `headers`, `pagination`, `fetchOnMount`, `searchDebounce` | no | See below |

`dataPath` uses the same dot/bracket path syntax as bind expressions —
`items`, `payload.records`, `data.assignees.nodes`, `result[0].items`. It is
**not** a JSON Pointer: a leading slash is part of the key name, so `"/items"`
looks up a property literally named `"/items"` and finds nothing.

`pagination` (`{ enabled, pageSize, totalPath, pageParam }`) adds a page
parameter to each request and reads the total count from `totalPath`.

## Hook Triggers

| Trigger | When |
|---------|------|
| `onMount` | View mounts |
| `onChange` | Data changes |
| `onSubmit` | Form submitted |
| `onBeforeSave` | Before data save |
| `onAfterSave` | After data save |
| `onValidate` | Validation runs |
| `onBeforePrint` | Before print/PDF export |
| `onAfterPrint` | After print/PDF export |
| `custom` | Programmatically dispatched |

## Hook Types

| Type | Description |
|------|-------------|
| `api` | HTTP API call |
| `function` | Plugin-registered function |
| `dispatch` | Redux-style dispatch |

## Conformance Coverage

As of v1.0.0, **62/62 schema definitions** are covered by conformant fixtures. See the [support matrix](https://github.com/byteforce-cn/workbook/blob/main/src/schema/support-matrix.ts) for per-definition status.

## Schema Validation

Validate any document against the schema:

```ts
import { validateWorkbookDocument } from "@byteforce/workbook";

const result = validateWorkbookDocument(myDocument);
if (!result.valid) {
  result.errors.forEach((e) => console.error(e));
}
```

> This validator is compiled from the schema by AJV at runtime, which requires
> `'unsafe-eval'` in `script-src`. Under a strict CSP, precompile a validator and
> pass it to `<DocumentRenderer validate={…} />` instead — see the
> [Content Security Policy guide](../guides/content-security-policy.md).
