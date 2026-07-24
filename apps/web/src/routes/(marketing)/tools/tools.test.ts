import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tools directory", () => {
  it("groups faction-style generators under RPG generators", () => {
    const source = readFileSync(
      join(process.cwd(), "src/routes/(marketing)/tools/+page.svelte"),
      "utf8",
    );

    expect(source).toContain('title: "RPG Generators"');
    expect(source).toContain('title: "Factions & Organizations"');
    expect(source).toContain('href: "/tools/faction-generator"');
    expect(source).toContain('href: "/tools/vampire-clan-generator"');
  });

  it("lists a single consolidated migration section including the hub, scabard, and thread-weaver", () => {
    const source = readFileSync(
      join(process.cwd(), "src/routes/(marketing)/tools/+page.svelte"),
      "utf8",
    );

    expect(source.match(/title: "Migration & Imports"/g)).toHaveLength(1);
    expect(source).not.toContain("Migration & Importer Hubs");
    expect(source).toContain('href: "/migrations"');
    expect(source).toContain('href: "/import/scabard"');
    expect(source).toContain('href: "/import/thread-weaver"');
  });
});
