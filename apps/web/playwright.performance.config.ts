import { defineConfig, devices } from "@playwright/test";

const port = process.env.PERFORMANCE_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;

/** Production-preview configuration for reproducible large-vault measurements. */
export default defineConfig({
  testDir: "./tests/performance",
  testMatch: "large-vault.operations.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PERFORMANCE_EXTERNAL_SERVER
    ? undefined
    : {
        command: `bun run build && bun run preview --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
