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
      thresholds: {
        statements: 62,
        branches: 74,
        functions: 86,
        lines: 62,
      },
    },
  },
});
