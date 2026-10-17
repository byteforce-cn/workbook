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

import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname ?? __dirname, "../..");

const runtimeCodeGeneration = /\bnew\s+Function\s*\(|\beval\s*\(/;

describe("D8: strict CSP compatibility", () => {
  it("does not generate or evaluate code at runtime in src/", () => {
    const offenders: string[] = [];

    for (const file of globSync("src/**/*.{ts,tsx}", { cwd: ROOT })) {
      const source = readFileSync(resolve(ROOT, file), "utf8");

      // Skip comments so documentation of the constraint is allowed.
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      if (runtimeCodeGeneration.test(withoutComments)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("documents the CSP requirements and the precompiled-validator escape hatch", () => {
    const guide = readFileSync(resolve(ROOT, "docs-site/guides/content-security-policy.md"), "utf8");

    expect(guide).toContain("script-src 'self'");
    expect(guide).toContain("validate=");
    expect(guide).toContain("ajv/dist/standalone");
  });
});
