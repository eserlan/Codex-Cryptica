import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import { parseResources } from "./one-shot-resources";
import { parseDecisions, parseSchedule } from "./one-shot-state";
import { renderGmSheet, renderOneShotMarkdown } from "./one-shot-render";
import {
  checkPlayability,
  generateOneShotLocal,
  oneShotConfig,
} from "./public-one-shot";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options = {}): OneShotAdventure =>
  structuredClone(generateOneShotLocal(options, seeded()).oneShot!);
const messages = (a: OneShotAdventure) =>
  checkPlayability(a).map((g) => g.message);

describe("survival resources", () => {
  it("gives a local survival adventure supplies that pass the checks and show on the sheet", () => {
    const a = local({ emphasis: "Survival" });
    expect(a.resources?.length).toBeGreaterThanOrEqual(2);
    expect(messages(a).filter((m) => /boxes|scarce|runs out/i.test(m))).toEqual(
      [],
    );
    expect(renderGmSheet(a)).toContain("## Supplies");
  });

  it("asks for resources when a survival adventure has none", () => {
    const a = local({ emphasis: "Survival" });
    a.resources = undefined;
    expect(messages(a).some((m) => /scarce resources/.test(m))).toBe(true);
    expect(local({ emphasis: "Action" }).resources).toBeUndefined();
  });

  it("flags a supply that a careful party exhausts before the finale", () => {
    const a = local({ emphasis: "Survival" });
    a.resources![0].start = 1;
    expect(messages(a).some((m) => /runs out before the finale/.test(m))).toBe(
      true,
    );
  });

  it("flags a supply spent in one scene only, or with no empty rule", () => {
    const a = local({ emphasis: "Survival" });
    a.resources![0].spends = a.resources![0].spends.slice(0, 1);
    a.resources![1].whenEmpty = "";
    const found = messages(a);
    expect(found.some((m) => /never carries over/.test(m))).toBe(true);
    expect(found.some((m) => /runs out\./.test(m))).toBe(true);
  });

  it("drops spends in unknown scenes and resources with nothing to spend", () => {
    const parsed = parseResources(
      [
        {
          name: "Food",
          start: 4,
          spends: [
            { sceneId: "scene-1", what: "march", amount: 1 },
            { sceneId: "scene-99", what: "ghost", amount: 1 },
          ],
          whenEmpty: "weak",
        },
        { name: "Nothing", start: 0 },
      ],
      (id) => id === "scene-1",
    );
    expect(parsed).toHaveLength(1);
    expect(parsed![0].spends).toHaveLength(1);
  });

  it("drops resources with non-numeric or missing starting counts", () => {
    const parsed = parseResources(
      [
        { name: "Bad", start: "many" },
        { name: "Infinite", start: "Infinity" },
        { name: "Missing" },
        { name: "Food", start: 4 },
      ],
      () => true,
    );
    expect(parsed?.map((resource) => resource.name)).toEqual(["Food"]);
  });
});

describe("clock schedule duplicates", () => {
  it("counts a repeated moment once", () => {
    expect(
      parseSchedule(["scene-end", "scene-end", "scene-end", "finale-start"]),
    ).toEqual(["scene-end", "finale-start"]);
    expect(parseSchedule(["timed", "timed"])).toEqual(["timed", "timed"]);
  });
});

describe("conditional decisions", () => {
  it("does not require endings for answers that are never asked", () => {
    const a = local();
    a.decisions = [
      { id: "pact", question: "Does the party make a new pact?" },
      {
        id: "consent",
        question: "Is the guardian's consent won?",
        when: { pact: true },
      },
    ];
    a.endings = [
      {
        id: "e1",
        title: "Old binding",
        condition: "They restore the binding with the chain.",
        consequence: "The mountain holds one more winter.",
        requires: { pact: false },
      },
      {
        id: "e2",
        title: "Fair pact",
        condition: "They win consent for a new pact.",
        consequence: "The guardian keeps watch freely.",
        requires: { pact: true, consent: true },
      },
      {
        id: "e3",
        title: "Cold bargain",
        condition: "They force the pact without consent.",
        consequence: "The ward holds but the guardian resents it.",
        requires: { pact: true, consent: false },
      },
    ];
    expect(messages(a).filter((m) => /No ending|both happen/.test(m))).toEqual(
      [],
    );
  });

  it("only keeps a condition on an earlier decision", () => {
    const parsed = parseDecisions([
      { id: "a", question: "A?", when: { b: true } },
      { id: "b", question: "B?", when: { a: true } },
    ]);
    expect(parsed![0].when).toBeUndefined();
    expect(parsed![1].when).toEqual({ a: true });
  });
});

describe("protected stakes", () => {
  it("does not ask for a scene that shows a protected person trapped", () => {
    const a = local();
    a.threads = [
      {
        about: "npc-3",
        kind: "protect",
        setup: "The children are ill",
        payoff: "The flame reaches them",
        sceneIds: [a.scenes.at(-1)!.id],
      },
    ];
    expect(messages(a).some((m) => /trapped, captive or missing/.test(m))).toBe(
      false,
    );
  });
});

describe("readable names", () => {
  it("replaces npc ids in the text a GM reads", () => {
    const a = local();
    const name = a.npcs.find((n) => n.id === "npc-3")!.name;
    a.scenes[1].situation = "npc-3 waits by the door.";
    expect(renderOneShotMarkdown(a)).toContain(`${name} waits by the door.`);
    expect(renderOneShotMarkdown(a)).not.toMatch(/\bnpc-3\b/);
  });
});

describe("every theme is a one-shot genre", () => {
  it("builds an adventure for each canonical theme", () => {
    for (const genre of oneShotConfig.genres) {
      const a = generateOneShotLocal({ genre }, seeded()).oneShot!;
      expect(a.genre).toBe(genre);
      expect(a.scenes.length).toBeGreaterThan(2);
    }
    expect(oneShotConfig.genres).toEqual(factionConfig.themes);
  });
});
