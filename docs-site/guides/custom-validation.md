# Custom Validation

Extend the workbook validation engine with custom rules, async validators, and external library integration.

## Validation Plugin Interface

```typescript
type ValidationPlugin = (ctx: ValidationContext) => string | undefined | Promise<string | undefined>;

interface ValidationContext {
  /** The value being validated */
  value: unknown;
  /** Current data tree */
  data: WorkbookData;
  /** Validation parameters from schema */
  params?: unknown;
  /** Plugin registry */
  registry: WorkbookPluginRegistry;
}
```

Return `undefined` if the value is valid, or an error message string if invalid.

## Synchronous Validator

```ts
// Register
registry.registerValidation("phone", (ctx) => {
  const phoneRegex = /^\+?[\d\s-]{7,15}$/;
  if (typeof ctx.value === "string" && !phoneRegex.test(ctx.value)) {
    return "Please enter a valid phone number";
  }
  return undefined;
});

// Use in schema
// { "type": "phone", "message": "Invalid phone number" }
```

## Async Validator

```ts
registry.registerValidation("uniqueUsername", async (ctx) => {
  const username = ctx.value;
  if (typeof username !== "string" || username.length === 0) {
    return undefined; // Let "required" handle empty
  }

  const response = await fetch(`/api/users/check?username=${username}`);
  const { exists } = await response.json();

  return exists ? "Username is already taken" : undefined;
});
```

## Parameterized Validator

```ts
registry.registerValidation("wordCount", (ctx) => {
  const { min, max } = (ctx.params as { min?: number; max?: number }) ?? {};
  const words = String(ctx.value ?? "").trim().split(/\s+/).length;

  if (min !== undefined && words < min) {
    return `At least ${min} words required (currently ${words})`;
  }
  if (max !== undefined && words > max) {
    return `At most ${max} words allowed (currently ${words})`;
  }
  return undefined;
});

// Schema usage:
// { "type": "wordCount", "params": { "min": 10, "max": 500 } }
```

## Cross-Field Validation

Validate a field based on another field's value:

```ts
registry.registerValidation("confirmPassword", (ctx) => {
  const password = ctx.data.password;
  if (ctx.value !== password) {
    return "Passwords do not match";
  }
  return undefined;
});
```

## Combining Validations

Fields can have multiple validations. They run in order and stop at the first error:

```json
{
  "name": "password",
  "validations": [
    { "type": "required", "message": "Password is required" },
    { "type": "minLength", "params": { "min": 8 }, "message": "Min 8 characters" },
    { "type": "pattern", "params": { "pattern": "^(?=.*[A-Z])(?=.*[0-9])" }, "message": "Need uppercase and number" }
  ]
}
```

## Using with Zod

For complex validation logic, use the Zod adapter:

```ts
import { z } from "zod";
import { validateWithZod } from "@byteforce/workbook/adapters/zod";

const passwordSchema = z
  .string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Need at least one uppercase letter")
  .regex(/[0-9]/, "Need at least one number");

registry.registerValidation("zod:password", validateWithZod(passwordSchema));
```

## Best Practices

1. **Return `undefined` for valid** — empty/valid should not produce error messages
2. **Keep sync validators sync** — don't wrap synchronous logic in async
3. **Handle edge cases** — null, undefined, wrong types
4. **Use `ctx.data` for context** — access other field values when needed
5. **Debounce async validators** — use `dependency.debounce` in schema for remote checks
