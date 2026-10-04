import { describe, expect, it } from "vitest";
import {
  HelpContextSchema,
  sanitizeHelpContext,
  withoutPanelFlags,
} from "../src/context";
import { PANEL_FLAGS } from "../src/actions/catalogue";
import { buildActionCandidates } from "../src/actions";
import { FEATURE_REGISTRY, validateRegistry } from "../src/registry";
import { featureMatchesScreen } from "../src/registry/matches-screen";
import { retrieve } from "../src/retrieval";
import { buildRealBundle } from "./eval/evaluate";
import { KNOWN_HELP_IDS } from "./fixtures/help-article-ids";

const feature = (id: string) => FEATURE_REGISTRY.find((f) => f.id === id)!;
const explorer = feature("entity-explorer");
const shelf = feature("entity-shelf");

const screen = (over: Record<string, unknown> = {}) =>
  sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "graph",
    mode: "view",
    ...over,
  });

describe("panel flags in the screen description", () => {
  it("accepts the open-panel flags", () => {
    const ctx = screen({ flags: ["explorer-open", "shelf-open"] });

    expect(ctx.flags).toEqual(["explorer-open", "shelf-open"]);
    expect(HelpContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("still drops a flag it does not know", () => {
    expect(screen({ flags: ["explorer-open", "made-up"] }).flags).toEqual([
      "explorer-open",
    ]);
  });

  it("lists exactly the two panels", () => {
    expect([...PANEL_FLAGS]).toEqual(["explorer-open", "shelf-open"]);
  });
});

describe("withoutPanelFlags", () => {
  it("removes only the panel flags and keeps every other fact", () => {
    const ctx = screen({
      area: "entity-detail",
      entityKind: "character",
      tab: "status",
      flags: [
        "generators",
        "explorer-open",
        "connections-editable",
        "shelf-open",
      ],
      availableActions: ["status-tab"],
    });
    const stripped = withoutPanelFlags(ctx);

    expect(stripped.flags).toEqual(["generators", "connections-editable"]);
    expect({ ...stripped, flags: [] }).toEqual({ ...ctx, flags: [] });
  });

  it("does not change the description it was given", () => {
    const ctx = screen({ flags: ["explorer-open"] });
    withoutPanelFlags(ctx);

    expect(ctx.flags).toEqual(["explorer-open"]);
  });

  it("leaves a description with no panel flags as it was", () => {
    const ctx = screen({ flags: ["generators"] });

    expect(withoutPanelFlags(ctx)).toEqual(ctx);
  });

  it("produces a description the strict schema still accepts", () => {
    const stripped = withoutPanelFlags(screen({ flags: ["shelf-open"] }));

    expect(HelpContextSchema.safeParse(stripped).success).toBe(true);
  });
});

describe("a panel feature is on screen exactly while its flag is present", () => {
  it("matches on any screen while the panel is open", () => {
    for (const ctx of [
      screen({ flags: ["explorer-open"] }),
      screen({
        area: "canvas",
        routeTemplate: "/(app)/canvas",
        flags: ["explorer-open"],
      }),
      screen({ area: "settings", tab: "vault", flags: ["explorer-open"] }),
      screen({
        area: "entity-detail",
        entityKind: "item",
        tab: "stats",
        flags: ["explorer-open"],
      }),
    ])
      expect(featureMatchesScreen(explorer, ctx), ctx.area).toBe(true);
  });

  it("does not match once the panel is closed, whatever the screen", () => {
    for (const ctx of [
      screen(),
      screen({ area: "other" }),
      screen({ area: "other", routeTemplate: "/(app)/table" }),
      screen({ flags: ["shelf-open"] }),
    ])
      expect(featureMatchesScreen(explorer, ctx), ctx.area).toBe(false);
  });

  it("keeps the two panels independent", () => {
    const both = screen({ flags: ["explorer-open", "shelf-open"] });
    const onlyShelf = screen({ flags: ["shelf-open"] });

    expect(featureMatchesScreen(explorer, both)).toBe(true);
    expect(featureMatchesScreen(shelf, both)).toBe(true);
    expect(featureMatchesScreen(explorer, onlyShelf)).toBe(false);
    expect(featureMatchesScreen(shelf, onlyShelf)).toBe(true);
  });

  it("sits beside the screen's own features instead of replacing them", () => {
    const ctx = screen({ area: "graph", flags: ["explorer-open"] });
    const ids = FEATURE_REGISTRY.filter((f) =>
      featureMatchesScreen(f, ctx),
    ).map((f) => f.id);

    expect(ids).toContain("graph-view");
    expect(ids).toContain("entity-explorer");
  });

  it("is what 'What can I do here?' lists for an open panel", () => {
    const bundle = buildRealBundle();
    const open = retrieve(
      "What can I do here?",
      bundle,
      screen({ flags: ["explorer-open"] }),
    );
    const closed = retrieve("What can I do here?", bundle, screen());

    expect(open.screenFeatures.map((f) => f.id)).toContain("entity-explorer");
    expect(closed.screenFeatures.map((f) => f.id)).not.toContain(
      "entity-explorer",
    );
    expect(closed.screenFeatures.map((f) => f.id)).toContain("graph-view");
  });
});

describe("an open panel lifts its own guide", () => {
  const bundle = buildRealBundle();
  // Worded without the word "Shelf": it matches backup and sync guides first.
  const question = "How do I copy an entry into another vault?";
  const firstShelfRank = (flags: string[]) => {
    const sources = retrieve(question, bundle, screen({ flags })).chunks.map(
      (c) => c.chunk.sourceId,
    );
    const index = sources.findIndex((id) => id.includes("entity-shelf"));
    return index < 0 ? Infinity : index;
  };

  it("brings the Shelf into the top three only while the Shelf is open", () => {
    expect(firstShelfRank([])).toBeGreaterThanOrEqual(3);
    expect(firstShelfRank(["shelf-open"])).toBeLessThan(3);
  });

  it("does not lift it for a different panel", () => {
    expect(firstShelfRank(["explorer-open"])).toBe(firstShelfRank([]));
  });
});

describe("panel entries", () => {
  it("only offer Help, even with every panel available", () => {
    const deps = { helpIds: new Set(buildRealBundle().helpIds) };
    for (const entry of [explorer, shelf]) {
      const offered = buildActionCandidates(
        entry.actions,
        screen({
          flags: [entry.whenFlag!],
          availableActions: ["settings-vault", "status-tab"],
        }),
        deps,
      );
      expect(
        offered.map((ref) => ref.action.type),
        entry.id,
      ).toEqual(["openHelp"]);
    }
  });

  it("say plainly that rejecting a draft deletes it", () => {
    const text = JSON.stringify(explorer);

    expect(text).toMatch(/Reject draft deletes it/);
  });

  it("say plainly that the Shelf is not a backup", () => {
    expect(shelf.summary).toMatch(/not a backup/);
  });
});

describe("registry validation of panel features", () => {
  const deps = { helpIds: new Set<string>(KNOWN_HELP_IDS) };

  it("accepts the real panel entries", () => {
    expect(validateRegistry(FEATURE_REGISTRY, deps)).toEqual([]);
  });

  it("rejects a panel feature that lists tabs", () => {
    const bad = { ...explorer, tabs: ["vault"] };

    expect(validateRegistry([bad], deps)).toContain(
      "Feature entity-explorer: a panel feature cannot list tabs",
    );
  });

  it("rejects a panel feature limited to one kind of entry", () => {
    const bad = { ...explorer, kinds: ["character"] };

    expect(validateRegistry([bad], deps)).toContain(
      "Feature entity-explorer: a panel feature must apply to any kind",
    );
  });

  it("rejects a flag that is not a panel flag", () => {
    const bad = { ...explorer, whenFlag: "generators" };

    expect(validateRegistry([bad], deps).length).toBeGreaterThan(0);
  });
});
