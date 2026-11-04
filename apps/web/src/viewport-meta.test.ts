import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const html = fs.readFileSync(path.resolve(__dirname, "app.html"), "utf-8");
const viewport = html.match(/name="viewport"\s+content="([^"]+)"/)?.[1] ?? "";

describe("viewport meta", () => {
  it("lets Android Chrome resize the page for the on-screen keyboard", () => {
    // Without this, Chrome overlays the keyboard and fixed bottom controls
    // (the Adventure composer) can end up under its toolbar.
    expect(viewport.split(/\s*,\s*/)).toContain(
      "interactive-widget=resizes-content",
    );
  });

  it("keeps the existing scaling and safe-area settings", () => {
    const parts = viewport.split(/\s*,\s*/);
    expect(parts).toContain("width=device-width");
    expect(parts).toContain("initial-scale=1");
    expect(parts).toContain("viewport-fit=cover");
    expect(parts.some((part) => part.startsWith("maximum-scale"))).toBe(false);
  });
});
