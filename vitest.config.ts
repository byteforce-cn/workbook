import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}", "stories/**/*.test.{ts,tsx}"],
    exclude: ["tests/fixtures/conformance/**"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test-setup.ts",
        "stories/**",
        "tests/fixtures/**",
        "src/schema/generated-types.ts",
        "src/schema/support-matrix.ts",
      ],
      reporter: ["text-summary", "html"],
      // Ratchet-only policy: raise these as coverage improves, never lower.
      // Recalibrated 2026-10-01 with the Vitest 4 upgrade (v8 coverage pipeline
      // rework; observed baseline: statements 67.2 / branches 52.4 / functions
      // 66.7 / lines 67.6). Ratchet up from here, never down.
      thresholds: {
        statements: 66,
        branches: 51,
        functions: 65,
        lines: 66,
      },
    },
  },
});
