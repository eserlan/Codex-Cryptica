import { describe, expect, it } from "vitest";
import { sanitizeHelpContext } from "../src/context";
import { retrieve } from "../src/retrieval";
import { FEATURE_REGISTRY } from "../src/registry";
import { buildRealBundle } from "./eval/evaluate";
import { COVERAGE_HELP, COVERAGE_QUESTIONS } from "./eval/coverage-questions";

const bundle = buildRealBundle();
const screens = Object.fromEntries(
  Object.keys(COVERAGE_HELP).map((id) => {
    const feature = FEATURE_REGISTRY.find((entry) => entry.id === id)!;
    return [
      id,
      sanitizeHelpContext({
        routeTemplate: feature.routes[0],
        area: feature.areas[0],
        tab: feature.tabs[0] ?? null,
        entityKind: feature.kinds === "any" ? null : feature.kinds[0],
      }),
    ];
  }),
);

describe("remaining coverage retrieval evaluation", () => {
  it.each(COVERAGE_QUESTIONS)("finds %s: %s", (id, question) => {
    const result = retrieve(question, bundle, screens[id]);
    expect(result.noMatch).toBe(false);
    expect(
      result.chunks
        .slice(0, 3)
        .some(
          ({ chunk }) =>
            chunk.featureId === id ||
            COVERAGE_HELP[id].includes(chunk.helpId ?? ""),
        ),
      result.chunks.map(({ chunk }) => chunk.sourceId).join(", "),
    ).toBe(true);
  });

  it.each([
    ["How do I record a session journal?", "stat-sheets", "session-journal"],
    ["Where can I manage entity templates?", "family-tree", "entity-templates"],
    [
      "How do I see a character's family tree?",
      "session-journal",
      "family-tree",
    ],
    ["How do I make a session prep run sheet?", "chronology", "session-prep"],
    ["How do I save an entity report?", "session-prep", "entity-reports"],
    ["Where are Stat Sheets?", "entity-templates", "stat-sheets"],
    [
      "How do I publish a read-only copy for my players?",
      "session-journal",
      "publishing",
    ],
    ["Where do I publish my world?", "entity-templates", "publishing"],
    [
      "How do I ask the Lore Oracle about my world?",
      "chronology",
      "lore-oracle",
    ],
    [
      "How do I revise a description with the Oracle?",
      "family-tree",
      "lore-oracle",
    ],
    ["How do I switch to dark mode?", "backup-and-restore", "theme-settings"],
    ["Where do I change the theme?", "publishing", "theme-settings"],
    ["How do I add a custom category?", "theme-settings", "schema-settings"],
    ["Where do I change a category's colour?", "publishing", "schema-settings"],
    ["How do I switch to dark mode?", "schema-settings", "theme-settings"],
  ])(
    "keeps explicit intent for %s despite the %s screen",
    (question, screen, expected) => {
      const result = retrieve(question, bundle, screens[screen]);
      expect(result.noMatch).toBe(false);
      expect(
        result.chunks
          .slice(0, 3)
          .some(
            ({ chunk }) =>
              chunk.featureId === expected ||
              COVERAGE_HELP[expected].includes(chunk.helpId ?? ""),
          ),
        result.chunks.map(({ chunk }) => chunk.sourceId).join(", "),
      ).toBe(true);
    },
  );

  it.each([
    [
      "Is a Session Journal the same as a Session Prep run sheet?",
      "session-journal",
      "session-prep",
    ],
    [
      "Are entity templates the same as stat sheet templates?",
      "entity-templates",
      "stat-sheets",
    ],
    [
      "Is publishing my world the same as exporting a backup?",
      "publishing",
      "backup-and-restore",
    ],
  ])("grounds both sides of %s", (question, first, second) => {
    const result = retrieve(question, bundle, sanitizeHelpContext({}));
    for (const id of [first, second])
      expect(
        result.chunks.some(
          ({ chunk }) =>
            chunk.featureId === id ||
            COVERAGE_HELP[id].includes(chunk.helpId ?? ""),
        ),
        result.chunks.map(({ chunk }) => chunk.sourceId).join(", "),
      ).toBe(true);
  });

  it("does not make an unrelated question answerable on a new screen", () => {
    for (const context of Object.values(screens))
      expect(
        retrieve("Bake sourdough bread with rye flour", bundle, context)
          .noMatch,
      ).toBe(true);
  });
});
