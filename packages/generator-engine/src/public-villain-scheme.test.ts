import { describe, expect, it } from "vitest";
import {
  buildVillainSchemePrompt,
  generateVillainSchemeLocal,
  parseVillainSchemeResponse,
  villainSchemeConfig,
} from "./public-villain-scheme";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateVillainSchemeLocal", () => {
  it("returns the note villain-scheme structure", () => {
    const out = generateVillainSchemeLocal({}, seededRng(5));
    expect(out.type).toBe("note");
    expect(out.content).toContain("### Public Activity");
    expect(out.content).toContain("### Rumours & Signs");
    expect(out.content).toContain("### Adventure Hook");
    expect(out.lore).toContain("### Objective");
    expect(out.lore).toContain("### Motivation");
    expect(out.lore).toContain("### Current Activity");
    expect(out.lore).toContain("### Resources & Minions");
    expect(out.lore).toContain("### Scheme Stages");
    expect(out.lore).toContain("### Complications");
    expect(out.lore).toContain("### Escalation If Ignored");
    expect(out.lore).toContain("### Consequences If Nobody Intervenes");
    expect(out.lore).toContain("### Possible Twist");
    expect(out.labels).toContain("villain-scheme-generator");
  });

  it("honours explicit options", () => {
    const out = generateVillainSchemeLocal(
      {
        powerScale: "Cosmic",
        tone: "Grim",
        schemeType: "Mind Control Plot",
        villainProfile: "Mad Scientist",
      },
      seededRng(2),
    );
    expect(out.lore).toContain("mad scientist");
    expect(out.lore).toContain("mind control plot-flavoured");
    expect(out.lore).toContain("cosmic-level threat");
  });

  it("resolves Random scheme type and villain profile to concrete values", () => {
    const out = generateVillainSchemeLocal(
      { schemeType: "Random", villainProfile: "Random" },
      seededRng(3),
    );
    expect(out.lore).not.toMatch(/random-flavoured/i);
    expect(out.lore).not.toContain("random.");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateVillainSchemeLocal({}, seededRng(9))).toEqual(
      generateVillainSchemeLocal({}, seededRng(9)),
    );
  });

  it("uses the shared Superhero Power Scale values, not an invented scale", () => {
    for (let seed = 0; seed < 20; seed++) {
      const out = generateVillainSchemeLocal({}, seededRng(seed));
      expect([
        "street",
        "city",
        "national",
        "global",
        "cosmic",
        "multiversal",
      ]).toContain(out.lore.match(/(\w+)-level threat/i)?.[1]?.toLowerCase());
    }
  });

  it("keeps the local fallback aligned with a built-in Power Scale", () => {
    const out = generateVillainSchemeLocal(
      { powerScale: "Multiversal" },
      seededRng(12),
    );
    expect(out.lore).toContain("Act across realities");
    expect(out.lore).toContain("Stabilise the new multiverse");
    expect(out.lore).toContain("by Stage 6");
    expect(out.lore).not.toContain("Establish the front");
  });
});

describe("buildVillainSchemePrompt", () => {
  it("embeds options, the Power Scale hint, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildVillainSchemePrompt(
      {
        powerScale: "City",
        tone: "Noir",
        schemeType: "Blackmail Network",
        villainProfile: "Corrupt Tycoon",
        campaignContext: "a harbour city run by a shipping cartel",
      },
      "- Existing: The Dockside Concord (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Power Scale: City");
    expect(userMessage).toContain("One metropolitan area.");
    expect(userMessage).toContain("- Scheme Type: Blackmail Network");
    expect(userMessage).toContain(
      "- Villain Profile (who is plausibly behind it): Corrupt Tycoon",
    );
    expect(userMessage).toContain("a harbour city run by a shipping cartel");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Dockside Concord");
    expect(resolved.powerScale).toBe("City");
  });

  it("does not offer a genre option (Superhero / Comic Book only, per #3112)", () => {
    const { userMessage } = buildVillainSchemePrompt({}, "", seededRng(1));
    expect(userMessage).toContain("Superhero / Comic Book");
    expect(userMessage).not.toContain("- Genre");
  });

  it("includes the field-specific consistency pass", () => {
    const { userMessage } = buildVillainSchemePrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      'the "Adventure Hook" must be phrased as a usable, ready-to-run hook',
    );
    expect(userMessage).toContain(
      "must derive directly from the scheme's current stage, not from a stage that has not started yet",
    );
    expect(userMessage).toContain(
      "every clue listed anywhere must be something the villain's own actions would plausibly leave behind",
    );
    expect(userMessage).toContain(
      'Consequences If Nobody Intervenes" must be a direct continuation of the final Scheme Stage',
    );
    expect(userMessage).toContain(
      "Resources / Minions listed must be sufficient to actually carry out the stages described",
    );
    expect(userMessage).toContain(
      "Possible Twist must not simply restate the Objective",
    );
  });

  it("asks explicitly for an Adventure Hook section derived from the scheme's current stage", () => {
    const { userMessage } = buildVillainSchemePrompt({}, "", seededRng(1));
    expect(userMessage).toContain("'### Adventure Hook'");
    expect(userMessage).toContain(
      "that a GM can drop straight into a session to pull the heroes into the scheme's CURRENT stage",
    );
  });

  it("reuses the shared six-value Superhero Power Scale vocabulary", () => {
    expect(villainSchemeConfig.powerScales).toContain("Street");
    expect(villainSchemeConfig.powerScales).toContain("Multiversal");
    expect(villainSchemeConfig.powerScales.length).toBe(6);
  });

  it("does not send an undefined hint for a custom Power Scale", () => {
    const { userMessage } = buildVillainSchemePrompt({
      powerScale: "Orbital",
    });
    expect(userMessage).toContain("- Power Scale: Orbital");
    expect(userMessage).not.toContain("Orbital — undefined");
  });
});

describe("parseVillainSchemeResponse", () => {
  const { resolved } = buildVillainSchemePrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"Operation Blackout Signal","content":"### Public Activity\\ny","lore":"### Objective","labels":["villain-scheme"]}\n```';
    const out = parseVillainSchemeResponse(json, resolved);
    expect(out.title).toBe("Operation Blackout Signal");
    expect(out.content).toContain("Public Activity");
    expect(out.type).toBe("note");
  });

  it("falls back to the resolved scheme name and throws on bad JSON", () => {
    const out = parseVillainSchemeResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.schemeName);
    expect(() => parseVillainSchemeResponse("nope", resolved)).toThrow();
  });

  it("normalises malformed field types at the AI boundary", () => {
    const out = parseVillainSchemeResponse(
      JSON.stringify({
        title: { unexpected: true },
        summary: 42,
        content: { unexpected: true },
        lore: [],
        labels: [{}],
      }),
      resolved,
    );
    expect(out.title).toBe(resolved.schemeName);
    expect(out.summary).toBe("");
    expect(out.content).toBe("");
    expect(out.lore).toBe("");
    expect(out.labels).toEqual([
      "villain-scheme",
      "villain-scheme-generator",
      "imported-draft",
    ]);
  });
});
