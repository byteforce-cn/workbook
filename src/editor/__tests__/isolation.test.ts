/**
 * Static import gate: editor modules must not import the main entry.
 *
 * Importing `src/index.ts` from `src/editor/` would create a cycle and pull the
 * whole renderer surface into the editor bundle.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const EDITOR_DIR = resolve(import.meta.dirname ?? __dirname, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("editor import isolation", () => {
  it("never imports src/index.ts", () => {
    const offenders = sourceFiles(EDITOR_DIR).filter((file) =>
      /from\s+["'](\.\.\/)+(index|\.\.\/index)["']/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
