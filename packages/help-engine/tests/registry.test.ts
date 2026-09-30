import { describe, expect, it } from "vitest";
import {
  FEATURE_REGISTRY,
  filterByChannel,
  validateRegistry,
  type FeatureEntry,
} from "../src/registry";

const helpIds = new Set([
  "connections-tab",
  "connection-labels",
  "graph-basics",
  "session-hub",
  "in-app-generators",
  "generate-related",
  "random-tables-decks",
]);

const base = FEATURE_REGISTRY[0];
const clone = (over: Partial<FeatureEntry>): FeatureEntry => ({
  ...base,
  ...over,
});

describe("proof-of-concept registry", () => {
  it("is internally consistent against the known help articles", () => {
    expect(validateRegistry(FEATURE_REGISTRY, { helpIds })).toEqual([]);
  });

  it("covers the five required areas", () => {
    expect(FEATURE_REGISTRY.map((f) => f.id).sort()).toEqual(
      [
        "campaign-generator",
        "entity-connections",
        "graph-view",
        "session-hub",
        "tables",
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
