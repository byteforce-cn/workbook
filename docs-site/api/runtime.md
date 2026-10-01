# Runtime Utilities

The `@byteforce/workbook/core` entry point provides framework-agnostic pure functions for all workbook logic. These can be used in Node.js, browser, or any JavaScript runtime — no React dependency.

## Import

```ts
import {
  evaluateCondition,
  runValidations,
  resolveFieldState,
  fetchOptions,
  resolveBindValue,
  getValueAtPath,
  setValueAtPath,
  resolveI18nText,
} from "@byteforce/workbook/core";
```

## Data Path Utilities

Navigate and manipulate the workbook data tree using dot-notation paths.

```ts
import { getValueAtPath, setValueAtPath, parsePath } from "@byteforce/workbook/core";

const data = { user: { name: "Alice", profile: { age: 30 } } };

getValueAtPath(data, "user.name");           // "Alice"
getValueAtPath(data, "user.profile.age");    // 30

setValueAtPath(data, "user.name", "Bob");    // mutates data
parsePath("user.profile.age");               // ["user", "profile", "age"]
```

## Condition Evaluation

Evaluate conditions defined in BF Workbook Schema against the data tree.

```ts
import { evaluateCondition } from "@byteforce/workbook/core";

const condition = {
  type: "equals",
  field: "user.role",
  value: "admin",
};

evaluateCondition(condition, data, plugins); // true | false
```

Built-in condition types:
- `equals` / `notEquals` — value comparison
- `gt` / `gte` / `lt` / `lte` — numeric comparison
- `contains` / `notContains` — string/array contains
- `empty` / `notEmpty` — value presence
- `and` / `or` / `not` — logical operators
- Custom conditions via plugin registry

## Validation Engine

Run validation rules against field values.

```ts
import { runValidations } from "@byteforce/workbook/core";

const rules = [
  { type: "required", message: "This field is required" },
  { type: "minLength", params: { min: 3 }, message: "Min 3 characters" },
  { type: "pattern", params: { pattern: "^[a-z]+$" }, message: "Only lowercase" },
];

const result = await runValidations("hello", rules, data, plugins);
// { valid: false, errors: [{ message: "Min 3 characters" }] }
```

### Async Validation

Validations can be async (e.g., server-side uniqueness checks):

```ts
const asyncRule = {
  type: "custom",
  async: true,
  validate: async (ctx) => {
    const exists = await api.checkUnique(ctx.value);
    return exists ? "Already taken" : undefined;
  },
};
```

## Dependency Resolution

Resolve a field's state based on its dependencies on other fields.

```ts
import { resolveFieldState } from "@byteforce/workbook/core";

const fieldState = resolveFieldState(fieldDef, data, plugins);
// Returns: { visible, disabled, required, value, errors, options, ... }
```

## Option Source Loading

Load select/multiselect options from various sources.

```ts
import { fetchOptions } from "@byteforce/workbook/core";

const options = await fetchOptions(
  { type: "url", url: "/api/departments" },
  data,
  plugins
);
// [{ value: "eng", label: "Engineering" }, ...]
```

Supported source types:
- `static` — inline option array
- `url` — HTTP GET with response mapping
- `graphql` — GraphQL query with path extraction
- `custom` — Plugin-registered loader function

## Internationalization

Resolve i18n text with locale fallback.

```ts
import { resolveI18nText } from "@byteforce/workbook/core";

const label = resolveI18nText("form.submit", "zh-CN", i18nResources);
// "提交"
```

## Asset Loading

Load and resolve assets referenced in the schema.

```ts
import { AssetLoader } from "@byteforce/workbook/core";

const loader = new AssetLoader(assetMap);
const url = loader.resolveAssetUrl("logo");
// "https://cdn.example.com/logo.png"

const blob = await loader.load("logo"); // fetch + blob cache
```
