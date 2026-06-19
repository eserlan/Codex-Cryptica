import { describe, expect, it } from "vitest";
import {
  buildQuestPrompt,
  generateQuestLocal,
  parseQuestResponse,
  questConfig,
  themeToQuestGenre,
} from "./public-quest";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateQuestLocal", () => {
  it("returns the event quest structure", () => {
    const out = generateQuestLocal({}, seededRng(5));
    expect(out.type).toBe("event");
    expect(out.content).toContain("### The Hook");
    expect(out.content).toContain("### Location");
    expect(out.lore).toContain("### Core Fields");
    expect(out.lore).toContain("### The Twist");
    expect(out.labels).toContain("quest-generator");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateQuestLocal(
      {
        genre: "Political Intrigue",
        tone: "Mysterious",
        scope: "World-threatening",
        locationType: "Urban City",
        threat: "Rival Faction",
        twist: "Two factions both claim the prize",
        reward: "Access to a restricted archive",
        campaignContext: "a city choosing its next regent",
      },
      seededRng(2),
    );
    expect(out.content).toContain("a city choosing its next regent");
    expect(out.lore).toContain("urban city");
    expect(out.lore).toContain("rival faction");
    expect(out.lore).toContain("Two factions both claim the prize");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateQuestLocal({}, seededRng(9))).toEqual(
      generateQuestLocal({}, seededRng(9)),
    );
  });
});

describe("buildQuestPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildQuestPrompt(
      {
        genre: "Cyberpunk",
        tone: "Noir",
        scope: "City-wide",
        locationType: "Server Farm",
        threat: "Rogue AI",
        campaignContext: "a corp war over memory backups",
      },
      "- Existing: The Neon Compact (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre: Cyberpunk");
    expect(userMessage).toContain("- Tone: Noir");
    expect(userMessage).toContain("- Location Type: Server Farm");
    expect(userMessage).toContain("a corp war over memory backups");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Neon Compact");
    expect(resolved.threat).toBe("Rogue AI");
  });

  it("keeps the public theme mapping", () => {
    expect(themeToQuestGenre["Cyberpunk / Corporate"]).toBe("Cyberpunk");
    expect(themeToQuestGenre["Western / Frontier"]).toBe("Western");
    expect(questConfig.tonesByTheme["Western / Frontier"]).toContain("Lawless");
    expect(questConfig.scopesByTheme["Western / Frontier"]).toContain(
      "Territory-scale (frontier)",
    );
    expect(questConfig.locationTypesByTheme["Western / Frontier"]).toContain(
      "Dusty Boomtown",
    );
    expect(questConfig.rewardsByTheme["Western / Frontier"]).toContain(
      "Bounty gold plus a sheriff's favor",
    );
    expect(questConfig.threatsByTheme["Post-Apocalyptic"]).toContain(
      "Raider Warlord",
    );
  });
});

describe("parseQuestResponse", () => {
  const { resolved } = buildQuestPrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"Ashes of the Gate","content":"### The Hook\\ny","lore":"### Core Fields","labels":["a"]}\n```';
    const out = parseQuestResponse(json, resolved);
    expect(out.title).toBe("Ashes of the Gate");
    expect(out.content).toContain("The Hook");
  });

  it("falls back to the resolved title and throws on bad JSON", () => {
    const out = parseQuestResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.questName);
    expect(() => parseQuestResponse("nope", resolved)).toThrow();
  });
});
