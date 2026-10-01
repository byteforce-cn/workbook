/**
 * D7: Bundle 体积分析
 *
 * Verifies that built bundle sizes stay within acceptable thresholds.
 * Run after `pnpm build` (tsup).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const DIST_DIR = resolve(import.meta.dirname ?? __dirname, "../../dist");
const distAvailable = existsSync(resolve(DIST_DIR, "index.js"));

if (!distAvailable) {
  console.warn("\n[bundle-size] dist/ not found — run `pnpm build` first; skipping threshold checks.\n");
}

interface BundleEntry {
  file: string;
  rawBytes: number;
  gzipBytes: number;
}

function analyzeBundle(fileName: string): BundleEntry {
  const filePath = resolve(DIST_DIR, fileName);
  const raw = readFileSync(filePath);
  const gzip = gzipSync(raw, { level: 9 });
  return {
    file: fileName,
    rawBytes: raw.length,
    gzipBytes: gzip.length,
  };
}

// ---- thresholds (from rectification plan: core gzip < 50KB) ----

const THRESHOLDS: Record<string, { rawMaxKb: number; gzipMaxKb: number }> = {
  "index.js": { rawMaxKb: 80, gzipMaxKb: 25 },
  "core.js": { rawMaxKb: 40, gzipMaxKb: 15 },
  "react.js": { rawMaxKb: 20, gzipMaxKb: 8 },
  "quick.js": { rawMaxKb: 15, gzipMaxKb: 5 },
};

describe("D7: Bundle size analysis", () => {
  if (!distAvailable) {
    it.skip("bundle size checks (run `pnpm build` first)", () => {});
    return;
  }

  const entries: BundleEntry[] = [];

  for (const fileName of Object.keys(THRESHOLDS)) {
    const entry = analyzeBundle(fileName);
    entries.push(entry);

    it(`${fileName} is within size thresholds`, () => {
      const threshold = THRESHOLDS[fileName];
      expect(entry.rawBytes).toBeLessThan(threshold.rawMaxKb * 1024);
      expect(entry.gzipBytes).toBeLessThan(threshold.gzipMaxKb * 1024);
    });
  }

  it("prints bundle size report", () => {
    console.log("\n=== Bundle Size Report ===");
    console.log("Entry         Raw (KB)   Gzip (KB)");
    console.log("────────────  ─────────  ─────────");
    for (const e of entries) {
      console.log(
        `${e.file.padEnd(14)} ${(e.rawBytes / 1024).toFixed(1).padStart(7)}   ${(e.gzipBytes / 1024).toFixed(1).padStart(7)}`,
      );
    }
    console.log("");

    // Core entry must be < 50KB gzip (rectification plan acceptance criteria)
    const coreEntry = entries.find((e) => e.file === "core.js");
    if (coreEntry) {
      expect(coreEntry.gzipBytes).toBeLessThan(50 * 1024);
    }

    // Main entry must be < 50KB gzip
    const indexEntry = entries.find((e) => e.file === "index.js");
    if (indexEntry) {
      expect(indexEntry.gzipBytes).toBeLessThan(50 * 1024);
    }
  });
});
