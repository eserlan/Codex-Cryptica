import { describe, expect, it } from "vitest";
import {
  collectActionMatches,
  isDisengagementAction,
} from "../src/gm-director-action-matching";
import { heardScenario } from "./gm-director-fixtures";
import { now, session } from "./reducer-fixtures";

describe("director action matching", () => {
  it("scores player-visible topic hits and exact leads", () => {
    const item = heardScenario();
    const s = session();
    expect(
      collectActionMatches([item], s, "bronze bell", null, false).get(item.id),
    ).toEqual({ hits: 2, exactPhrase: false, confidence: "high" });
    expect(
      collectActionMatches([item], s, "bronze", null, false).get(item.id)
        ?.confidence,
    ).toBe("medium");
    expect(
      collectActionMatches([item], s, "Go to Old Bell Tower", null, false).get(
        item.id,
      )?.exactPhrase,
    ).toBe(true);
  });

  it("does not infer pursuit from ambient location words, hidden truth, or hidden events", () => {
    const item = heardScenario();
    item.gmOnly = {
      truth: "CANARY obsidian",
      ifInvestigated: "CANARY sapphire",
    };
    item.events = [
      {
        id: "hidden",
        kind: "discovery",
        visibility: "gm",
        text: "CANARY emerald",
        at: now,
      },
    ];
    const s = session();
    for (const action of [
      "obsidian sapphire emerald",
      "Have a drink at Bronze Bell",
      "",
      undefined,
    ]) {
      expect(
        collectActionMatches([item], s, action, { name: "Bronze Bell" }, false)
          .size,
      ).toBe(0);
    }
  });

  it("uses only the scenario's player-visible provisional facts", () => {
    const item = heardScenario();
    const s = session();
    s.provisionalFacts = [
      {
        id: "visible",
        kind: "clue",
        name: "Ruby",
        summary: "In the archway",
        introducedOnTurnId: "turn-1",
        visibility: "player-visible",
        scenarioId: item.id,
      },
      {
        id: "hidden",
        kind: "clue",
        name: "Sapphire",
        summary: "Beneath the floor",
        introducedOnTurnId: "turn-1",
        visibility: "gm-only",
        scenarioId: item.id,
      },
      {
        id: "other",
        kind: "clue",
        name: "Emerald",
        summary: "On a table",
        introducedOnTurnId: "turn-1",
        visibility: "player-visible",
        scenarioId: "other",
      },
    ];
    expect(
      collectActionMatches([item], s, "ruby archway", null, false).get(item.id)
        ?.confidence,
    ).toBe("high");
    expect(
      collectActionMatches([item], s, "sapphire emerald", null, false).size,
    ).toBe(0);
  });

  it("matches whole linked place aliases, including punctuation, without substring matches", () => {
    const item = heardScenario();
    item.anchorRefs = ["mill"];
    const s = session();
    s.places = [
      {
        id: "place-mill",
        sourceRecordId: "mill",
        name: "The Mill",
        aliases: ["A+B", "Ash"],
      },
    ];
    expect(
      collectActionMatches([item], s, "Visit A+B", null, false).get(item.id)
        ?.exactPhrase,
    ).toBe(true);
    expect(
      collectActionMatches([item], s, "Go to ashore", null, false).size,
    ).toBe(0);
    expect(
      collectActionMatches([item], s, "Go to ashen", null, false).size,
    ).toBe(0);
  });

  it("allows an exact lead at the current location only for the focused scenario", () => {
    const item = heardScenario();
    const s = session();
    const location = { name: "Old Bell Tower" };
    expect(
      collectActionMatches([item], s, "Old Bell Tower", location, false).size,
    ).toBe(0);
    s.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: item.id,
    };
    expect(
      collectActionMatches([item], s, "Old Bell Tower", location, false).get(
        item.id,
      ),
    ).toEqual({ hits: 0, exactPhrase: true, confidence: "high" });
  });

  it("recognizes explicit disengagement and suppresses matching even with a named lead", () => {
    for (const action of [
      "walk away",
      "ignore the bell",
      "stop investigating",
      "never mind",
    ]) {
      expect(isDisengagementAction(action)).toBe(true);
    }
    expect(isDisengagementAction("Investigate the bell")).toBe(false);
    expect(isDisengagementAction(undefined)).toBe(false);
    expect(
      collectActionMatches(
        [heardScenario()],
        session(),
        "ignore the bell",
        null,
        true,
      ).size,
    ).toBe(0);
  });
});
