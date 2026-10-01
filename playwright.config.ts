import { defineConfig, devices } from "@playwright/test";

declare const process: {
  env: Record<string, string | undefined>;
};

const slowMo = process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:6008",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: slowMo > 0 ? { slowMo } : undefined,
  },
  webServer: {
    command: "./node_modules/.bin/storybook dev --port 6008 --config-dir .storybook --ci",
    url: "http://localhost:6008",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
