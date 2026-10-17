/**
 * Built-in i18n key gate.
 *
 * `WORKBOOK_I18N_KEYS` is the supported surface for localising workbook's own
 * copy, and `docs-site/guides/i18n.md` is where hosts look them up. This gate
 * keeps the table honest in both directions: every key the code resolves must be
 * documented, and no documented key may be invented.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname ?? __dirname, "../..");

const source = readFileSync(resolve(ROOT, "src/core/i18n/i18n.ts"), "utf8");
const guide = readFileSync(resolve(ROOT, "docs-site/guides/i18n.md"), "utf8");

/** `KEY_NAME: "workbook.some.key"` entries of WORKBOOK_I18N_KEYS. */
const declaredKeys = [...source.matchAll(/^\s{2}[A-Z_]+:\s*"([^"]+)"/gm)].map((match) => match[1]);

/** Keys documented in the guide's markdown table. */
const documentedKeys = [...guide.matchAll(/^\|\s*`(workbook\.[a-z.]+)`/gm)].map((match) => match[1]);

describe("D8: built-in i18n keys", () => {
  it("declares the keys it documents", () => {
    expect(declaredKeys.length).toBeGreaterThan(0);
    expect([...declaredKeys].sort()).toEqual([...documentedKeys].sort());
  });
});
