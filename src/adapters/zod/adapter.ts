/**
 * Zod Validation Adapter for @byteforce/workbook.
 *
 * Bridges Zod schemas (v4.x) into the workbook validation pipeline:
 * 1. `validateWithZod` — direct validation with a Zod schema,
 *    returning the first error message (compatible with workbook's
 *    ValidationPlugin signature).
 * 2. `zodToWorkbookValidations` — statically inspects a Zod schema
 *    and translates it into workbook ValidationDefinition[] for
 *    schema-driven validation.
 *
 * Zod is an optional peer dependency. Importing this module
 * without zod installed will throw at runtime.
 *
 * Design: framework-agnostic (zero React dependency).
 * Tested with Zod 4.x.
 */

import type { ZodIssue, ZodSchema, ZodTypeAny } from "zod";
import type { ValidationDefinition } from "../../core/types";

// ---- Types ----

/** Mapping from Zod issue codes to human-readable messages */
export interface ZodMessageMap {
  too_small?: string;
  too_big?: string;
  invalid_format?: string;
  invalid_type?: string;
  invalid_enum_value?: string;
  unrecognized_keys?: string;
  invalid_union?: string;
  invalid_date?: string;
  custom?: string;
  [code: string]: string | undefined;
}

/** Options for Zod adapter behaviors */
export interface ZodAdapterOptions {
  /** Custom message overrides per Zod issue code */
  messageMap?: ZodMessageMap;
  /** Include field path in error messages (e.g. "user.name: Required") */
  includePath?: boolean;
}

// ---- Error Formatting ----

/**
 * Convert a single ZodIssue to a human-readable error message.
 */
export function zodErrorToMessage(issue: ZodIssue, options?: ZodAdapterOptions): string {
  const messageMap = options?.messageMap ?? {};
  const includePath = options?.includePath ?? true;

  // Start with the issue's own message (from the schema definition)
  let message = issue.message;

  // Apply custom message map (overrides built-in message)
  const customMsg = messageMap[issue.code];
  if (customMsg != null) {
    message = customMsg;
  }

  // Prepend path
  if (includePath && issue.path.length > 0) {
    const pathStr = issue.path.join(".");
    message = `${pathStr}: ${message}`;
  }

  return message;
}

// ---- Direct Validation ----

/**
 * Validate data against a Zod schema.
 * Returns `undefined` if valid, or the first error message if invalid.
 *
 * This matches the WorkbookValidationPlugin signature so it can be
 * registered as a custom validation plugin.
 */
export async function validateWithZod(
  schema: ZodSchema,
  value: unknown,
  options?: ZodAdapterOptions,
): Promise<string | undefined> {
  const result = await schema.safeParseAsync(value);

  if (result.success) {
    return undefined;
  }

  const firstIssue = result.error.issues[0];
  if (!firstIssue) {
    return "Validation failed";
  }

  return zodErrorToMessage(firstIssue, options);
}

// ---- Zod 4.x Internal Access Helpers ----

/**
 * Access the internal def of a Zod 4.x schema.
 * Zod 4.x stores def at `schema.def` (no underscore).
 */
function getDef(schema: ZodTypeAny): Record<string, unknown> | undefined {
  return (schema as unknown as { def?: Record<string, unknown> }).def;
}

/**
 * Get the type name from a Zod 4.x def (e.g. "string", "number", "enum").
 */
function getDefType(schema: ZodTypeAny): string | undefined {
  return getDef(schema)?.type as string | undefined;
}

/**
 * Get checks array from a Zod 4.x def.
 * Each check has `_zod.def.check` (kind string) and `_zod.def` (params).
 */
function getChecks(schema: ZodTypeAny): Array<{
  _zod?: {
    def?: {
      check?: string;
      value?: unknown;
      minimum?: number;
      error?: (...args: unknown[]) => string;
    };
  };
}> {
  return ((getDef(schema)?.checks as Array<unknown>) ?? []) as Array<{
    _zod?: {
      def?: {
        check?: string;
        value?: unknown;
        minimum?: number;
        error?: (...args: unknown[]) => string;
      };
    };
  }>;
}

// ---- Schema Translation ----

/**
 * Statically inspect a Zod schema and translate it into workbook
 * ValidationDefinition[] for schema-driven validation.
 *
 * This provides a best-effort static analysis of the Zod schema.
 * Complex schemas (refinements, transforms, unions, intersections)
 * may produce incomplete results — use `validateWithZod` for
 * those cases.
 */
export function zodToWorkbookValidations(schema: ZodTypeAny): ValidationDefinition[] {
  const validations: ValidationDefinition[] = [];
  const defType = getDefType(schema);

  if (!defType) return validations;

  // Handle ZodOptional / ZodNullable — unwrap inner type
  if (defType === "optional" || defType === "nullable") {
    const unwrapped = (schema as { innerType?: ZodTypeAny }).innerType;
    if (unwrapped) {
      return zodToWorkbookValidations(unwrapped);
    }
    return validations;
  }

  // Handle ZodEnum
  if (defType === "enum") {
    const entries = (getDef(schema)?.entries as Record<string, string>) ?? {};
    validations.push({
      type: "enum",
      message: "Invalid option",
      params: { values: Object.keys(entries) },
    });
    return validations;
  }

  // Handle ZodLiteral
  if (defType === "literal") {
    const values = (getDef(schema)?.values as unknown[]) ?? [];
    validations.push({
      type: "pattern",
      message: "Value does not match",
      params: { value: String(values[0] ?? "") },
    });
    return validations;
  }

  // Process checks (for string/number)
  const checks = getChecks(schema);

  for (const check of checks) {
    const meta = check._zod?.def;
    if (!meta?.check) continue;

    const kind = meta.check;
    const value = meta.value ?? meta.minimum;
    const message = extractMessage(meta.error) ?? undefined;

    // For string min_length >= 1: adds both "required" and "min" validations
    if (kind === "min_length" && typeof meta.minimum === "number") {
      if (meta.minimum >= 1) {
        validations.push({
          type: "required",
          message: message ?? "This field is required",
        });
      }
      validations.push({
        type: "min",
        message: message ?? `Minimum ${meta.minimum} characters`,
        params: { value: meta.minimum },
      });
      continue;
    }

    // For numeric greater_than
    if (kind === "greater_than" && value != null) {
      validations.push({
        type: "min",
        message: message ?? `Minimum value is ${value}`,
        params: { value },
      });
      continue;
    }

    // For numeric less_than
    if (kind === "less_than" && value != null) {
      validations.push({
        type: "max",
        message: message ?? `Maximum is ${value}`,
        params: { value },
      });
    }
  }

  return validations;
}

/**
 * Try to extract the configured error message from a Zod 4.x error function.
 * The error function returns the message string when called.
 */
function extractMessage(errorFn: ((...args: unknown[]) => string) | undefined): string | null {
  if (!errorFn) return null;
  try {
    // Call with minimal valid params to get the message template
    const msg = errorFn({});
    if (typeof msg === "string" && msg.length > 0 && msg !== "Invalid input") {
      return msg;
    }
  } catch {
    // If calling fails, we can't extract the message
  }
  return null;
}
