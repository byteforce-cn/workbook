/**
 * Framework-agnostic validation engine.
 * Runs validation rules against values with plugin support.
 * Supports sync validators (async: false / undefined) and async validators (async: true).
 */

import type { ValidationDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { evaluateCondition } from "../condition/evaluate";
import type { CorePluginSlots } from "../registry/registry";

const BUILT_IN_VALIDATION_TYPES = new Set(["required", "min", "max", "minLength", "maxLength", "pattern"]);

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function readNumberParam(validation: ValidationDefinition): number | undefined {
  if (typeof validation.params === "number") return validation.params;
  if (validation.params != null && typeof validation.params === "object") {
    const params = validation.params as Record<string, unknown>;
    if (typeof params.value === "number") return params.value;
  }
  return undefined;
}

function readStringParam(validation: ValidationDefinition): string | undefined {
  if (typeof validation.params === "string") return validation.params;
  if (validation.params != null && typeof validation.params === "object") {
    const params = validation.params as Record<string, unknown>;
    if (typeof params.value === "string") return params.value;
  }
  return undefined;
}

/** Returns true when the validation definition is marked as async. */
export function isAsyncValidation(validation: ValidationDefinition): boolean {
  return validation.async === true;
}

/** Returns true when any validation in the list is marked as async. */
export function hasAsyncValidations(validations: ValidationDefinition[]): boolean {
  return validations.some((v) => v.async === true);
}

/**
 * Runs a single built-in (synchronous) validation rule.
 * Returns the error message string or undefined.
 */
function runBuiltInValidation(value: unknown, validation: ValidationDefinition): string | undefined {
  switch (validation.type) {
    case "required":
      return isEmptyValue(value) ? validation.message : undefined;
    case "min": {
      const min = readNumberParam(validation);
      return min != null && typeof value === "number" && value < min ? validation.message : undefined;
    }
    case "max": {
      const max = readNumberParam(validation);
      return max != null && typeof value === "number" && value > max ? validation.message : undefined;
    }
    case "minLength": {
      const minLength = readNumberParam(validation);
      const size = typeof value === "string" || Array.isArray(value) ? value.length : undefined;
      return minLength != null && size != null && size < minLength ? validation.message : undefined;
    }
    case "maxLength": {
      const maxLength = readNumberParam(validation);
      const size = typeof value === "string" || Array.isArray(value) ? value.length : undefined;
      return maxLength != null && size != null && size > maxLength ? validation.message : undefined;
    }
    case "pattern": {
      const pattern = readStringParam(validation);
      if (pattern != null && typeof value === "string") {
        try {
          const regex = new RegExp(pattern);
          return regex.test(value) ? undefined : validation.message;
        } catch {
          return validation.message;
        }
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Validates a single value against one validation rule.
 * For sync validators (async: false / undefined), returns the result immediately.
 * For async validators (async: true), returns a Promise.
 * Custom validators (non built-in types) resolve through the registry.
 */
export function validateValue(
  value: unknown,
  validation: ValidationDefinition,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
): string | undefined | Promise<string | undefined> {
  // Check condition first
  if (validation.condition != null) {
    if (!evaluateCondition(validation.condition, data, registry, rowContext)) {
      return undefined;
    }
  }

  // Built-in sync validators
  if (BUILT_IN_VALIDATION_TYPES.has(validation.type)) {
    return runBuiltInValidation(value, validation);
  }

  // Custom validator (always potentially async)
  const plugin = registry.validation.get(validation.type);
  if (plugin) {
    return plugin({ validation, value, data, rowContext });
  }
  return undefined;
}

/**
 * Runs all validations against a value.
 * If all validations are sync built-ins, returns results synchronously.
 * If any validation is async or custom, returns a Promise.
 */
export function runValidations(
  value: unknown,
  validations: ValidationDefinition[] | undefined,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
): string[] | Promise<string[]> {
  const list = validations ?? [];

  if (!hasAsyncValidations(list) && list.every((v) => BUILT_IN_VALIDATION_TYPES.has(v.type))) {
    // All sync — run synchronously
    const results: string[] = [];
    for (const v of list) {
      const msg = validateValue(value, v, data, registry, rowContext) as string | undefined;
      if (msg != null) results.push(msg);
    }
    return results;
  }

  // Has async validators or custom plugin types — run via Promise.all
  return Promise.all(list.map((v) => validateValue(value, v, data, registry, rowContext))).then((results) =>
    results.filter((msg): msg is string => msg != null),
  );
}
