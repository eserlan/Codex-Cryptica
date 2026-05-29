import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Web App Smoke Test", () => {
  it("should have narrowed SvelteKit preload-data scope on the body to 'tap'", () => {
    const appHtmlPath = path.resolve(__dirname, "app.html");
    const appHtmlContent = fs.readFileSync(appHtmlPath, "utf-8");

    // Assert that we are using the optimized "tap" preloading on body instead of "hover"
    expect(appHtmlContent).toContain('data-sveltekit-preload-data="tap"');
    expect(appHtmlContent).not.toContain('data-sveltekit-preload-data="hover"');
  });
});
