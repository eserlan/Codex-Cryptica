import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Cif is the assistant's name (short for "cipher"). Nothing a person sees or
// hears should call it a generic "help assistant" (#3616).
const dir = __dirname;
const components = readdirSync(dir).filter(
  (name) => name.endsWith(".svelte") && !name.includes(".test."),
);

const markupOf = (file: string) =>
  readFileSync(join(dir, file), "utf8")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

describe("Cif naming", () => {
  it("finds the components to check", () => {
    expect(components.length).toBeGreaterThan(5);
  });

  it.each(components)(
    "%s shows or announces no generic 'help assistant'",
    (file) => {
      expect(markupOf(file)).not.toMatch(/help assistant/i);
    },
  );

  it("labels the panel and its controls with the name", () => {
    const panel = markupOf("HelpAssistantPanel.svelte");
    expect(panel).toContain('aria-label="Cif, the Codex guide"');
    expect(panel).toContain('aria-label="Close Cif"');
  });
});
