import { KNOWN_HELP_IDS } from "./fixtures/help-article-ids";
import { describe, expect, it } from "vitest";
import { HELP_AREAS } from "../src/context";
import {
  FEATURE_REGISTRY,
  filterByChannel,
  validateRegistry,
  type FeatureEntry,
} from "../src/registry";

const helpIds = new Set<string>(KNOWN_HELP_IDS);

const base = FEATURE_REGISTRY[0];
const clone = (over: Partial<FeatureEntry>): FeatureEntry => ({
  ...base,
  ...over,
});

describe("proof-of-concept registry", () => {
  it("is internally consistent against the known help articles", () => {
    expect(validateRegistry(FEATURE_REGISTRY, { helpIds })).toEqual([]);
  });

  it("has something to say on every screen area except the catch-all", () => {
    const covered = new Set(FEATURE_REGISTRY.flatMap((f) => f.areas));
    for (const area of HELP_AREAS.filter((a) => a !== "other")) {
      expect(covered.has(area), `no feature covers "${area}"`).toBe(true);
    }
  });

  it("lists a Settings tab only on a Settings feature", () => {
    for (const feature of FEATURE_REGISTRY) {
      const settingsTabs = feature.tabs.filter((t) =>
        [
          "vault",
          "intelligence",
          "schema",
          "templates",
          "theme",
          "publishing",
          "about",
          "help",
        ].includes(t),
      );
      if (settingsTabs.length > 0) {
        expect(feature.areas, feature.id).toEqual(["settings"]);
      }
    }
  });

  it("covers the proof-of-concept areas and the phase A expansion", () => {
    expect(FEATURE_REGISTRY.map((f) => f.id).sort()).toEqual(
      [
        "archive-import",
        "backup-and-restore",
        "campaign-generator",
        "canvas",
        "entity-connections",
        "entity-editing",
        "graph-view",
        "related-entity-generation",
        "session-hub",
        "tables",
        "vtt-map",
        "session-journal",
        "entity-reports",
        "stat-sheets",
        "entity-templates",
        "chronology",
        "family-tree",
        "guided-mode",
        "session-prep",
        "publishing",
        "lore-oracle",
        "theme-settings",
        "schema-settings",
        "entity-table",
        "dice-roller",
        "solo-adventure",
        "entity-explorer",
        "entity-shelf",
        "solo-session",
      ].sort(),
    );
  });

  it("points the connection guide at the Status tab, not the Connections tab", () => {
    const entry = FEATURE_REGISTRY.find((f) => f.id === "entity-connections")!;
    const guide = entry.actions.find((a) => a.id === "connections.add-guide")!;
    expect(guide.action.type).toBe("openPanel");
    expect(guide.action.then?.type).toBe("highlight");
  });
});

describe("validateRegistry failures", () => {
  it("flags a duplicate feature id", () => {
    const errors = validateRegistry([base, clone({ title: "Again" })], {
      helpIds,
    });
    expect(errors.join("\n")).toContain(
      "Duplicate feature id: entity-connections",
    );
  });

  it("flags a missing help article", () => {
    const errors = validateRegistry([clone({ helpIds: ["nope"] })], {
      helpIds,
    });
    expect(errors.join("\n")).toContain('unknown help article "nope"');
  });

  it("flags an unknown related feature", () => {
    const errors = validateRegistry([clone({ related: ["ghost"] })], {
      helpIds,
    });
    expect(errors.join("\n")).toContain('unknown related feature "ghost"');
  });

  it("flags an action target that is not in the catalogue", () => {
    const bad = clone({
      actions: [
        {
          id: "x.bad",
          action: { type: "highlight", target: "not-a-control", label: "x" },
        } as never,
      ],
    });
    expect(validateRegistry([bad], { helpIds }).join("\n")).toContain(
      "Feature entity-connections",
    );
  });

  it("flags a workflow using an action the entry does not list", () => {
    const bad = clone({
      workflows: [
        {
          id: "w",
          title: "W",
          steps: ["do it"],
          actionIds: ["missing.action"],
        },
      ],
    });
    expect(validateRegistry([bad], { helpIds }).join("\n")).toContain(
      'uses action "missing.action"',
    );
  });

  it("flags an openHelp action pointing at an unknown article", () => {
    const bad = clone({
      actions: [
        {
          id: "h.open",
          action: { type: "openHelp", helpId: "ghost", label: "Help" },
        },
      ],
      workflows: [],
    });
    expect(validateRegistry([bad], { helpIds }).join("\n")).toContain(
      'opens unknown help "ghost"',
    );
  });

  it("flags missing required fields", () => {
    const errors = validateRegistry([{ id: "half-done" }], { helpIds });
    expect(errors[0]).toContain("Feature half-done");
  });
});

describe("filterByChannel", () => {
  const staging = clone({
    id: "staging-only",
    channel: "staging",
    related: [],
  });

  it("drops staging-only entries from a production bundle", () => {
    const ids = filterByChannel([base, staging], "production").map((f) => f.id);
    expect(ids).toEqual(["entity-connections"]);
  });

  it("keeps them for staging", () => {
    expect(filterByChannel([base, staging], "staging")).toHaveLength(2);
  });
});
