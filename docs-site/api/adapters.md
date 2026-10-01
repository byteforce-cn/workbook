# Adapters

Adapters bridge external libraries and schemas into the workbook engine.

## Zod Adapter

The Zod adapter enables using [Zod](https://zod.dev) schemas for validation within workbook forms.

### Install

Zod is an optional peer dependency:

```bash
pnpm add zod
```

### Direct Validation

Use `validateWithZod` to validate a value against a Zod schema:

```ts
import { z } from "zod";
import { validateWithZod } from "@byteforce/workbook/adapters/zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(18, "Must be 18 or older"),
});

// Returns a ValidationPlugin-compatible function
const validator = validateWithZod(schema);

// Use as a workbook validation plugin
const result = await validator({
  value: { name: "", age: 15 },
  data: {},
});
// { valid: false, errors: ["Name is required", "Must be 18 or older"] }
```

### Schema Translation

Translate a Zod schema into workbook validation definitions:

```ts
import { z } from "zod";
import { zodToWorkbookValidations } from "@byteforce/workbook/adapters/zod";

const userSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

const validations = zodToWorkbookValidations(userSchema);
// Returns ValidationDefinition[] for each field

// Use in field definitions
const fields = [
  { name: "name", type: "string", validations: validations.name },
  { name: "email", type: "string", validations: validations.email },
  { name: "age", type: "number", validations: validations.age },
];
```

### Custom Message Mapping

Override default error messages:

```ts
import { zodErrorToMessage } from "@byteforce/workbook/adapters/zod";

const messageMap = {
  too_small: "This field is required",
  invalid_format: "Please enter a valid value",
  invalid_type: "Incorrect data type",
};

const validation = validateWithZod(schema, {
  messageMap,
  includePath: true, // Include field path in messages
});
```

## Writing Custom Adapters

Adapters are plain functions/classes you write in your own codebase — no
registration is required. The Zod adapter in this package is the reference
implementation: it exports standalone helpers (`validateWithZod`,
`zodToWorkbookValidations`) that you can call directly, or wrap into a
`ValidationPlugin` and register via the plugin registry.

A typical pattern for a custom schema format looks like this:

```ts
import type { WorkbookDefinition } from "@byteforce/workbook";

function translateToWorkbook(schema: YourSchema): WorkbookDefinition {
  // Map your schema's fields to workbook field definitions.
  const fields = Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: mapType(prop.type),
    label: prop.title ?? name,
    validations: [{ type: "required", message: `${name} is required` }],
  }));

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    data: {},
    views: [{
      type: "form",
      id: "main",
      label: "Main form",
      fields,
    }],
  };
}
```
