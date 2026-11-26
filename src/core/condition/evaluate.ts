/**
 * Framework-agnostic condition evaluation engine.
 * Evaluates condition definitions against a data tree with plugin support.
 */

import type { WorkbookConditionDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { getValueAtPath } from "../data/pathUtils";
import type { CorePluginSlots } from "../registry/registry";

/**
 * Read-only host context (permissions, current user, tenant) that conditions
 * may reference with a `$context.` path prefix. Deliberately separate from the
 * data tree: previewing or fetching data must never overwrite it.
 */
export type ConditionContext = Record<string, unknown>;

function readConditionValue(
  path: string | undefined,
  data: WorkbookData,
  rowContext?: WorkbookRowContext,
  context?: ConditionContext,
): unknown {
  const conditionPath = path ?? "";
  if (conditionPath === "$context") {
    return context;
  }

  if (conditionPath.startsWith("$context.")) {
    return getValueAtPath(context ?? {}, conditionPath.slice("$context.".length), rowContext);
  }

  return getValueAtPath(data, conditionPath, rowContext);
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  return String(left).localeCompare(String(right));
}

export function evaluateCondition(
  condition: WorkbookConditionDefinition,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
  context?: ConditionContext,
): boolean {
  const valueAt = (path: string | undefined) => readConditionValue(path, data, rowContext, context);

  switch (condition.op) {
    case "eq":
      return valueAt(condition.path) === condition.value;
    case "neq":
      return valueAt(condition.path) !== condition.value;
    case "gt":
      return compareValues(valueAt(condition.path), condition.value) > 0;
    case "gte":
      return compareValues(valueAt(condition.path), condition.value) >= 0;
    case "lt":
      return compareValues(valueAt(condition.path), condition.value) < 0;
    case "lte":
      return compareValues(valueAt(condition.path), condition.value) <= 0;
    case "in": {
      const source = condition.value;
      if (!Array.isArray(source)) {
        return false;
      }
      return source.includes(valueAt(condition.path));
    }
    case "contains": {
      const currentValue = valueAt(condition.path);
      if (Array.isArray(currentValue)) {
        return currentValue.includes(condition.value);
      }
      if (typeof currentValue === "string") {
        return currentValue.includes(String(condition.value ?? ""));
      }
      return false;
    }
    case "isEmpty":
      return isEmptyValue(valueAt(condition.path));
    case "and":
      return (condition.conditions ?? []).every((nestedCondition) =>
        evaluateCondition(nestedCondition, data, registry, rowContext, context),
      );
    case "or":
      return (condition.conditions ?? []).some((nestedCondition) =>
        evaluateCondition(nestedCondition, data, registry, rowContext, context),
      );
    case "not":
      return condition.condition == null
        ? true
        : !evaluateCondition(condition.condition, data, registry, rowContext, context);
    case "custom": {
      const name = condition.name;
      if (name == null) {
        return false;
      }

      const evaluator = registry.condition.get(name);
      return evaluator == null ? false : evaluator({ condition, data, rowContext, context });
    }
    default:
      return false;
  }
}

export function evaluateBooleanLike(
  value: boolean | WorkbookConditionDefinition | undefined,
  data: WorkbookData,
  registry: CorePluginSlots,
  fallback: boolean,
  rowContext?: WorkbookRowContext,
  context?: ConditionContext,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return evaluateCondition(value, data, registry, rowContext, context);
}
