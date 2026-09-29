import { describe, it, expect } from "vitest";
import { effectiveDefaultId, resolveTemplateMarkdown } from "../src/resolve";
import type { EntityTemplate, TemplateDefaults } from "../src/types";

const t = (over: Partial<EntityTemplate>): EntityTemplate => ({
  id: "x",
  name: "X",
  entityType: "character",
  sections: [],
  source: "user",
  version: 1,
  ...over,
});

const builtin = t({
  id: "builtin:character",
  source: "builtin",
  markdown: "## Built-in\n",
});
const legacy = t({
  id: "legacy:character",
  source: "legacy",
  markdown: "LEGACY",
});
const user = t({
  id: "u1",
  sections: [{ id: "a", title: "Mine", hint: "h" }],
});
const noDefaults: TemplateDefaults = { version: 1, defaults: {} };

const run = (
  templates: EntityTemplate[],
  defaults: TemplateDefaults = noDefaults,
  extra: { themeBuiltin?: string; genericBuiltin?: string } = {},
) =>
  resolveTemplateMarkdown({ type: "character", templates, defaults, ...extra });

describe("resolveTemplateMarkdown (FR-018)", () => {
  it("chosen default beats a legacy file", () => {
    const d = { version: 1, defaults: { character: "u1" } };
    expect(run([builtin, legacy, user], d)).toBe("## Mine\n\nh\n");
  });

  it("legacy beats the built-in", () => {
    expect(run([builtin, legacy])).toBe("LEGACY");
  });

  it("built-in row is used when nothing else applies", () => {
    expect(run([builtin])).toBe("## Built-in\n");
  });

  it("falls back to theme then generic markdown when no rows exist", () => {
    expect(
      run([], noDefaults, { themeBuiltin: "T", genericBuiltin: "G" }),
    ).toBe("T");
    expect(run([], noDefaults, { genericBuiltin: "G" })).toBe("G");
    expect(run([])).toBe("");
  });

  it("ignores a dangling default id", () => {
    const d = { version: 1, defaults: { character: "gone" } };
    expect(run([builtin, legacy], d)).toBe("LEGACY");
  });

  it("ignores a default that belongs to another type", () => {
    const d = { version: 1, defaults: { character: "loc" } };
    const loc = t({ id: "loc", entityType: "location" });
    expect(run([builtin, loc], d)).toBe("## Built-in\n");
  });

  it("an empty legacy file resolves to blank and stops the chain", () => {
    const empty = t({ id: "legacy:character", source: "legacy", markdown: "" });
    expect(run([builtin, empty])).toBe("");
  });

  it("returns original markdown for a built-in default, compiled for user", () => {
    const d = { version: 1, defaults: { character: "builtin:character" } };
    expect(run([builtin, user], d)).toBe("## Built-in\n");
  });

  it("matches the type case-insensitively", () => {
    expect(
      resolveTemplateMarkdown({
        type: "Character",
        templates: [builtin],
        defaults: noDefaults,
      }),
    ).toBe("## Built-in\n");
  });
});

describe("effectiveDefaultId", () => {
  it("prefers chosen, then legacy, then built-in", () => {
    const d = { version: 1, defaults: { character: "u1" } };
    expect(effectiveDefaultId("character", [builtin, legacy, user], d)).toBe(
      "u1",
    );
    expect(
      effectiveDefaultId("character", [builtin, legacy, user], noDefaults),
    ).toBe("legacy:character");
    expect(effectiveDefaultId("character", [builtin, user], noDefaults)).toBe(
      "builtin:character",
    );
  });

  it("is undefined when the type has no template", () => {
    expect(effectiveDefaultId("ship", [builtin], noDefaults)).toBeUndefined();
  });
});
