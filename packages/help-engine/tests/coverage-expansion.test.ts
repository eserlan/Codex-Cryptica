import { describe, expect, it } from "vitest";
import { sanitizeHelpContext } from "../src/context";
import {
  buildActionCandidates,
  validateAction,
  ACTION_TYPES,
} from "../src/actions";
import { FEATURE_REGISTRY } from "../src/registry";
import { retrieve } from "../src/retrieval";
import { buildRealBundle } from "./eval/evaluate";
import { readFileSync } from "node:fs";

const remaining = [
  "session-journal",
  "entity-reports",
  "stat-sheets",
  "entity-templates",
  "chronology",
  "family-tree",
  "guided-mode",
  "session-prep",
];

describe("remaining contextual Help coverage", () => {
  it("tracks every registry entry and its authoritative articles in the coverage ledger", () => {
    const ledger = readFileSync(
      new URL("../../../docs/help-assistant-coverage.md", import.meta.url),
      "utf8",
    );
    for (const feature of FEATURE_REGISTRY) {
      const row = ledger
        .split("\n")
        .find((line) => line.split("|")[1]?.trim() === feature.id);
      expect(row, feature.id).toBeDefined();
      for (const helpId of feature.helpIds)
        expect(row, feature.id).toContain(helpId);
    }
  });
  it("rejects a Family panel advertised for a non-character or a tab behind an overlay", () => {
    const action = { type: "openPanel", panel: "family-tab", label: "Family" };
    const deps = { helpIds: new Set<string>() };
    expect(
      validateAction(
        action,
        sanitizeHelpContext({
          area: "entity-detail",
          entityKind: "character",
          availableActions: ["family-tab"],
        }),
        deps,
      ),
    ).not.toBeNull();
    expect(
      validateAction(
        action,
        sanitizeHelpContext({
          area: "entity-detail",
          entityKind: "item",
          availableActions: ["family-tab"],
        }),
        deps,
      ),
    ).toBeNull();
    expect(
      validateAction(
        action,
        sanitizeHelpContext({
          area: "entity-reports",
          entityKind: "character",
          availableActions: ["family-tab"],
        }),
        deps,
      ),
    ).toBeNull();
  });
  it.each(remaining)(
    "registers %s with authoritative Help and safe guidance",
    (id) => {
      const feature = FEATURE_REGISTRY.find((entry) => entry.id === id);
      expect(feature).toBeDefined();
      expect(feature!.helpIds.length).toBeGreaterThan(0);
      expect(feature!.workflows.length).toBeGreaterThan(0);
      expect(feature!.actions.length).toBeGreaterThan(0);
      for (const ref of feature!.actions)
        expect(ACTION_TYPES).toContain(ref.action.type);
    },
  );

  it("only describes the character Family feature on the Family tab", () => {
    const bundle = buildRealBundle();
    const context = sanitizeHelpContext({
      area: "entity-detail",
      entityKind: "character",
      tab: "family",
      routeTemplate: "/(app)",
    });
    const here = retrieve("What can I do here?", bundle, context);
    expect(here.screenFeatures.map((entry) => entry.id)).toContain(
      "family-tree",
    );
    expect(here.screenFeatures.map((entry) => entry.id)).not.toContain(
      "stat-sheets",
    );
    const wrongKind = retrieve("What can I do here?", bundle, {
      ...context,
      entityKind: "item",
    });
    expect(wrongKind.screenFeatures.map((entry) => entry.id)).not.toContain(
      "family-tree",
    );
  });

  it("retains readable Help while suppressing unavailable panels in a guest or Zen view", () => {
    const bundle = buildRealBundle();
    const refs = FEATURE_REGISTRY.filter((entry) =>
      remaining.includes(entry.id),
    ).flatMap((entry) => entry.actions);
    const candidates = buildActionCandidates(
      refs,
      sanitizeHelpContext({
        area: "entity-detail",
        flags: [],
        availableActions: [],
      }),
      { helpIds: new Set(bundle.helpIds) },
    );
    expect(candidates.some((ref) => ref.action.type === "openHelp")).toBe(true);
    expect(candidates.some((ref) => ref.action.type === "openPanel")).toBe(
      false,
    );
  });

  it("does not infer an entity tab when the provider reports none", () => {
    const result = retrieve(
      "What can I do here?",
      buildRealBundle(),
      sanitizeHelpContext({
        area: "entity-detail",
        entityKind: "character",
        tab: null,
      }),
    );
    expect(result.screenFeatures.map((entry) => entry.id)).not.toContain(
      "family-tree",
    );
    expect(result.screenFeatures.map((entry) => entry.id)).not.toContain(
      "stat-sheets",
    );
  });
});
