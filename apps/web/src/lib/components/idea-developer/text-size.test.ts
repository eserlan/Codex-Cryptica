import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * The Idea Developer is read and typed into on phones. Text smaller than 14px
 * was reported as too small, and an input under 16px makes iOS zoom in on
 * focus. This guards the classes so it does not creep back.
 */
const components = resolve(__dirname);
const page = resolve(
  __dirname,
  "../../../routes/(marketing)/tools/idea-developer/+page.svelte",
);

const files = [
  ...readdirSync(components)
    .filter((name) => name.endsWith(".svelte"))
    .map((name) => join(components, name)),
  page,
];

describe("Idea Developer text sizes", () => {
  it("finds the files it is meant to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map((f) => [f.split("/").slice(-2).join("/"), f]))(
    "%s uses no phone text below 16px",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      // Phone-first: an unprefixed size is the phone size. Only `sm:` and up
      // may step down to text-sm.
      expect(source).not.toMatch(/(?<![\w:-])text-(xs|sm)(?![\w-])/);
      const arbitrary = [
        ...source.matchAll(/(?<![\w:-])text-\[(\d+)px\]/g),
      ].map((m) => Number(m[1]));
      expect(arbitrary.filter((px) => px < 16)).toEqual([]);
    },
  );

  it("sets both text areas to 18px on a phone (never under 16px, so it does not zoom)", () => {
    for (const name of [
      "IdeaDeveloperTool.svelte",
      "FollowUpComposer.svelte",
    ]) {
      const source = readFileSync(join(components, name), "utf8");
      const textarea =
        source.match(/<textarea[\s\S]*?><\/textarea>/)?.[0] ?? "";
      expect(textarea, name).toMatch(/(?<![\w:-])text-lg(?![\w-])/);
      expect(textarea, name).not.toMatch(/(?<![\w:-])text-(xs|sm)(?![\w-])/);
    }
  });

  it("gives every button a touch-friendly height", () => {
    const missing: string[] = [];
    for (const name of [
      "IdeaDeveloperTool.svelte",
      "FollowUpComposer.svelte",
      "CopyButton.svelte",
    ]) {
      const source = readFileSync(join(components, name), "utf8");
      // A button either has its classes inline, or uses a shared class string.
      const shared = source.match(/const button =\s*"([^"]*)"/)?.[1];
      const starts = [...source.matchAll(/<button\b/g)].map((m) => m.index!);
      expect(starts.length, name).toBeGreaterThan(0);
      for (const start of starts) {
        const rest = source.slice(start);
        const inline = rest.match(/class="([^"]*)"/)?.[1];
        const usesShared = /class=\{button\}/.test(
          rest.slice(0, rest.indexOf(">") + 200),
        );
        const classes = usesShared ? shared : inline;
        if (!classes?.includes("min-h-11")) missing.push(`${name}@${start}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
