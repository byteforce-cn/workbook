/**
 * Framework-agnostic condition evaluation engine.
 * Evaluates condition definitions against a data tree with plugin support.
 */

import type { WorkbookConditionDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";
import { getValueAtPath } from "../data/pathUtils";
import type { CorePluginSlots } from "../registry/registry";

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
): boolean {
  switch (condition.op) {
    case "eq":
      return getValueAtPath(data, condition.path ?? "", rowContext) === condition.value;
    case "neq":
      return getValueAtPath(data, condition.path ?? "", rowContext) !== condition.value;
    case "gt":
      return compareValues(getValueAtPath(data, condition.path ?? "", rowContext), condition.value) > 0;
    case "gte":
      return compareValues(getValueAtPath(data, condition.path ?? "", rowContext), condition.value) >= 0;
    case "lt":
      return compareValues(getValueAtPath(data, condition.path ?? "", rowContext), condition.value) < 0;
    case "lte":
      return compareValues(getValueAtPath(data, condition.path ?? "", rowContext), condition.value) <= 0;
    case "in": {
      const source = condition.value;
      if (!Array.isArray(source)) {
        return false;
      }
      return source.includes(getValueAtPath(data, condition.path ?? "", rowContext));
    }
    case "contains": {
      const currentValue = getValueAtPath(data, condition.path ?? "", rowContext);
      if (Array.isArray(currentValue)) {
        return currentValue.includes(condition.value);
      }
      if (typeof currentValue === "string") {
        return currentValue.includes(String(condition.value ?? ""));
      }
      return false;
    }
    case "isEmpty":
      return isEmptyValue(getValueAtPath(data, condition.path ?? "", rowContext));
    case "and":
      return (condition.conditions ?? []).every((nestedCondition) =>
        evaluateCondition(nestedCondition, data, registry, rowContext),
      );
    case "or":
      return (condition.conditions ?? []).some((nestedCondition) =>
        evaluateCondition(nestedCondition, data, registry, rowContext),
      );
    case "not":
      return condition.condition == null ? true : !evaluateCondition(condition.condition, data, registry, rowContext);
    case "custom": {
      const name = condition.name;
      if (name == null) {
        return false;
      }

      const evaluator = registry.condition.get(name);
      return evaluator == null ? false : evaluator({ condition, data, rowContext });
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
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return evaluateCondition(value, data, registry, rowContext);
}
