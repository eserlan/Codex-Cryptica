import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Web App Smoke Test", () => {
  it("disables periodic SvelteKit version polling", () => {
    const config = fs.readFileSync(
      path.resolve(__dirname, "../vite.config.ts"),
      "utf-8",
    );
    expect(config).toMatch(/version:\s*\{\s*pollInterval:\s*0\s*\}/);
  });

  it("should have narrowed SvelteKit preload-data scope on the body to 'tap'", () => {
    const appHtmlPath = path.resolve(__dirname, "app.html");
    const appHtmlContent = fs.readFileSync(appHtmlPath, "utf-8");

    // Assert that we are using the optimized "tap" preloading on body instead of "hover"
    expect(appHtmlContent).toContain('data-sveltekit-preload-data="tap"');
    expect(appHtmlContent).not.toContain('data-sveltekit-preload-data="hover"');
  });

  it("uses each SvelteKit placeholder exactly once, never inside a script", () => {
    const appHtmlContent = fs.readFileSync(
      path.resolve(__dirname, "app.html"),
      "utf-8",
    );

    // SvelteKit fills only the first occurrence, so a second copy (even in a
    // comment) receives the whole <head> and leaves the real one as text.
    for (const placeholder of ["%sveltekit.head%", "%sveltekit.body%"]) {
      expect(appHtmlContent.split(placeholder)).toHaveLength(2);
    }
    const inlineScripts = [
      ...appHtmlContent.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),
    ].map((match) => match[1]);
    expect(inlineScripts.length).toBeGreaterThan(0);
    for (const script of inlineScripts) {
      expect(script).not.toMatch(/%sveltekit\.[a-z.]+%/);
    }
  });

  it("should bootstrap first-paint font stacks to prevent heading FOUT (#3145)", () => {
    const appHtmlPath = path.resolve(__dirname, "app.html");
    const appHtmlContent = fs.readFileSync(appHtmlPath, "utf-8");

    // Functional Supers headings resolve to Oswald; Bangers is display-only.
    expect(appHtmlContent).toContain("Oswald");
    expect(appHtmlContent).toContain("--font-header-val");
    expect(appHtmlContent).toContain("--font-body-val");
    expect(appHtmlContent).toContain("--font-display-val");
    const fontMap = appHtmlContent.match(
      /const fonts = \{([\s\S]*?)\n\s*\};/,
    )?.[1];
    expect(fontMap).toBeDefined();
    expect(fontMap).toMatch(
      /western_dark:\s*\{[^}]*body:\s*"'Inter', sans-serif",?\s*\}/,
    );
  });
});
