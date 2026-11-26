/**
 * Canonical JSON serialization for workbook documents.
 *
 * The rules are part of the integrity contract — changing them invalidates
 * every previously published content hash and signature:
 *
 * 1. object keys are sorted lexicographically;
 * 2. numbers use `Number.prototype.toString()` semantics, `-0` becomes `0`,
 *    and non-finite numbers throw;
 * 3. strings use `JSON.stringify` semantics;
 * 4. array order is preserved;
 * 5. object keys holding `undefined` are dropped, `null` is kept;
 * 6. no whitespace is emitted.
 */

const RULE_VERSION = 1;

export function canonicalRuleVersion(): number {
  return RULE_VERSION;
}

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError("Canonical JSON does not support NaN or Infinity.");
  }
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      assertFiniteNumber(value);
      // `JSON.stringify` already emits `0` for `-0` and the ECMAScript number
      // string form for everything else.
      return JSON.stringify(value === 0 ? 0 : value);
    }
    case "undefined":
      throw new TypeError("Canonical JSON does not support undefined values.");
    case "function":
    case "symbol":
    case "bigint":
      throw new TypeError(`Canonical JSON does not support ${typeof value} values.`);
    default:
      break;
  }

  if (seen.has(value as object)) {
    throw new TypeError("Canonical JSON does not support circular references.");
  }

  seen.add(value as object);

  try {
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (const item of value) {
        items.push(serialize(item, seen));
      }
      return `[${items.join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const entries: string[] = [];
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry === undefined) {
        continue;
      }
      entries.push(`${JSON.stringify(key)}:${serialize(entry, seen)}`);
    }
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(value as object);
  }
}

/**
 * Serialize any JSON-compatible value into its canonical byte form.
 *
 * Throws on values that have no canonical JSON representation instead of
 * silently producing ambiguous output.
 */
export function canonicalize(value: unknown): string {
  return serialize(value, new Set());
}

/** UTF-8 bytes of the canonical serialization. */
export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalize(value));
}
