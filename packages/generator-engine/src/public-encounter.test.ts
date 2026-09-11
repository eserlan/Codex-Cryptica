import { describe, expect, it } from "vitest";
import {
  buildEncounterPrompt,
  encounterConfig,
  generateEncounterLocal,
  parseEncounterResponse,
} from "./public-encounter";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateEncounterLocal", () => {
  it("returns the event encounter structure", () => {
    const out = generateEncounterLocal({}, seededRng(5));
    expect(out.type).toBe("event");
    expect(out.content).toContain("### What the Players See");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Possible Approaches");
    expect(out.lore).toContain("### Outcomes & Consequences");
    expect(out.labels).toContain("encounter-generator");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateEncounterLocal(
      {
        genre: "Pirate",
        encounterType: "Social",
        environment: "Dockside Port",
        threat: "Moderate",
        tone: "Mysterious",
        campaignContext: "a smuggling ring under new leadership",
      },
      seededRng(2),
    );
    expect(out.lore).toContain("a smuggling ring under new leadership");
    expect(out.lore).toContain("Dockside Port");
    expect(out.lore).toContain("Moderate");
    expect(out.lore).toContain("Social");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateEncounterLocal({}, seededRng(9))).toEqual(
      generateEncounterLocal({}, seededRng(9)),
    );
  });

  it("uses theme-flavored environments for Pirate", () => {
    const out = generateEncounterLocal(
      { genre: "Pirate", environment: undefined },
      seededRng(7),
    );
    expect(
      encounterConfig.environmentsByTheme["Pirate"].some((env) =>
        out.lore.includes(env),
      ),
    ).toBe(true);
  });

  it("rolls a concrete type instead of leaving the default Random literal", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const out = generateEncounterLocal(
        { encounterType: "Random" },
        seededRng(seed),
      );
      expect(out.lore).not.toContain("**Encounter Type**: Random");
    }
  });

  it("never emits a grammatically wrong article before a vowel-initial value", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const out = generateEncounterLocal({}, seededRng(seed));
      expect(out.content).not.toMatch(/\ba (?=[aeiou])/i);
      expect(out.lore).not.toMatch(/\ba (?=[aeiou])/i);
    }
  });
});

describe("buildEncounterPrompt", () => {
  it("embeds options, ban prompt, session context, and the consistency pass", () => {
    const { userMessage, resolved } = buildEncounterPrompt(
      {
        genre: "Cyberpunk / Corporate",
        encounterType: "Combat",
        environment: "Corporate Tower",
        threat: "Dangerous",
        tone: "Hostile",
        context: "a rooftop extraction gone wrong",
      },
      "- Existing: The Neon Compact (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Encounter Type: Combat");
    expect(userMessage).toContain("- Environment: Corporate Tower");
    expect(userMessage).toContain("- Threat: Dangerous");
    expect(userMessage).toContain("a rooftop extraction gone wrong");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Neon Compact");
    expect(userMessage).toContain("consistency pass");
    expect(userMessage).toContain(
      "threat level must match the collective danger",
    );
    expect(userMessage).toContain("complication must genuinely complicate");
    expect(userMessage).toContain("outcomes must correspond to the approaches");
    expect(resolved.threat).toBe("Dangerous");
  });

  it("keeps the theme-flavored environment pools", () => {
    expect(encounterConfig.environmentsByTheme["Cosmic Horror"]).toContain(
      "Flooded Archive",
    );
    expect(encounterConfig.environmentsByTheme["Western / Frontier"]).toContain(
      "Dusty Boomtown",
    );
    expect(encounterConfig.encounterTypes).toContain("Random");
    expect(encounterConfig.threats).toContain("Severe / Deadly");
  });
});

describe("parseEncounterResponse", () => {
  const { resolved } = buildEncounterPrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"The Broken Bridge","content":"### What the Players See\\ny","lore":"### At a Glance","labels":["a"]}\n```';
    const out = parseEncounterResponse(json, resolved);
    expect(out.title).toBe("The Broken Bridge");
    expect(out.content).toContain("What the Players See");
  });

  it("falls back to the resolved title and throws on bad JSON", () => {
    const out = parseEncounterResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.encounterName);
    expect(() => parseEncounterResponse("nope", resolved)).toThrow();
  });
});
