import { describe, expect, it } from "vitest";
import {
  GENERATORS,
  buildBundle,
  generatorActionRefs,
  validateAction,
} from "../src";
import { FEATURE_REGISTRY } from "../src/registry";
import { sanitizeHelpContext } from "../src/context";
import { retrieve } from "../src/retrieval";

const bundle = buildBundle({
  features: FEATURE_REGISTRY,
  articles: [
    "connections-tab",
    "connection-labels",
    "graph-basics",
    "session-hub",
    "in-app-generators",
    "generate-related",
    "random-tables-decks",
  ].map((id) => ({ id, title: id, content: `## ${id}\nText about ${id}.` })),
  commit: "t",
  builtAt: "t",
  channel: "production",
});

const screen = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "generators",
  surface: "vault",
  flags: ["generators"],
});

const chunk = (id: string) =>
  bundle.chunks.find((c) => c.id === `generator:${id}#0`)!;

describe("generatorActionRefs", () => {
  it("offers to open the generator a retrieved chunk is about", () => {
    const refs = generatorActionRefs([chunk("quest")]);
    expect(refs).toEqual([
      {
        id: "generators.open-quest",
        action: {
          type: "openGenerator",
          generatorId: "quest",
          label: expect.stringContaining("Quest"),
        },
      },
    ]);
  });

  it("offers nothing for chunks that are not generators", () => {
    const other = bundle.chunks.find(
      (c) => !c.sourceId.startsWith("generator:"),
    )!;
    expect(generatorActionRefs([other])).toEqual([]);
  });

  it("never offers more than three, in the order retrieved, without repeats", () => {
    const refs = generatorActionRefs(
      ["npc", "faction", "quest", "heist", "dungeon", "npc"].map(chunk),
    );
    expect(refs.map((r) => r.id)).toEqual([
      "generators.open-npc",
      "generators.open-faction",
      "generators.open-quest",
    ]);
  });

  it("produces actions that validate when generators are available, and not when they are not", () => {
    const [ref] = generatorActionRefs([chunk("heist")]);
    const deps = { helpIds: new Set<string>() };
    expect(validateAction(ref.action, screen, deps)).toEqual(ref.action);
    const off = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "graph",
      flags: [],
    });
    expect(validateAction(ref.action, off, deps)).toBeNull();
  });

  it("is reachable from a plain request such as making a quest", () => {
    const result = retrieve("how do I make a quest", bundle, screen);
    expect(result.noMatch).toBe(false);
    expect(
      generatorActionRefs(result.chunks.map((c) => c.chunk)).map((r) => r.id),
    ).toContain("generators.open-quest");
  });

  it("covers every generator that exists", () => {
    for (const g of GENERATORS) {
      const [ref] = generatorActionRefs([chunk(g.id)]);
      expect(ref.action).toMatchObject({
        type: "openGenerator",
        generatorId: g.id,
      });
    }
  });
});
