import { defineConfig } from "unlighthouse";

export default defineConfig({
  // The site to audit
  site: "http://localhost:4173",
  outputPath: "./audit-report",

  // Puppeteer configuration for headless environment
  puppeteerOptions: {
    executablePath:
      "/home/espen/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },

  // Exclude test routes from the SEO audit
  scanner: {
    exclude: ["/test/*", "/test"],
  },

  // Set score thresholds for CI
  ci: {
    budget: {
      performance: 80,
      accessibility: 90,
      "best-practices": 90,
      seo: 90,
    },
  },

  // UI settings for the local dashboard
  ui: {
    showSideBar: true,
  },
});
