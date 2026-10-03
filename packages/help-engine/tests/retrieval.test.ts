import { describe, expect, it } from "vitest";
import type { HelpChunk, KnowledgeBundle } from "../src/bundle";
import { sanitizeHelpContext } from "../src/context";
import { FEATURE_REGISTRY } from "../src/registry";
import {
  MIN_RELEVANCE,
  contextualizeQuery,
  cosineSimilarity,
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
      [registry, otherRegistry, { ...filler[0], embedding: [1, 0] }],
      FEATURE_REGISTRY,
      connectionsScreen,
      [1, 0],
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
    expect(result.chunks.length).toBeLessThanOrEqual(4);
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

describe("retrieve — one feature cannot fill every slot", () => {
  const publishing = chunk(
    "publishing#0",
    "Publish a snapshot of your world so other people can read it. Publishing makes a public copy.",
    { featureId: "session-hub" },
  );
  const backupParts = [0, 1, 2].map((n) =>
    chunk(
      `backup-${n}#0`,
      `Export a backup of your world as one file. Backup part ${n} explains the file and how to restore it.`,
      { featureId: "tables", sourceId: `backup-${n}`, helpId: `backup-${n}` },
    ),
  );
  const screen = sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "other",
    mode: "view",
  });

  it("gives the third slot to a different feature that clears the floor", () => {
    const result = retrieve(
      "Is exporting a backup file the same as publishing?",
      bundle([...backupParts, publishing, ...filler]),
      screen,
      { limit: 3 },
    );
    const ids = result.chunks.map((c) => c.chunk.id);
    expect(ids).toContain("publishing#0");
    expect(
      ids.filter((id) => id.startsWith("backup-")).length,
    ).toBeLessThanOrEqual(2);
  });

  it("keeps a relevant third chunk from the same feature when nothing else clears the floor", () => {
    const result = retrieve(
      "How do I export a backup of my world?",
      bundle([...backupParts, ...filler]),
      screen,
    );
    expect(result.chunks.map((c) => c.chunk.id).sort()).toEqual([
      "backup-0#0",
      "backup-1#0",
      "backup-2#0",
    ]);
  });
});

describe("text handling — comparison words", () => {
  it("does not treat 'difference between' or 'same as' as topics", () => {
    expect(
      tokenize("What is the difference between the graph and the canvas?"),
    ).toEqual(tokenize("the graph and the canvas"));
    expect(tokenize("Is a pin the same as a connection?")).toEqual(
      tokenize("a pin a connection"),
    );
  });
});

describe("semantic vector retrieval", () => {
  const v1 = [1, 0, 0, 0];
  const v2 = [0.95, 0.05, 0, 0];
  const v3 = [0, 1, 0, 0];

  it("calculates cosine similarity correctly", () => {
    expect(cosineSimilarity(v1, v1)).toBeCloseTo(1.0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
    expect(cosineSimilarity(v1, v2)).toBeGreaterThan(0.9);
  });

  it("rejects empty, unequal, and non-finite vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 1000])).toBe(0);
    expect(cosineSimilarity([Number.NaN], [1])).toBe(0);
  });

  it("retrieves semantically matching chunks even with zero lexical word overlap", () => {
    const semanticChunk = {
      ...chunk("graph-basics#0", "visualize relationships in node network"),
      embedding: [0.95, 0.05, 0, 0],
    };
    const unrelatedChunk = {
      ...chunk("backup#0", "save your archive file to disk"),
      embedding: [0, 1, 0, 0],
    };

    // Query terms "lore web" have 0 word overlap with "visualize relationships in node network"
    const result = retrieve(
      "lore web",
      bundle([semanticChunk, unrelatedChunk]),
      connectionsScreen,
      { queryVector: [1, 0, 0, 0] },
    );

    expect(result.noMatch).toBe(false);
    expect(result.chunks.map((c) => c.chunk.id)).toContain("graph-basics#0");
  });

  it("falls back to lexical matching when queryVector is not provided", () => {
    const semanticChunk = {
      ...chunk("graph-basics#0", "node network connections"),
      embedding: [0.95, 0.05, 0, 0],
    };

    const result = retrieve(
      "node network connections",
      bundle([semanticChunk]),
      connectionsScreen,
    );

    expect(result.noMatch).toBe(false);
    expect(result.chunks[0].chunk.id).toBe("graph-basics#0");
    expect(result.chunks[0].lexical).toBeGreaterThan(0);
  });

  describe("conversational follow-up retrieval", () => {
    it("augments anaphoric follow-up question with substantive topic from history", () => {
      const history = [
        { role: "user" as const, text: "tell me of connections" },
        {
          role: "assistant" as const,
          text: "Connections link entities together.",
        },
      ];
      const out = contextualizeQuery("how to make them?", history);
      expect(out).toBe("how to make them? (tell me of connections)");
    });

    it("uses the earlier topic when a follow-up refers to it as they", () => {
      const history = [
        { role: "user" as const, text: "How do I create connections?" },
        {
          role: "assistant" as const,
          text: "Connections link entities together.",
        },
        { role: "user" as const, text: "Do they appear on maps?" },
        {
          role: "assistant" as const,
          text: "Connected entities can have map pins.",
        },
      ];

      expect(
        contextualizeQuery("Can I edit them from the graph?", history),
      ).toBe("Can I edit them from the graph? (How do I create connections?)");
    });

    it("leaves self-contained query untouched despite history", () => {
      const history = [
        { role: "user" as const, text: "tell me of connections" },
        {
          role: "assistant" as const,
          text: "Connections link entities together.",
        },
      ];
      const out = contextualizeQuery("how do I roll dice?", history);
      expect(out).toBe("how do I roll dice?");
    });

    it("retrieves connection chunks for 'how to make them?' when history is provided", () => {
      const connChunk = chunk(
        "connections-tab#0",
        "Link and connect entities together across your campaign.",
        { featureId: "entity-connections" },
      );
      const testBundle = bundle([connChunk, ...filler]);
      const history = [
        { role: "user" as const, text: "tell me of connections" },
        {
          role: "assistant" as const,
          text: "In the Graph, you can explore entities as nodes and their connections as lines.",
        },
      ];

      // Without history, "how to make them?" stems to ["creat"] and fails the floor
      const withoutHistory = retrieve(
        "how to make them?",
        testBundle,
        connectionsScreen,
      );
      expect(withoutHistory.noMatch).toBe(true);

      // With history, it contextualizes and successfully retrieves connections-tab
      const withHistory = retrieve(
        "how to make them?",
        testBundle,
        connectionsScreen,
        { history },
      );
      expect(withHistory.noMatch).toBe(false);
      expect(withHistory.chunks.map((c) => c.chunk.id)).toContain(
        "connections-tab#0",
      );
    });
  });
});

describe("citation article suggestions", () => {
  it("uses the article title when the registry chunk comes first", () => {
    const registry = chunk("registry:connections#0", "Connect entries", {
      kind: "registry",
      helpId: "connections-tab",
      title: "Entity Connections",
      citationTitle: "Connections Tab",
    });
    const result = retrieve(
      "unrelated gibberish",
      bundle([registry, connections]),
      connectionsScreen,
    );
    expect(result.noMatch).toBe(true);
    expect(result.suggestions).toContainEqual({
      helpId: "connections-tab",
      title: "Connections Tab",
    });
  });
});

describe("ordinary wording and source diversity", () => {
  it("matches makes and US spelling without treating related generation as connecting", () => {
    expect(stem("makes")).toBe(stem("make"));
    expect(stem("rumor")).toBe(stem("rumours"));
    expect(stem("gossip")).toBe(stem("rumour"));
    expect(stem("related")).not.toBe(stem("connection"));
    expect(tokenize("Is there something that makes rumours?")).toEqual([
      stem("create"),
      stem("rumour"),
    ]);
  });

  it("does not let sections of one article crowd a second subject out of the top three", () => {
    const parts = [0, 1, 2].map((n) =>
      chunk(`same#${n}`, "map map map canvas", {
        sourceId: "same",
        helpId: "same",
      }),
    );
    const other = chunk("other#0", "canvas canvas map", {
      sourceId: "other",
      helpId: "other",
      title: "Canvas map",
    });
    const result = retrieve(
      "map versus canvas",
      bundle([...parts, other]),
      sanitizeHelpContext({}),
      { limit: 3 },
    );
    expect(result.noMatch).toBe(false);
    expect(result.chunks.map(({ chunk }) => chunk.sourceId)).toContain("other");
  });

  it("does not fill diversity slots with unrelated material", () => {
    const relevant = chunk("map#0", "map map map");
    const unrelated = chunk("other#0", "potatoes cooking oven");
    const result = retrieve(
      "map",
      bundle([relevant, unrelated]),
      sanitizeHelpContext({}),
    );
    expect(result.chunks.map(({ chunk }) => chunk.id)).toEqual(["map#0"]);
  });
});
