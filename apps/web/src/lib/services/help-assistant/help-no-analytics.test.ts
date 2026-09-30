import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const lib = resolve(__dirname, "../..");
const roots = [
  "components/help-assistant",
  "stores/help-assistant",
  "services/help-assistant",
].map((p) => join(lib, p));
const extra = [join(lib, "config/help-assistant.ts")];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|svelte)$/.test(name) && !/\.(test|spec)\./.test(name)
      ? [path]
      : [];
  });
}

const files = [...roots.flatMap(sources), ...extra];

describe("the help assistant adds no client-side tracking (FR-028)", () => {
  it("covers the files it should", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => f.endsWith("HelpAssistantPanel.svelte"))).toBe(
      true,
    );
  });

  it("imports nothing from the analytics layer or a tracking library", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/services\/analytics/);
      expect(text, file).not.toMatch(
        /zaraz|gtag|plausible|posthog|mixpanel|segment|amplitude|sendBeacon/i,
      );
    }
  });

  it("makes no network call except the one help request", () => {
    const callers = files.filter((f) =>
      /\bfetch\(|XMLHttpRequest|WebSocket/.test(readFileSync(f, "utf8")),
    );
    expect(callers.map((f) => f.split("/").pop())).toEqual(["help-client.ts"]);
  });
});
