import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated production-build config for service-worker regression tests (#5096).
 *
 * The default playwright.config.ts runs the Vite dev server, where
 * registerServiceWorker() returns early and no worker is ever installed, so it
 * cannot exercise the installed worker. These specs serve a completed
 * production build themselves (see tests/service-worker-public-bypass.spec.ts,
 * whose static server also simulates deploys), so this config starts no
 * webServer — but `bun run build` must have run first.
 *
 * Run with:
 *   bun run build
 *   bunx playwright test --config=playwright.sw.config.ts
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/service-worker-*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
