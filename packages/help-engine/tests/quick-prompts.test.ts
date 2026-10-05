import { describe, expect, it } from "vitest";
import { sanitizeHelpContext } from "../src/context";
import {
  MAX_QUICK_PROMPTS,
  QUICK_PROMPT_SETS,
  quickPromptsFor,
} from "../src/quick-prompts";
import { retrieve } from "../src/retrieval";
import { FRESH_IN_SCOPE } from "./eval/fresh-holdout";
import { buildRealBundle, matchesExpectedSources } from "./eval/evaluate";
import { IN_SCOPE, SCREENS } from "./eval/questions";

const bundle = buildRealBundle();
const evaluated = [...IN_SCOPE, ...FRESH_IN_SCOPE];
const MAX_LENGTH = 60;
const MAX_QUESTION_CHARS = 500;

const everyPrompt = QUICK_PROMPT_SETS.flatMap((set) =>
  set.prompts.map((prompt) => ({ set, prompt })),
);

describe("quick prompts: the data", () => {
  it("has a set for each screen the spec proposes", () => {
    expect(QUICK_PROMPT_SETS.map((set) => set.id)).toEqual([
      "entity-editing",
      "entity-connections",
      "graph",
      "canvas",
      "map",
      "generators",
      "tables",
      "import",
      "settings",
    ]);
  });

  it("shows at most three per screen", () => {
    for (const set of QUICK_PROMPT_SETS) {
      expect(set.prompts.length, set.id).toBeGreaterThan(0);
      expect(
        quickPromptsFor(SCREENS[screenFor(set.id)]).length,
        set.id,
      ).toBeLessThanOrEqual(MAX_QUICK_PROMPTS);
    }
  });

  it("is short, plain, first-person text a person could type", () => {
    for (const { set, prompt } of everyPrompt) {
      expect(prompt.length, `${set.id}: ${prompt}`).toBeLessThanOrEqual(
        MAX_LENGTH,
      );
      expect(prompt.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
      expect(prompt, prompt).toMatch(/[?]$/);
      // Fixed text only: nothing that looks like a template or a vault name.
      expect(prompt, prompt).not.toMatch(/[{}<>$]/);
    }
  });

  it("never repeats a prompt, within a screen or across screens", () => {
    const seen = new Set<string>();
    for (const { prompt } of everyPrompt) {
      expect(seen.has(prompt), prompt).toBe(false);
      seen.add(prompt);
    }
  });
});

/** The evaluation screen a set is checked on. */
function screenFor(id: string): keyof typeof SCREENS {
  const map: Record<string, keyof typeof SCREENS> = {
    "entity-editing": "entityEdit",
    "entity-connections": "connections",
    graph: "graph",
    canvas: "canvas",
    map: "map",
    generators: "generators",
    tables: "tables",
    import: "import",
    settings: "settings",
  };
  return map[id];
}

describe("quick prompts: each one still finds its guide", () => {
  it.each(everyPrompt.map(({ set, prompt }) => [set.id, prompt]))(
    "%s: %s",
    (setId, prompt) => {
      const question = evaluated.find((q) => q.question === prompt);
      expect(question, "must be an evaluation question").toBeDefined();
      expect(question!.screen).toBe(screenFor(setId));

      const result = retrieve(prompt, bundle, SCREENS[question!.screen]);
      const sources = result.chunks.map((c) => c.chunk.sourceId);

      expect(result.noMatch).toBe(false);
      expect(matchesExpectedSources(sources, question!)).toBe(true);
    },
  );
});

describe("quickPromptsFor", () => {
  it.each(QUICK_PROMPT_SETS.map((set) => [set.id, set.prompts] as const))(
    "gives the %s prompts on that screen",
    (id, prompts) => {
      expect(quickPromptsFor(SCREENS[screenFor(id)])).toEqual(prompts);
    },
  );

  it("prefers the editing prompts over the Connections tab ones while editing", () => {
    const editingConnections = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "entity-detail",
      entityKind: "location",
      tab: "connections",
      mode: "edit",
    });

    expect(quickPromptsFor(editingConnections)).toEqual(
      QUICK_PROMPT_SETS.find((s) => s.id === "entity-editing")!.prompts,
    );
  });

  it("gives nothing for a screen without verified prompts", () => {
    expect(quickPromptsFor(SCREENS.none)).toEqual([]);
    for (const area of ["session-hub", "chronology", "session-prep", "other"]) {
      expect(
        quickPromptsFor(
          sanitizeHelpContext({ routeTemplate: "/(app)", area, mode: "view" }),
        ),
        area,
      ).toEqual([]);
    }
  });

  it("gives nothing for an entity tab that has no prompts of its own", () => {
    const status = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "entity-detail",
      entityKind: "item",
      tab: "status",
      mode: "view",
    });

    expect(quickPromptsFor(status)).toEqual([]);
  });

  it("never returns more than three", () => {
    expect(
      Math.max(
        ...Object.values(SCREENS).map((ctx) => quickPromptsFor(ctx).length),
      ),
    ).toBeLessThanOrEqual(MAX_QUICK_PROMPTS);
  });
});
