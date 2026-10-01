/**
 * Framework-agnostic bind resolution.
 * Resolves bind definitions against a data tree and applies formatting.
 */

import { getValueAtPath } from "../data/pathUtils";
import type { BindDefinition, WorkbookData, WorkbookRowContext } from "../types";

export function formatBoundValue(value: unknown, format?: string): unknown {
  if (format == null || format.trim() === "") {
    return value;
  }

  if (value == null) {
    return value;
  }

  switch (format) {
    case "upper":
      return typeof value === "string" ? value.toUpperCase() : value;
    case "lower":
      return typeof value === "string" ? value.toLowerCase() : value;
    case "trim":
      return typeof value === "string" ? value.trim() : value;
    case "json":
      return JSON.stringify(value);
    case "date":
      return value instanceof Date ? value.toISOString() : String(value);
    default:
      return value;
  }
}

export function resolveBindValue(bind: BindDefinition, data: WorkbookData, rowContext?: WorkbookRowContext): unknown {
  const rawValue = getValueAtPath(data, bind.path, rowContext);
  const value = rawValue ?? bind.placeholder;
  return formatBoundValue(value, bind.format);
}

export function bindAllowsRead(bind?: BindDefinition): boolean {
  if (bind == null) {
    return false;
  }

  return bind.mode !== "oneWayToData";
}

export function bindAllowsWrite(bind?: BindDefinition): boolean {
  if (bind == null) {
    return false;
  }

  return bind.mode === "twoWay" || bind.mode === "oneWayToData";
}
