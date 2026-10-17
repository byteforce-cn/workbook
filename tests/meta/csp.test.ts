/**
 * CSP gate.
 *
 * Strict CSP deployments (`script-src 'self'`, no `'unsafe-eval'`) forbid
 * runtime code generation, so the library source must never call `new Function`
 * or `eval`. Sheet formulas are parsed directly and the only remaining runtime
 * compiler is AJV's schema validator, which hosts can replace with a
 * precompiled validator through the `validate` prop (see
 * `docs-site/guides/content-security-policy.md`).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname ?? __dirname, "../..");

const runtimeCodeGeneration = /\bnew\s+Function\s*\(|\beval\s*\(/;

/** Recursive `*.ts`/`*.tsx` listing (Node 20 compatible — no `fs.globSync`). */
function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? collectSourceFiles(fullPath) : /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("D8: strict CSP compatibility", () => {
  it("does not generate or evaluate code at runtime in src/", () => {
    const offenders = collectSourceFiles(resolve(ROOT, "src")).filter((file) => {
      const source = readFileSync(file, "utf8");

      // Skip comments so documentation of the constraint is allowed.
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return runtimeCodeGeneration.test(withoutComments);
    });

    expect(offenders).toEqual([]);
  });

  it("documents the CSP requirements and the precompiled-validator escape hatch", () => {
    const guide = readFileSync(resolve(ROOT, "docs-site/guides/content-security-policy.md"), "utf8");

    expect(guide).toContain("script-src 'self'");
    expect(guide).toContain("validate=");
    expect(guide).toContain("ajv/dist/standalone");
  });
});
