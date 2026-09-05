import { describe, expect, it } from "vitest";
import {
  buildRumourPrompt,
  generateRumourLocal,
  parseRumourResponse,
  resolveRumour,
  rumourConfig,
  seedsForFocus,
} from "./public-rumour";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateRumourLocal", () => {
  it("returns a d6 table of rumours with player-facing and GM-only sections", () => {
    const out = generateRumourLocal({}, seededRng(5));
    expect(out.type).toBe("note");
    expect(out.kind).toBe("rumour");
    for (let i = 1; i <= 6; i++) {
      expect(out.content).toContain(`### Rumour ${i}`);
      expect(out.lore).toContain(`### GM Notes — Rumour ${i}`);
    }
    expect(out.content).toContain("- **Rumour**:");
    expect(out.content).toContain("- **Lead**:");
    expect(out.content).toContain("- **Source**:");
    expect(out.lore).toContain("- **Reality**:");
    expect(out.lore).toContain("- **What's Actually Happening**:");
    expect(out.lore).toContain("- **If Investigated**:");
    expect(out.labels).toContain("rumour-generator");
  });

  it("never leaks truth status into the player-facing content", () => {
    const out = generateRumourLocal({}, seededRng(11));
    expect(out.content).not.toMatch(
      /essentially true|exaggeration|misconception|\*\*Reality\*\*/i,
    );
  });

  it("keeps a fixed hidden truth distribution of 4 true / 1 exaggeration / 1 misconception", () => {
    const out = generateRumourLocal({}, seededRng(3));
    const trueCount = (
      out.lore.match(/\*\*Reality\*\*: essentially true/g) ?? []
    ).length;
    const exaggerationCount = (
      out.lore.match(/\*\*Reality\*\*: exaggeration/g) ?? []
    ).length;
    const misconceptionCount = (
      out.lore.match(/\*\*Reality\*\*: dangerous misconception/g) ?? []
    ).length;
    expect(trueCount).toBe(4);
    expect(exaggerationCount).toBe(1);
    expect(misconceptionCount).toBe(1);
  });

  it("honours explicit options", () => {
    const out = generateRumourLocal(
      {
        genre: "Cyberpunk / Corporate",
        tone: "Tense",
        dangerLevel: "High",
        locationContext: "Neon Row",
      },
      seededRng(2),
    );
    expect(out.lore).toContain("**Genre**: Cyberpunk / Corporate");
    expect(out.lore).toContain("**Tone**: Tense");
    expect(out.lore).toContain("**Danger Level**: High");
  });

  it("duplicates the requested subject in the seed pool so it can appear twice", () => {
    const pool = seedsForFocus("Missing People");
    const missingPeopleCount = pool.filter(
      (seed) => seed.subject === "Missing People",
    ).length;
    expect(missingPeopleCount).toBe(2);
  });

  it("actually selects the focused subject twice, not just once", () => {
    // The dedicated "Missing People" rumour uses this fixed phrase; if the
    // selection logic collapses the duplicate back down to one occurrence
    // (as it did before the bias-dedup bug was fixed), this only matches once.
    const out = generateRumourLocal(
      { subjectFocus: "Missing People" },
      seededRng(6),
    );
    const occurrences = (
      out.content.match(/hasn't been seen in five days/g) ?? []
    ).length;
    expect(occurrences).toBe(2);
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateRumourLocal({}, seededRng(9))).toEqual(
      generateRumourLocal({}, seededRng(9)),
    );
  });
});

describe("resolveRumour", () => {
  it("falls back to defaults for unset options", () => {
    const resolved = resolveRumour({});
    expect(resolved.genre).toBe(rumourConfig.genres[0]);
    expect(resolved.tone).toBe(rumourConfig.tones[0]);
    expect(resolved.dangerLevel).toBe(rumourConfig.dangerLevels[0]);
    expect(resolved.subjectFocus).toBe(rumourConfig.subjects[0]);
  });

  it("keeps custom, user-typed values instead of discarding them", () => {
    const resolved = resolveRumour({
      tone: "Bittersweet",
      dangerLevel: "Catastrophic",
      subjectFocus: "Cursed Objects",
    });
    expect(resolved.tone).toBe("Bittersweet");
    expect(resolved.dangerLevel).toBe("Catastrophic");
    expect(resolved.subjectFocus).toBe("Cursed Objects");
  });
});

describe("buildRumourPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { userMessage, systemInstruction, resolved } = buildRumourPrompt(
      {
        genre: "Western / Frontier",
        tone: "Ominous",
        dangerLevel: "Severe",
        locationContext: "Dustwell Crossing",
        campaignContext: "a boomtown built on a played-out claim",
      },
      "- Existing: The Iron Compact (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre: Western / Frontier");
    expect(userMessage).toContain("- Tone: Ominous");
    expect(userMessage).toContain("- Danger level: Severe");
    expect(userMessage).toContain("Dustwell Crossing");
    expect(userMessage).toContain("a boomtown built on a played-out claim");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Iron Compact");
    expect(systemInstruction).toContain("NOT a quest hook");
    expect(resolved.genre).toBe("Western / Frontier");
  });

  it("instructs a fixed hidden truth distribution across the six rumours", () => {
    const { userMessage } = buildRumourPrompt({}, "", seededRng(7));
    expect(userMessage).toContain("Hidden truth distribution");
    expect(userMessage).toContain('"true" rumours');
    expect(userMessage).toContain('"exaggeration"');
    expect(userMessage).toContain('"misconception"');
  });

  it("keeps the canonical theme vocabulary", () => {
    expect(rumourConfig.genres).toContain("Cosmic Horror");
    expect(rumourConfig.genres).toContain("Space Western");
  });
});

describe("parseRumourResponse", () => {
  const { resolved } = buildRumourPrompt({}, "", seededRng(3));
  const validContent = Array.from(
    { length: 6 },
    (_, i) =>
      `### Rumour ${i + 1}\n- **Rumour**: x\n- **Lead**: y\n- **Source**: z`,
  ).join("\n\n");
  const validLore = [
    "### At a Glance",
    ...Array.from(
      { length: 6 },
      (_, i) =>
        `### GM Notes — Rumour ${i + 1}\n- **Reality**: essentially true\n- **What's Actually Happening**: a\n- **If Investigated**: b`,
    ),
  ].join("\n\n");

  it("parses fenced JSON and keeps the full six-rumour body", () => {
    const json = JSON.stringify({
      title: "Word Around the Docks",
      content: validContent,
      lore: validLore,
      labels: ["a"],
    });
    const out = parseRumourResponse("```json\n" + json + "\n```", resolved);
    expect(out.title).toBe("Word Around the Docks");
    expect(out.content).toContain("### Rumour 6");
  });

  it("throws when the response is missing required d6 sections", () => {
    const badJson = JSON.stringify({
      title: "Incomplete",
      content: "### Rumour 1\nonly one",
      lore: validLore,
    });
    expect(() => parseRumourResponse(badJson, resolved)).toThrow();
  });

  it("throws when the response contains more than six rumours", () => {
    const extraContent = `${validContent}\n\n### Rumour 7\n- **Rumour**: x\n- **Lead**: y\n- **Source**: z`;
    const badJson = JSON.stringify({
      title: "Too Many",
      content: extraContent,
      lore: validLore,
    });
    expect(() => parseRumourResponse(badJson, resolved)).toThrow();
  });

  it("falls back to a default title when none is given", () => {
    const json = JSON.stringify({ content: validContent, lore: validLore });
    const out = parseRumourResponse(json, resolved);
    expect(out.title).toBe("Word Around Town");
  });
});
