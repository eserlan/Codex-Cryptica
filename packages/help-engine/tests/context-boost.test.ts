import { describe, expect, it } from "vitest";
import type { HelpChunk } from "../src/bundle";
import { sanitizeHelpContext } from "../src/context";
import { FEATURE_REGISTRY } from "../src/registry";
import { SCREEN_BOOST_FULL_AT, rankChunks, retrieve } from "../src/retrieval";
import { SCREENS } from "./eval/questions";
import { buildRealBundle } from "./eval/evaluate";

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

const connectionsScreen = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  availableActions: ["status-tab", "connections-tab"],
});

// Unrelated filler so BM25 statistics behave like a real corpus.
const filler = [
  chunk("tables#0", "Roll on random tables and draw from decks."),
  chunk("themes#0", "Pick a theme and change colours for your vault."),
  chunk("map#0", "Upload an image and pin notes to a map."),
  chunk("timeline#0", "Place events on the timeline and calendar."),
];

// On the Connections screen, this guide is boosted by up to 0.35.
const onScreen = (text: string) =>
  chunk("connections-tab#0", text, { featureId: "entity-connections" });
const offScreen = (text: string) =>
  chunk("default-templates#0", text, { featureId: "entity-templates" });

describe("screen boost is scaled by how well the chunk matches (#3617)", () => {
  const question = "set the default template for a new character";

  it("does not let an on-screen chunk with a token overlap outrank the guide that answers the question", () => {
    const ranked = rankChunks(
      question,
      [
        onScreen(
          "Connect two entries from the Status tab. This is a new link.",
        ),
        offScreen(
          "Pick the default template. Many other words about colours fonts spacing layout panels sidebars tooltips shortcuts exports imports backups syncing publishing sharing.",
        ),
        ...filler,
      ],
      FEATURE_REGISTRY,
      connectionsScreen,
    );

    expect(ranked[0].chunk.id).toBe("default-templates#0");
  });

  it("still gives a strongly matching on-screen chunk the full boost", () => {
    const ranked = rankChunks(
      "connect two entries from the status tab",
      [onScreen("Connect two entries from the Status tab."), ...filler],
      FEATURE_REGISTRY,
      connectionsScreen,
    );
    const top = ranked[0];

    expect(top.lexical).toBeGreaterThanOrEqual(SCREEN_BOOST_FULL_AT);
    // Boost is score minus match strength, with no exact-title bonus here.
    expect(top.score - top.lexical).toBeGreaterThan(0.3);
  });

  it("gives a weakly matching on-screen chunk only part of the boost", () => {
    const ranked = rankChunks(
      question,
      [
        onScreen(
          "Connect two entries from the Status tab. This is a new link.",
        ),
        ...filler,
      ],
      FEATURE_REGISTRY,
      connectionsScreen,
    );
    const weak = ranked.find((r) => r.chunk.id === "connections-tab#0")!;

    expect(weak.lexical).toBeGreaterThan(0);
    expect(weak.lexical).toBeLessThan(SCREEN_BOOST_FULL_AT);
    const boost = weak.score - weak.lexical;
    expect(boost).toBeGreaterThan(0);
    // Full boost on this screen is 0.35; this match earns well under that.
    expect(boost).toBeLessThan(0.3);
  });

  it("never boosts a chunk that shares no word with the question", () => {
    const ranked = rankChunks(
      question,
      [onScreen("Zebra giraffe antelope."), ...filler],
      FEATURE_REGISTRY,
      connectionsScreen,
    );

    expect(
      ranked.find((r) => r.chunk.id === "connections-tab#0"),
    ).toBeUndefined();
  });
});

describe("real help articles (#3617)", () => {
  const bundle = buildRealBundle();
  const topSources = (question: string, screen: string, n: number) =>
    retrieve(question, bundle, SCREENS[screen])
      .chunks.slice(0, n)
      .map((c) => c.chunk.sourceId);

  it("answers 'generate entries related to this one' from the Connections tab with the generator guidance", () => {
    expect(
      topSources(
        "How do I generate entries related to this one?",
        "connections",
        2,
      ),
    ).toContain("registry:related-entity-generation");
    expect(
      topSources(
        "How do I generate entries related to this one?",
        "connections",
        1,
      )[0],
    ).not.toBe("registry:entity-connections");
  });

  it("finds the default-template guide from Settings instead of unrelated on-screen guides", () => {
    expect(
      topSources(
        "How do I set the default template for a new character?",
        "settings",
        3,
      ),
    ).toContain("default-entity-templates");
  });

  it("keeps the headline: a newly created faction still gets Connections guidance on the Connections tab", () => {
    expect(
      topSources(
        "How do I connect the faction I just created?",
        "connections",
        3,
      ),
    ).toContain("connections-tab");
  });
});
