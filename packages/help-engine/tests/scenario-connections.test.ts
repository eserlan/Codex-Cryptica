import { describe, expect, it } from "vitest";
import { buildActionCandidates } from "../src/actions";
import { buildBundle } from "../src/bundle";
import { sanitizeHelpContext } from "../src/context";
import { FEATURE_REGISTRY } from "../src/registry";
import { retrieve } from "../src/retrieval";

const article = (id: string, title: string, content: string) => ({
  id,
  title,
  content,
});

// Condensed from the real articles: same ideas, same vocabulary.
const bundle = buildBundle({
  features: FEATURE_REGISTRY,
  articles: [
    article(
      "connections-tab",
      "Connections Tab",
      "## Where the links come from\nThe Connections tab is a read-only picture. Nothing here is stored twice: it is built from the connections you manage in the Status tab, so adding, editing, or removing a connection there changes what you see here.",
    ),
    article(
      "connection-labels",
      "Connection Labels",
      "## Labels\nGive a connection a label such as ally or rival.",
    ),
    article(
      "proposer-guide",
      "Connections Proposer",
      "## Automated Discovery\nReview suggested relationships the Oracle finds between entities in your campaign.",
    ),
    article(
      "graph-basics",
      "Graph Basics",
      "## Nodes\nThe graph draws every entry as a node and every connection as a line. Select a node to see its links.",
    ),
    article(
      "entity-reports",
      "Entity Reports",
      "## Reports\nCollect information about chosen entities into a report.",
    ),
    article(
      "session-hub",
      "Session Hub",
      "## Drafts\nGenerated drafts collect in the Session Hub.",
    ),
    article(
      "in-app-generators",
      "Generators",
      "## Generate\nGenerate characters, factions and locations. A faction generator makes a guild with a leader.",
    ),
    article(
      "generate-related",
      "Generate Related",
      "## Related\nGenerate entries related to the one you are viewing.",
    ),
    article(
      "random-tables-decks",
      "Random Tables",
      "## Tables\nRoll on tables and draw from decks.",
    ),
    article(
      "spatial-canvas",
      "spatial-canvas",
      "## spatial-canvas\nAbout spatial-canvas.",
    ),
    article(
      "canvas-add-entities",
      "canvas-add-entities",
      "## canvas-add-entities\nAbout canvas-add-entities.",
    ),
    article("map-mode", "map-mode", "## map-mode\nAbout map-mode."),
    article("vtt-session", "vtt-session", "## vtt-session\nAbout vtt-session."),
    article("fog-of-war", "fog-of-war", "## fog-of-war\nAbout fog-of-war."),
    article("vtt-tokens", "vtt-tokens", "## vtt-tokens\nAbout vtt-tokens."),
    article(
      "vtt-combat-initiative",
      "vtt-combat-initiative",
      "## vtt-combat-initiative\nAbout vtt-combat-initiative.",
    ),
    article(
      "vtt-fog-player-view",
      "vtt-fog-player-view",
      "## vtt-fog-player-view\nAbout vtt-fog-player-view.",
    ),
    article(
      "vtt-solo-play",
      "vtt-solo-play",
      "## vtt-solo-play\nExplore a fogged map alone. Turn fog and solo on. Move the party to reveal hexes, track travel, undo moves, and record them in the Session Journal.",
    ),
    article(
      "vtt-grids-measurement",
      "vtt-grids-measurement",
      "## vtt-grids-measurement\nAbout vtt-grids-measurement.",
    ),
    article(
      "vtt-tiles-layers-notes",
      "vtt-tiles-layers-notes",
      "## vtt-tiles-layers-notes\nAbout vtt-tiles-layers-notes.",
    ),
    article(
      "vtt-multiplayer",
      "vtt-multiplayer",
      "## vtt-multiplayer\nAbout vtt-multiplayer.",
    ),
    article(
      "vtt-troubleshooting",
      "vtt-troubleshooting",
      "## vtt-troubleshooting\nAbout vtt-troubleshooting.",
    ),
    article(
      "hexcrawl-maps",
      "hexcrawl-maps",
      "## hexcrawl-maps\nAbout hexcrawl-maps.",
    ),
    article(
      "creating-and-editing-entities",
      "creating-and-editing-entities",
      "## creating-and-editing-entities\nAbout creating-and-editing-entities.",
    ),
    article(
      "default-entity-templates",
      "default-entity-templates",
      "## default-entity-templates\nAbout default-entity-templates.",
    ),
    article(
      "export-and-backup",
      "export-and-backup",
      "## export-and-backup\nAbout export-and-backup.",
    ),
    article(
      "cloud-backup",
      "cloud-backup",
      "## cloud-backup\nAbout cloud-backup.",
    ),
    article(
      "offline-sync",
      "offline-sync",
      "## offline-sync\nAbout offline-sync.",
    ),
    article("publishing", "publishing", "## publishing\nAbout publishing."),
    article(
      "oracle-guide",
      "oracle-guide",
      "## oracle-guide\nAbout oracle-guide.",
    ),
    article(
      "chat-commands",
      "chat-commands",
      "## chat-commands\nAbout chat-commands.",
    ),
    article("themes", "themes", "## themes\nAbout themes."),
    article(
      "categories-and-labels",
      "categories-and-labels",
      "## categories-and-labels\nAbout categories-and-labels.",
    ),
    article(
      "entity-table",
      "entity-table",
      "## entity-table\nAbout entity-table.",
    ),
    article("dice-roller", "dice-roller", "## dice-roller\nAbout dice-roller."),
    article(
      "adventure-mode",
      "adventure-mode",
      "## adventure-mode\nAbout adventure-mode.",
    ),
    article(
      "entity-explorer",
      "entity-explorer",
      "## entity-explorer\nAbout entity-explorer.",
    ),
    article(
      "entity-shelf",
      "entity-shelf",
      "## entity-shelf\nAbout entity-shelf.",
    ),
    article("importing", "importing", "## importing\nAbout importing."),
    article(
      "thread-weaver-import",
      "thread-weaver-import",
      "## thread-weaver-import\nAbout thread-weaver-import.",
    ),
    ...[
      "quicknote",
      "stat-sheets",
      "sharing-templates",
      "chronology",
      "family-tree",
      "guided-mode",
      "session-prep",
    ].map((id) => article(id, id, `## ${id}\nAbout ${id}.`)),
  ],
  commit: "t",
  builtAt: "t",
  channel: "production",
});

const question = "How do I connect the faction I just created?";
const deps = { helpIds: new Set(bundle.helpIds) };

const settlementConnections = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  flags: ["connections-editable"],
  availableActions: ["status-tab", "connections-tab"],
});

const graphScreen = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "graph",
  mode: "view",
  availableActions: ["graph"],
});

describe("Settlement → Connections scenario", () => {
  it("treats the Connections screen as the Entity Connections feature", () => {
    const result = retrieve(
      "What does the Connections tab do?",
      bundle,
      settlementConnections,
    );
    expect(result.noMatch).toBe(false);
    expect(result.chunks.map((c) => c.chunk.sourceId)).toContain(
      "connections-tab",
    );
  });

  it("offers open-Status-then-highlight-Add, never a bare Add on the Connections tab", () => {
    const refs = bundle.features.flatMap((f) => f.actions);
    const offered = buildActionCandidates(refs, settlementConnections, deps);
    const guide = offered.find((c) => c.id === "connections.add-guide");
    expect(guide?.action.type).toBe("openPanel");
    expect(guide?.action.then?.type).toBe("highlight");
  });

  it("does not offer the connection guide from the graph", () => {
    const refs = bundle.features.flatMap((f) => f.actions);
    const offered = buildActionCandidates(refs, graphScreen, deps).map(
      (c) => c.id,
    );
    expect(offered).not.toContain("connections.add-guide");
    expect(offered).toContain("graph.open");
  });

  it("answers the same question differently per screen: the Graph screen is not boosted toward the Connections tab guidance", () => {
    const fromConnections = retrieve(question, bundle, settlementConnections);
    const fromGraph = retrieve(question, bundle, graphScreen);
    expect(fromConnections.screenFeatures.map((f) => f.id)).toContain(
      "entity-connections",
    );
    expect(fromGraph.screenFeatures.map((f) => f.id)).toContain("graph-view");
    expect(fromGraph.screenFeatures.map((f) => f.id)).not.toContain(
      "entity-connections",
    );
  });
});
