import { describe, expect, it } from "vitest";
import { GENERATORS } from "help-engine";
import { listGenerators } from "generator-engine";

/**
 * The help package may not import the generator registry, so it carries a
 * generated copy of each generator's id, label and description. This test is
 * what keeps that copy honest: add, remove or rename a generator, or reword its
 * description, and it fails until `bun scripts/sync-help-generators.ts` is run.
 */
describe("help generators list", () => {
  const registry = listGenerators().map((g) => ({
    id: g.id,
    label: g.label,
    description: g.description,
  }));

  it("matches the generator registry exactly, in the same order", () => {
    expect(
      GENERATORS.map((g) => ({ ...g })),
      "run `bun scripts/sync-help-generators.ts` to refresh packages/help-engine/src/registry/generators.generated.ts",
    ).toEqual(registry);
  });

  it("would notice a generator being added or removed", () => {
    const missingOne = GENERATORS.slice(1).map((g) => g.id);
    expect(missingOne).not.toEqual(registry.map((g) => g.id));
    expect(registry.length).toBe(GENERATORS.length);
  });
});
