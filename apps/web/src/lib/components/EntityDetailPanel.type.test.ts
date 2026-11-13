import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  `${process.cwd()}/src/lib/components/EntityDetailPanel.svelte`,
  "utf8",
);

describe("EntityDetailPanel type", () => {
  it("is not monospace at the root", () => {
    const aside = source.match(/<aside[^>]*>/)?.[0] ?? "";
    expect(aside).toContain("font-body");
    expect(aside).not.toContain("font-mono");
  });

  it("uses EntityNotices for the demo notice", () => {
    expect(source).toContain("<EntityNotices");
    expect(source).not.toContain("TRANSIENT MODE");
  });

  it("reads header, then tabs, then the overview", () => {
    const header = source.indexOf("<DetailHeader");
    const tabs = source.indexOf("<DetailTabs");
    const status = source.indexOf("<DetailStatusTab");
    expect(header).toBeGreaterThan(-1);
    expect(header).toBeLessThan(tabs);
    expect(tabs).toBeLessThan(status);
  });

  it("shows the large image block only when editing or without text", () => {
    expect(source).toMatch(
      /\{#if isEditing \|\| !activeEntity\.content\?\.trim\(\)\}\s*<DetailImage/,
    );
  });
});
