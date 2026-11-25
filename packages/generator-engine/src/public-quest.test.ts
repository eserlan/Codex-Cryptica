import { describe, expect, it } from "vitest";
import {
  buildQuestPrompt,
  generateQuestLocal,
  parseQuestResponse,
  questGenreForTheme,
  questConfig,
  QUEST_HOOK_POOLS,
  themedQuestPool,
  themeToQuestGenre,
} from "./public-quest";
import { NAME_BAN_PROMPT } from "./public-npc";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

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
    expect(out.lore).toContain(
      "### Campaign Context\na city choosing its next regent",
    );
    expect(out.content).not.toContain("a city choosing its next regent");
    expect(out.lore).toContain("**🧭 Scope**: World-threatening");
    expect(out.lore).toContain("Urban City");
    expect(out.lore).toContain("rival faction");
    expect(out.lore).toContain("Two factions both claim the prize");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateQuestLocal({}, seededRng(9))).toEqual(
      generateQuestLocal({}, seededRng(9)),
    );
  });

  it("uses dedicated Cosmic Horror pools in local generation", () => {
    const out = generateQuestLocal({ genre: "Cosmic Horror" }, seededRng(7));
    const cosmicTones = questConfig.tonesByTheme["Cosmic Horror"];
    const cosmicRewards = questConfig.rewardsByTheme["Cosmic Horror"];

    expect(
      cosmicTones.some((tone) =>
        out.content.toLowerCase().includes(tone.toLowerCase()),
      ),
    ).toBe(true);
    expect(cosmicRewards.some((reward) => out.lore.includes(reward))).toBe(
      true,
    );
    expect(
      questConfig.twistsByTheme["Cosmic Horror"].some((twist) =>
        out.lore.includes(twist),
      ),
    ).toBe(true);
    expect(out.lore).not.toContain("Coin plus a local power's favor");
  });

  it("uses dedicated Superhero pools in local generation", () => {
    const out = generateQuestLocal({ genre: "Superhero" }, seededRng(11));
    const superheroTones = questConfig.tonesByTheme.Superhero;
    const superheroRewards = questConfig.rewardsByTheme.Superhero;

    expect(
      superheroTones.some((tone) =>
        out.content.toLowerCase().includes(tone.toLowerCase()),
      ),
    ).toBe(true);
    expect(superheroRewards.some((reward) => out.lore.includes(reward))).toBe(
      true,
    );
    expect(
      questConfig.twistsByTheme.Superhero.some((twist) =>
        out.lore.includes(twist),
      ),
    ).toBe(true);
    expect(out.lore).not.toContain("Coin plus a local power's favor");
  });

  it("draws Superhero hooks and complications from dedicated pools, not generic fantasy ones", () => {
    for (let seed = 0; seed < 20; seed++) {
      const out = generateQuestLocal(
        { genre: "Superhero" },
        seededRng(100 + seed),
      );
      expect(out.content).not.toContain(
        "A local official offers a reward to find a missing heir",
      );
      expect(out.content).not.toContain("A temple guardian collapses");
    }
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
    expect(userMessage).toContain("Concept constraints for this case");
    expect(userMessage).toContain("The campaign context still overrides them");
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
    expect(themeToQuestGenre["Cosmic Horror"]).toBe("Cosmic Horror");
    expect(themeToQuestGenre["Superhero / Comic Book"]).toBe("Superhero");
    expect(questGenreForTheme("Superhero / Comic Book")).toBe("Superhero");
    expect(questGenreForTheme("Custom Genre")).toBe("Custom Genre");
    expect(questConfig.genres).toContain("Superhero");
    expect(questConfig.genres).toContain("Cosmic Horror");
    expect(questConfig.tonesByTheme["Cosmic Horror"]).toContain(
      "Investigative",
    );
    expect(questConfig.locationTypesByTheme["Cosmic Horror"]).toContain(
      "Flooded Archive",
    );
    expect(questConfig.threatsByTheme["Cosmic Horror"]).toContain(
      "Dream Contagion",
    );
    expect(questConfig.rewardsByTheme["Cosmic Horror"]).toContain(
      "A calibrated instrument that detects the anomaly before it manifests",
    );
    expect(questConfig.twistsByTheme["Cosmic Horror"]).toContain(
      "The missing expedition returned before it left",
    );
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
    expect(questConfig.threatsByTheme["Western / Frontier"]).toContain(
      "Outlaw Gang",
    );
    expect(questConfig.threatsByTheme["Post-Apocalyptic"]).toContain(
      "Raider Warlord",
    );
    expect(questConfig.tonesByTheme.Superhero).toContain("Four-Color Heroic");
    expect(questConfig.scopesByTheme.Superhero).toContain(
      "City-wide (metropolitan crisis)",
    );
    expect(questConfig.locationTypesByTheme.Superhero).toContain(
      "Villain's Hidden Lair",
    );
    expect(questConfig.threatsByTheme.Superhero).toContain(
      "Supervillain Scheme",
    );
    expect(questConfig.rewardsByTheme.Superhero).toContain(
      "Public trust rebuilt, at least until the next headline",
    );
    expect(questConfig.twistsByTheme.Superhero).toContain(
      "Rescuing every hostage means letting the real target escape",
    );
  });

  it("normalizes canonical theme labels at the public generation boundary", () => {
    const canonicalTheme = "Superhero / Comic Book";
    const zeroRng = () => 0;
    const { resolved } = buildQuestPrompt(
      { genre: canonicalTheme },
      "",
      zeroRng,
    );

    expect(resolved.genre).toBe("Superhero");
    expect(resolved.tone).toBe("Four-Color Heroic");

    const output = generateQuestLocal({ genre: canonicalTheme }, zeroRng);
    expect(output.content).toContain(
      "A live broadcast cuts to a villain's ultimatum",
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

describe("generateQuestLocal vibe pools and GM notes", () => {
  const scopeOf = (lore: string) => /\*\*🧭 Scope\*\*: (.+)$/m.exec(lore)?.[1];
  const toneOf = (content: string) =>
    /and a (.+?) atmosphere/.exec(content)?.[1];
  const hookOf = (content: string) => /### The Hook\n(.+)/.exec(content)?.[1];
  const complicationOf = (lore: string) =>
    /### Complication\n(.+)/.exec(lore)?.[1];

  it("draws the scope and tone from the chosen vibe's own pools", () => {
    const cyberpunkScopes = questConfig.scopesByTheme["Cyberpunk / Corporate"];
    const cyberpunkTones = questConfig.tonesByTheme["Cyberpunk / Corporate"];
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateQuestLocal({ genre: "Cyberpunk" }, seededRng(seed));
      expect(cyberpunkScopes).toContain(scopeOf(out.lore));
      expect(cyberpunkTones.map((t) => t.toLowerCase())).toContain(
        toneOf(out.content),
      );
      expect(questConfig.scopes).not.toContain(scopeOf(out.lore));
    }
  });

  it("uses the hook and complication written for the vibe, not the generic fantasy ones", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateQuestLocal({ genre: "Cyberpunk" }, seededRng(seed));
      expect(QUEST_HOOK_POOLS.Cyberpunk.hooks).toContain(hookOf(out.content));
      expect(QUEST_HOOK_POOLS.Cyberpunk.complications).toContain(
        complicationOf(out.lore),
      );
      expect(out.content).not.toContain("A local official");
      expect(out.content).not.toContain("temple guardian");
    }
  });

  it("names the key NPC and the quest title from the vibe's name pool", () => {
    const out = generateQuestLocal({ genre: "Cyberpunk" }, seededRng(4));
    const npc = /- \*\*👤 (.+?)\*\*:/.exec(out.lore)?.[1];
    expect(INHABITANT_NAMES_BY_GENRE.Cyberpunk).toContain(npc);
    expect(out.title.startsWith(`${npc}'s `)).toBe(true);
  });

  it("keeps a fantasy vibe on the fantasy name pool", () => {
    const out = generateQuestLocal({ genre: "Classic Fantasy" }, seededRng(4));
    const npc = /- \*\*👤 (.+?)\*\*:/.exec(out.lore)?.[1];
    expect(INHABITANT_NAMES_BY_GENRE.Fantasy).toContain(npc);
  });

  it("keeps the campaign context in the GM notes and out of the public content", () => {
    const out = generateQuestLocal(
      { campaignContext: "The Salt Guild controls the rail yards." },
      seededRng(3),
    );
    expect(out.lore).toContain(
      "### Campaign Context\nThe Salt Guild controls the rail yards.",
    );
    expect(out.content).not.toContain("Salt Guild");
  });

  it("adds no campaign section when the context is blank", () => {
    const out = generateQuestLocal({ campaignContext: "   " }, seededRng(3));
    expect(out.lore).not.toContain("### Campaign Context");
  });

  it("writes no double hyphens in the offline draft", () => {
    for (const genre of [
      "Classic Fantasy",
      "Pirate",
      "Cyberpunk",
      "Cosmic Horror",
      "Western",
      "Steampunk",
    ]) {
      for (let seed = 1; seed <= 10; seed++) {
        const out = generateQuestLocal({ genre }, seededRng(seed));
        expect(out.content).not.toContain("--");
        expect(out.lore).not.toContain("--");
      }
    }
  });

  it("uses 'an' before a threat that starts with a vowel", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const out = generateQuestLocal(
        { genre: "Dark Fantasy", threat: "Inquisitor" },
        seededRng(seed),
      );
      expect(out.lore).toMatch(/[Aa]n inquisitor/);
      expect(out.lore).not.toMatch(/\b[Aa] inquisitor/);
    }
  });

  it("uses 'a' before a threat that starts with a consonant and keeps the acronym in 'Rogue AI'", () => {
    const railroad = generateQuestLocal(
      { genre: "Western", threat: "Railroad Baron" },
      seededRng(3),
    );
    expect(railroad.lore).toMatch(/[Aa] railroad baron/);
    const rogue = generateQuestLocal(
      { genre: "Cyberpunk", threat: "Rogue AI" },
      seededRng(3),
    );
    expect(rogue.lore).toContain("rogue AI");
    expect(rogue.lore).not.toContain("rogue ai");
  });

  it("finds a themed pool by genre and returns undefined when no vibe maps to it", () => {
    expect(themedQuestPool(questConfig.tonesByTheme, "Cyberpunk")).toBe(
      questConfig.tonesByTheme["Cyberpunk / Corporate"],
    );
    expect(
      themedQuestPool(questConfig.tonesByTheme, "No Such Genre"),
    ).toBeUndefined();
  });
});
