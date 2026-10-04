import { describe, expect, it } from "vitest";
import { sanitizeHelpContext } from "../src/context";
import { retrieve } from "../src/retrieval";
import { buildRealBundle } from "./eval/evaluate";

const bundle = buildRealBundle();
const context = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "other",
  surface: "vault",
});

describe("help documentation workflow retrieval", () => {
  it.each([
    ["How do I revise an entity in Zen Mode?", "creating-and-editing-entities"],
    [
      "How do I turn off AI and use local generator templates?",
      "in-app-generators",
    ],
    ["Where do I add a personal key for Oracle?", "gemini-api-key"],
    ["How do I change app appearance between light and dark?", "themes"],
    ["How do I generate a report from canvas entities?", "entity-reports"],
    [
      "Can I save a graph selection as an editable report note?",
      "entity-reports",
    ],
    ["Does making a report change the source entities?", "entity-reports"],
    ["Can I order items in Canvas?", "spatial-canvas"],
    ["How do I move cards around?", "spatial-canvas"],
    ["Can I bring this card to the front?", "spatial-canvas"],
    ["How do I stop a card from moving?", "spatial-canvas"],
    ["Is there an auto-layout for Canvas?", "spatial-canvas"],
    ["Does my Canvas layout get saved?", "spatial-canvas"],
    ["Where do I manage stat sheet templates?", "stat-sheets"],
    ["How do I keep a generator draft in the editor?", "in-app-generators"],
    ["How do I pin entities to the front page?", "front-page"],
  ])("finds a readable guide for %s", (question, helpId) => {
    const result = retrieve(question, bundle, context);
    expect(result.noMatch).toBe(false);
    expect(result.chunks.map(({ chunk }) => chunk.helpId)).toContain(helpId);
  });

  it("does not invent instructions for an unrelated task", () => {
    const result = retrieve(
      "Bake a sourdough loaf with rye flour",
      bundle,
      context,
    );
    expect(result.noMatch).toBe(true);
    expect(result.chunks).toEqual([]);
  });

  it("keeps internal help links pointed at included articles", () => {
    const helpIds = new Set(bundle.helpIds);
    for (const chunk of bundle.chunks) {
      for (const match of chunk.text.matchAll(/\/help#help\/([a-z0-9-]+)/g)) {
        expect(helpIds.has(match[1]), `${chunk.id} links to ${match[1]}`).toBe(
          true,
        );
      }
    }
  });
});
