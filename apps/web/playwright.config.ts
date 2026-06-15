import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.E2E_PORT ?? "5173";
const baseURL = `http://localhost:${port}`;

// Read successful tests from local cache if smart mode is enabled
let testIgnore: string[] = [];
if (process.env.E2E_SMART === "true") {
  const cachePath = path.join(__dirname, ".e2e-success.json");
  if (fs.existsSync(cachePath)) {
    try {
      const successfulFiles: string[] = JSON.parse(
        fs.readFileSync(cachePath, "utf-8"),
      );
      testIgnore = successfulFiles.map((file) =>
        file.replace(/^(apps\/web\/)?tests\//, ""),
      );
      console.log(
        `[SuccessTracker] Smart Mode: Ignoring ${testIgnore.length} previously successful E2E test files.`,
      );
    } catch (e) {
      console.error("[SuccessTracker] Failed to parse success cache:", e);
    }
  }
}

const reporters: any[] = [
  [process.env.CI ? "github" : "list"],
  [path.join(__dirname, "tests", "success-tracker-reporter.ts")],
];

export default defineConfig({
  testDir: "./tests",
  testIgnore,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: reporters,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bun run dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
