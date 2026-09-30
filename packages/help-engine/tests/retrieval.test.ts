import { describe, expect, it } from "vitest";
import type { HelpChunk, KnowledgeBundle } from "../src/bundle";
import { sanitizeHelpContext } from "../src/context";
import { FEATURE_REGISTRY } from "../src/registry";
import {
  MIN_RELEVANCE,
  rankChunks,
  retrieve,
  stem,
  tokenize,
} from "../src/retrieval";

const chunk = (
  id: string,
  text: string,
  over: Partial<HelpChunk> = {},
): HelpChunk => ({
  id,
  sourceId: id.split("#")[0],
  kind: "help",
  featureId: null,
  helpId: id.split("#")[0],
  title: id.split("#")[0],
  heading: "",
  text,
  hash: id,
  ...over,
});

const connections = chunk(
  "connections-tab#0",
  "Connect a guild or faction to this entry. Add a connection from the Status tab, then pick the guild.",
  { featureId: "entity-connections" },
);
const generator = chunk(
  "guild-generator#0",
  "Generate a guild with a name, a leader, and a headquarters. Connect the generator to your vault.",
  { featureId: "campaign-generator" },
);
const filler = [
  chunk("tables#0", "Roll on random tables and draw from decks.", {
    featureId: "tables",
  }),
  chunk("graph-basics#0", "The graph shows nodes and lines for every entry.", {
    featureId: "graph-view",
  }),
  chunk("themes#0", "Pick a theme and change colours for your vault."),
];

const bundle = (chunks: HelpChunk[]): KnowledgeBundle => ({
  version: 1,
  commit: "t",
  builtAt: "t",
  channel: "production",
  chunks,
  features: [...FEATURE_REGISTRY],
  helpIds: [...new Set(chunks.map((c) => c.helpId!).filter(Boolean))],
});

const connectionsScreen = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  availableActions: ["status-tab", "connections-tab"],
});

describe("text handling", () => {
  it("matches connect, connections and connecting to one term", () => {
    expect(
      new Set(["connect", "connections", "connecting", "connection"].map(stem))
        .size,
    ).toBe(1);
  });

  it("treats entry, entries, entity and entities as one word", () => {
    expect(
      new Set(
        ["entry", "entries", "entity", "entities"].map((w) => tokenize(w)[0]),
      ).size,
    ).toBe(1);
  });

  it("maps link and relationship to connect and drops stopwords", () => {
    expect(tokenize("How do I link the faction?")).toEqual(["connect", "fact"]);
  });
});

describe("rankChunks", () => {
  it("ranks the context-matching Connections chunk above a generic generator chunk for the same words", () => {
    const ranked = rankChunks(
      "how do I connect the guild",
      [generator, connections, ...filler],
      FEATURE_REGISTRY,
      connectionsScreen,
    );
    expect(ranked[0].chunk.id).toBe("connections-tab#0");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("without screen context the generic chunk is not boosted over the connections one", () => {
    const off = sanitizeHelpContext({ area: "other" });
    const ranked = rankChunks(
      "generate a guild",
      [generator, connections],
      FEATURE_REGISTRY,
      off,
    );
    expect(ranked[0].chunk.id).toBe("guild-generator#0");
  });

  it("never lets context rescue a chunk with no word overlap", () => {
    const ranked = rankChunks(
      "quantum chromodynamics",
      [connections, ...filler],
      FEATURE_REGISTRY,
      connectionsScreen,
    );
    expect(ranked).toEqual([]);
  });

  it("is deterministic on ties", () => {
    const a = chunk("a#0", "connect entries");
    const b = chunk("b#0", "connect entries");
    const order = (chunks: HelpChunk[]) =>
      rankChunks("connect", chunks, FEATURE_REGISTRY, connectionsScreen).map(
        (r) => r.chunk.id,
      );
    expect(order([b, a])).toEqual(order([a, b]));
    expect(order([a, b])).toEqual(["a#0", "b#0"]);
  });

  it("answers a no-content-word question from the screen's own registry chunks", () => {
    const registry = chunk("registry:entity-connections#0", "Link entries.", {
      kind: "registry",
      featureId: "entity-connections",
      helpId: null,
    });
    const otherRegistry = chunk("registry:tables#0", "Roll tables.", {
      kind: "registry",
      featureId: "tables",
      helpId: null,
    });
    const ranked = rankChunks(
      "what can I do here?",
      [registry, otherRegistry, ...filler],
      FEATURE_REGISTRY,
      connectionsScreen,
    );
    expect(ranked.map((r) => r.chunk.id)).toEqual([
      "registry:entity-connections#0",
    ]);
  });
});

describe("retrieve", () => {
  it("returns the top chunks for a relevant question", () => {
    const result = retrieve(
      "How do I connect the guild?",
      bundle([generator, connections, ...filler]),
      connectionsScreen,
    );
    expect(result.noMatch).toBe(false);
    expect(result.chunks[0].chunk.id).toBe("connections-tab#0");
    expect(result.chunks.length).toBeLessThanOrEqual(3);
  });

  it("returns no match below the relevance floor, so the model is never called", () => {
    const result = retrieve(
      "Can I export my vault to Roll20?",
      bundle([connections, ...filler]),
      connectionsScreen,
    );
    expect(result.noMatch).toBe(true);
    expect(result.chunks).toEqual([]);
    expect(result.topRelevance).toBeLessThan(MIN_RELEVANCE);
  });

  it("suggests the closest help topics when nothing matches", () => {
    const result = retrieve(
      "Can I export my vault to Roll20?",
      bundle([connections, ...filler]),
      connectionsScreen,
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.every((s) => s.helpId && s.title)).toBe(true);
  });

  it("respects a custom limit and floor", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      chunk(`c${i}#0`, "connect entries together"),
    );
    expect(
      retrieve("connect entries", bundle(many), connectionsScreen, { limit: 2 })
        .chunks,
    ).toHaveLength(2);
    expect(
      retrieve("connect entries", bundle(many), connectionsScreen, {
        minRelevance: 2,
      }).noMatch,
    ).toBe(true);
  });
});

describe("retrieve — floor decides answerability, score decides evidence", () => {
  it("shows the on-screen chunk even when a generic chunk elsewhere overlaps more words", () => {
    const generic = chunk(
      "intro#0",
      "Connect faction created guild connect faction created. Connect faction created.",
    );
    const onScreen = chunk(
      "connections-tab#0",
      "Add a connection from the Status tab.",
      {
        featureId: "entity-connections",
      },
    );
    const result = retrieve(
      "How do I connect the faction I just created?",
      bundle([generic, onScreen, ...filler]),
      connectionsScreen,
    );
    expect(result.noMatch).toBe(false);
    expect(result.chunks.map((c) => c.chunk.id)).toContain("connections-tab#0");
  });

  it("still returns nothing when no chunk clears the floor, however the screen matches", () => {
    const onScreen = chunk(
      "connections-tab#0",
      "Add a connection from the Status tab.",
      {
        featureId: "entity-connections",
      },
    );
    const result = retrieve(
      "connect quantum chromodynamics neutrino",
      bundle([onScreen, ...filler]),
      connectionsScreen,
    );
    expect(result.noMatch).toBe(true);
    expect(result.chunks).toEqual([]);
  });
});
