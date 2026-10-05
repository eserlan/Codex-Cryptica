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
    [
      "Why is the relationships option unavailable in a report?",
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
    ["How do I find entries that have no labels?", "entity-table"],
    ["How do I add a label to several entries at once?", "entity-table"],
    ["How do I sort entries by when they were last changed?", "entity-table"],
    ["What does Incomplete only show in the table?", "entity-table"],
    ["How do I select a range of rows in the table?", "entity-table"],
    ["Why is the Summary column empty for some entries?", "entity-table"],
    [
      "How do I nest one entry under another in the explorer?",
      "entity-explorer",
    ],
    ["What does Reject do on the Review tab?", "entity-explorer"],
    ["How do I group entries by category in the sidebar?", "entity-explorer"],
    ["How do I sort the explorer by last edited?", "entity-explorer"],
    ["Why is Group by Category greyed out?", "entity-explorer"],
    ["How do I roll with advantage?", "dice-roller"],
    ["How do I roll a d20 with a modifier?", "dice-roller"],
    ["What does the exploding dice formula do?", "dice-roller"],
    ["How do I roll the same dice again?", "dice-roller"],
    ["How do I clear my roll history?", "dice-roller"],
    ["How do I add a custom category?", "categories-and-labels"],
    ["How do I change the colour of a category?", "categories-and-labels"],
    [
      "What does Reset to defaults do to my categories?",
      "categories-and-labels",
    ],
    [
      "What happens to entries when I delete a category?",
      "categories-and-labels",
    ],
    ["Where can I see all the labels in my vault?", "categories-and-labels"],
    ["How do I rename a label on all my entries?", "categories-and-labels"],
    ["Does deleting a label delete my entries?", "categories-and-labels"],
    [
      "What happens if I rename a label to one that already exists?",
      "categories-and-labels",
    ],
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

  it("explains where an Explorer entry opens in the desktop workspace", () => {
    const result = retrieve(
      "Where does an entry open when I click it in the desktop Explorer workspace?",
      bundle,
      context,
    );

    expect(result.noMatch).toBe(false);
    expect(result.chunks.map(({ chunk }) => chunk.helpId)).toContain(
      "entity-explorer",
    );
    expect(result.chunks.map(({ chunk }) => chunk.text).join(" ")).toContain(
      "in the desktop Explorer workspace, it opens the entry in the workspace view",
    );
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
