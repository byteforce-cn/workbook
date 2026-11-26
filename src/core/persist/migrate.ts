/**
 * `schemaVersion` migration registry.
 *
 * Fail-closed by design: a version with no registered path throws instead of
 * being guessed at, matching the strictness of the schema loader.
 */

import { validateWorkbookDocument, type WorkbookValidationResult } from "../../schema";
import type { WorkbookDefinition } from "../../schema/generated-types";

export type WorkbookMigration = (workbook: WorkbookDefinition) => WorkbookDefinition;

const migrations = new Map<string, Map<string, WorkbookMigration>>();

/** The schema version this library ships support for. */
export const CURRENT_SCHEMA_VERSION = "4.1.1";

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

/** Register a one-step migration. Re-registering the same edge replaces it. */
export function registerMigration(from: string, to: string, migrate: WorkbookMigration): void {
  const edges = migrations.get(from) ?? new Map<string, WorkbookMigration>();
  edges.set(to, migrate);
  migrations.set(from, edges);
}

/** Remove every registered migration (test/tenant isolation). */
export function clearMigrations(): void {
  migrations.clear();
}

/** Every version reachable from the registry, including the current one. */
export function supportedSchemaVersions(): string[] {
  const versions = new Set<string>([CURRENT_SCHEMA_VERSION]);
  for (const [from, edges] of migrations) {
    versions.add(from);
    for (const to of edges.keys()) {
      versions.add(to);
    }
  }
  return [...versions].sort(compareVersions);
}

function findPath(from: string, to: string): string[] | null {
  if (from === to) {
    return [from];
  }

  const queue: string[][] = [[from]];
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const path = queue.shift() as string[];
    const current = path[path.length - 1];
    const edges = [...(migrations.get(current)?.keys() ?? [])].sort(compareVersions);

    for (const next of edges) {
      if (visited.has(next)) {
        continue;
      }

      const nextPath = [...path, next];
      if (next === to) {
        return nextPath;
      }

      visited.add(next);
      queue.push(nextPath);
    }
  }

  return null;
}

export interface MigrateWorkbookOptions {
  /** Target version. Defaults to `CURRENT_SCHEMA_VERSION`. */
  to?: string;
  /** Validator used after migration. Defaults to the bundled AJV schema. */
  validate?: (workbook: unknown) => WorkbookValidationResult;
}

export interface MigrateWorkbookResult {
  workbook: WorkbookDefinition;
  /** Version steps applied, e.g. `["4.0.0 → 4.1.0", "4.1.0 → 4.1.1"]`. */
  applied: string[];
}

/**
 * Migrate a workbook to the target schema version.
 *
 * Throws when no migration path exists, when a step produces a document that
 * fails validation, or when the target version is unknown.
 */
export function migrateWorkbook(
  workbook: WorkbookDefinition,
  options: MigrateWorkbookOptions = {},
): MigrateWorkbookResult {
  const target = options.to ?? CURRENT_SCHEMA_VERSION;
  const from = workbook.schemaVersion;
  const path = findPath(from, target);

  if (path == null) {
    const supported = supportedSchemaVersions().join(", ");
    throw new Error(
      `[workbook] No migration path from schemaVersion "${from}" to "${target}". ` +
        `Supported versions: ${supported}. Register a migration with registerMigration(from, to, fn).`,
    );
  }

  let current = workbook;
  const applied: string[] = [];

  for (let index = 0; index < path.length - 1; index += 1) {
    const stepFrom = path[index];
    const stepTo = path[index + 1];
    const migrate = migrations.get(stepFrom)?.get(stepTo);

    if (migrate == null) {
      throw new Error(`[workbook] Migration edge ${stepFrom} → ${stepTo} disappeared while migrating.`);
    }

    current = migrate(current);
    applied.push(`${stepFrom} → ${stepTo}`);
  }

  if (current.schemaVersion !== target) {
    throw new Error(
      `[workbook] Migration ended at schemaVersion "${current.schemaVersion}" but "${target}" was requested.`,
    );
  }

  const validation = (options.validate ?? validateWorkbookDocument)(current);
  if (!validation.valid) {
    throw new Error(
      `[workbook] Migrated document failed schema validation: ${validation.errors
        .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
        .join("; ")}`,
    );
  }

  return { workbook: current, applied };
}
