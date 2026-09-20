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

  it("links the World Generator from the adventure and worldbuilding group", () => {
    const source = readFileSync(
      join(process.cwd(), "src/routes/(marketing)/tools/+page.svelte"),
      "utf8",
    );

    expect(source).toContain('title: "Adventure & Worldbuilding"');
    expect(source).toContain('href: "/generators/world"');
    expect(source).toContain('href: "/generators/plot-twist-generator"');
    expect(source).toContain('label: "Sci-Fi World Generator"');
    expect(source).not.toContain('title: "Browse by Theme"');
    expect(source).not.toContain('href: "/generators/cosmic-horror"');
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

  it("links the Idea Developer next to the adventure generator, in the adventure group", () => {
    const source = readFileSync(
      join(process.cwd(), "src/routes/(marketing)/tools/+page.svelte"),
      "utf8",
    );

    const group = source.indexOf('title: "Adventure & Worldbuilding"');
    const developer = source.indexOf('href: "/tools/idea-developer"');
    const adventure = source.indexOf('href: "/generators/adventure-generator"');
    expect(developer).toBeGreaterThan(group);
    expect(adventure).toBeGreaterThan(group);
    expect(Math.abs(developer - adventure)).toBeLessThan(1200);
    expect(source).toContain('label: "Idea Developer"');
    expect(source).toContain("develops it instead of replacing it");
  });

  it("gives the Idea Developer a route that exists", () => {
    const route = join(
      process.cwd(),
      "src/routes/(marketing)/tools/idea-developer/+page.svelte",
    );
    expect(readFileSync(route, "utf8")).toContain("IdeaDeveloperTool");
  });
});
