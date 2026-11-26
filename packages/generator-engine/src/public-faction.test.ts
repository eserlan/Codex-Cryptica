import { describe, it, expect } from "vitest";
import {
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  buildDarkFactionPrompt,
  parseDarkFactionResponse,
  generateDarkFactionLocal,
  darkFactionConfig,
  factionConfig,
  resolveFaction,
} from "./public-faction";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  buildUrbanFantasyFactionPrompt,
  generateUrbanFantasyFactionLocal,
  parseUrbanFantasyFactionResponse,
  resolveUrbanFantasyFaction,
  urbanFantasyFactionConfig,
  urbanFantasyFactionSchema,
} from "./public-urban-fantasy-faction";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function urbanFantasyAiResponse(
  overrides: Partial<{
    title: string;
    summary: string;
    content: string;
    lore: string;
    labels: string[];
  }> = {},
) {
  return {
    title: "The Night Registry",
    summary: "A civic office protects a hidden neighbourhood agreement.",
    content: `### Genre labels
Urban fantasy · modern fantasy · hidden-world politics

### What they control
The Registry controls access to an unlisted transit platform.

### What they want
It wants to keep the crossing open to residents.

### Why they are dangerous
It can redirect city resources without public oversight.

### How to use them at the table
Ask the party to mediate when a station closure threatens a community.`,
    lore: `### At a Glance
- **📍 Base**: an unlisted transit platform
- **Resource**: trusted night-shift dispatchers
- **Symbol**: a punched blue transit token
- **Secret**: its public safety reports were edited
- **Immediate Hook**: a commuter leaves the same impossible voicemail at three stations

### Notable NPCs
- **👤 Mara Venn**: a municipal planner who reads gaps in city records.
- **👤 Theo Barrow**: a night dispatcher who tracks rerouted calls.

### Internal Conflict
Its leaders disagree about whether to disclose a supernatural incident.

### Rival Faction
- **👥 Northside Mutual**: offers residents an open deal in exchange for control of the crossing.`,
    labels: ["urban-fantasy", "hidden-world"],
    ...overrides,
  };
}

describe("generateFactionLocal", () => {
  it("returns the four content sections and lore structure", () => {
    const out = generateFactionLocal({}, seededRng(5));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Rival Faction");
    expect(out.labels).toContain("faction-generator");
  });

  it("honours explicit type/scope/alignment", () => {
    const out = generateFactionLocal(
      {
        type: "Temple Order",
        scope: "Single city",
        alignment: "Idealistic but compromised",
      },
      seededRng(2),
    );
    expect(out.summary).toContain("temple order");
    expect(out.summary).toContain("single city");
  });

  it("offers dedicated Cosmic Horror faction choices", () => {
    expect(factionConfig.themes).toContain("Cosmic Horror");
    expect(factionConfig.typesByTheme["Cosmic Horror"]).toContain(
      "Research Society",
    );
    expect(factionConfig.scopesByTheme["Cosmic Horror"]).toContain(
      "Remote coast or valley",
    );
    expect(factionConfig.goalsByTheme["Cosmic Horror"]).toContain(
      "Contain an anomaly long enough to learn whether it can be moved safely.",
    );
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateFactionLocal({}, seededRng(9))).toEqual(
      generateFactionLocal({}, seededRng(9)),
    );
  });
});

describe("generateFactionLocal offline wording", () => {
  const scope = "Single city";

  it("uses 'An' before a vowel-led alignment and type", () => {
    const out = generateFactionLocal(
      {
        theme: "Classic Fantasy",
        alignment: factionConfig.alignments[1],
        type: "Arcane Circle",
        scope,
      },
      seededRng(3),
    );
    expect(out.summary).toMatch(
      /^An idealistic but compromised arcane circle /,
    );
    expect(out.content).toContain(" is an arcane circle ");
  });

  it("uses 'A' before a consonant-led alignment", () => {
    const out = generateFactionLocal(
      {
        theme: "Classic Fantasy",
        alignment: factionConfig.alignments[2],
        type: "Merchant Guild",
        scope,
      },
      seededRng(3),
    );
    expect(out.summary).toMatch(
      /^A pragmatic and profit-driven merchant guild /,
    );
  });

  it.each([
    ["Union Rapid Response Unit", "a union rapid response unit"],
    ["NHP Research Consortium", "an nhp research consortium"],
  ])("uses the spoken article for %s", (type, phrase) => {
    const out = generateFactionLocal(
      { theme: "Lancer", type, scope },
      seededRng(3),
    );
    expect(out.content).toContain(` is ${phrase} `);
  });

  it("describes the scope as a place without a 'level' suffix", () => {
    const out = generateFactionLocal({ theme: "Pirate", scope }, seededRng(3));
    expect(out.summary).toContain("operating across the single city.");
    expect(out.summary).not.toMatch(/\blevel\b/);
  });

  it("keeps the campaign context in the GM notes, not in the public text", () => {
    const out = generateFactionLocal(
      {
        theme: "Classic Fantasy",
        campaignContext: "The Salt Guild of Brindel",
      },
      seededRng(3),
    );
    expect(out.lore).toContain(
      "### Campaign Context\nThe Salt Guild of Brindel",
    );
    expect(out.content).not.toContain("Salt Guild");
    expect(out.content).toContain("Within the campaign setting");
  });

  it("omits the campaign section when the context is blank", () => {
    const out = generateFactionLocal(
      { theme: "Classic Fantasy", campaignContext: "  " },
      seededRng(3),
    );
    expect(out.lore).not.toContain("Campaign Context");
    expect(out.content).not.toContain("Within the campaign setting");
  });

  it("draws hooks and conflicts from the pool for the chosen vibe", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const resolved = resolveFaction(
        { theme: "Vampire / Gothic Noir" },
        seededRng(seed),
      );
      expect(factionConfig.hooksByTheme["Vampire / Gothic Noir"]).toContain(
        resolved.hook,
      );
      expect(factionConfig.conflictsByTheme["Vampire / Gothic Noir"]).toContain(
        resolved.conflict,
      );
      expect(factionConfig.hooksByTheme["Cyberpunk / Corporate"]).not.toContain(
        resolved.hook,
      );
    }
  });

  it("falls back to the Classic Fantasy pools for an unknown vibe", () => {
    const resolved = resolveFaction({ theme: "Typed by a GM" }, seededRng(2));
    expect(factionConfig.hooksByTheme["Classic Fantasy"]).toContain(
      resolved.hook,
    );
  });
});

describe("buildFactionPrompt", () => {
  it("embeds theme voice, ban prompt, and session context", () => {
    const { systemInstruction, userMessage } = buildFactionPrompt(
      { theme: "Post-Apocalyptic", type: "Wasteland Cult" },
      "- Existing: The Dust Choir (faction)",
      seededRng(4),
    );
    expect(systemInstruction).toContain("post-apocalyptic survival");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: The Dust Choir (faction)");
    expect(userMessage).toContain("- Faction Type: Wasteland Cult");
    expect(userMessage).toContain("- Theme/Genre: Post-Apocalyptic");
  });

  it("defaults the theme to the first config theme", () => {
    const { resolved } = buildFactionPrompt({}, "", seededRng(1));
    expect(resolved.theme).toBe(factionConfig.themes[0]);
  });

  it("uses the Western / Frontier theme voice", () => {
    const { systemInstruction, userMessage } = buildFactionPrompt(
      { theme: "Western / Frontier" },
      "",
      seededRng(1),
    );
    expect(systemInstruction).toContain("weird west or classic frontier");
    expect(userMessage).toContain("- Theme/Genre: Western / Frontier");
  });
});

describe("parseFactionResponse", () => {
  const { resolved } = buildFactionPrompt({}, "", seededRng(3));
  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"The Writ","summary":"x","content":"### What they control\\ny","lore":"### At the Table","labels":["a"]}\n```';
    const out = parseFactionResponse(json, resolved);
    expect(out.title).toBe("The Writ");
    expect(out.content).toContain("What they control");
  });
  it("throws on invalid JSON", () => {
    expect(() => parseFactionResponse("nope", resolved)).toThrow();
  });
});

describe("vampire clan", () => {
  it("generateVampireLocal returns GM reference lore", () => {
    const out = generateVampireLocal({}, seededRng(7));
    expect(out.type).toBe("faction");
    expect(out.lore).toContain("### GM Reference Information");
    expect(out.lore).toContain("- **Faction Type**: Vampire Clan");
    expect(out.labels).toContain("vampire-clan");
  });

  it("generateVampireLocal uses 'an' before a vowel-initial archetype", () => {
    const out = generateVampireLocal(
      { archetype: "Occult Coven" },
      seededRng(7),
    );
    expect(out.content).toMatch(/operating as an occult coven in the /);
    expect(out.content).not.toMatch(/\ba occult\b/);
  });

  it("generateVampireLocal keeps 'a' before a consonant-initial archetype", () => {
    const out = generateVampireLocal(
      { archetype: "Predatory Brood" },
      seededRng(7),
    );
    expect(out.content).toMatch(/operating as a predatory brood in the /);
    expect(out.content).not.toMatch(/\ban predatory\b/);
  });

  it("generateVampireLocal uses 'a' before a European Court archetype", () => {
    const out = generateVampireLocal(
      { archetype: "European Court" },
      seededRng(7),
    );
    expect(out.content).toMatch(/operating as a european court in the /);
    expect(out.content).not.toMatch(/\ban european\b/);
  });

  it("generateVampireLocal drops the bloodline hint from the overview but keeps it in the GM reference", () => {
    const out = generateVampireLocal(
      { bloodline: "Sanguine Nobles (Charismatic Mind-Benders)" },
      seededRng(7),
    );
    expect(out.content).toContain("of the sanguine nobles lineage");
    expect(out.content).not.toContain("(Charismatic Mind-Benders)");
    expect(out.lore).toContain(
      "- **Bloodline**: Sanguine Nobles (Charismatic Mind-Benders)",
    );
  });

  it("generateVampireLocal describes the scope as a place, not a bare fragment", () => {
    const out = generateVampireLocal({}, seededRng(7));
    expect(out.content).toMatch(/ in the [^.]+\.\s/);
    expect(out.content).not.toContain(" across ");
  });

  it("generateVampireLocal describes the clan as predators, not undead hunters", () => {
    const out = generateVampireLocal({}, seededRng(7));
    expect(out.content).toContain("coven of predators");
    expect(out.content).not.toContain("undead hunters");
  });

  it("buildVampirePrompt includes resolved options and ban prompt", () => {
    const { userMessage, resolved } = buildVampirePrompt(
      { archetype: "Occult Coven" },
      "",
      seededRng(6),
    );
    expect(userMessage).toContain("- Clan Archetype: Occult Coven");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(resolved.name.length).toBeGreaterThan(0);
  });

  it("parseVampireResponse falls back to the resolved name", () => {
    const { resolved } = buildVampirePrompt({}, "", seededRng(8));
    const out = parseVampireResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.name);
    expect(out.labels).toContain("vampire-clan");
  });
});

describe("dark fantasy faction (#1136)", () => {
  it("generateDarkFactionLocal returns the four content sections and lore structure", () => {
    const out = generateDarkFactionLocal({}, seededRng(11));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Rival Faction");
    expect(out.labels).toContain("dark-fantasy-faction");
    expect(out.labels).toContain("grimdark");
  });

  it("honours explicit mode/factionType/scope/moralPosture", () => {
    const out = generateDarkFactionLocal(
      {
        mode: "Plague City",
        factionType: "Plague Cult",
        scope: darkFactionConfig.scopes[0],
        moralPosture: darkFactionConfig.moralPostures[0],
      },
      seededRng(12),
    );
    expect(out.summary).toContain("plague cult");
  });

  it("writes a grammatical summary for every moral posture", () => {
    for (const posture of darkFactionConfig.moralPostures) {
      const out = generateDarkFactionLocal(
        {
          mode: "Plague City",
          factionType: "Mercenary Barony",
          scope: darkFactionConfig.scopes[0],
          moralPosture: posture,
        },
        seededRng(21),
      );
      const head = posture.split(" — ")[0];
      expect(out.summary).toBe(
        `A mercenary barony operating through a plague city, with the moral posture “${head}”.`,
      );
    }
  });

  it("uses 'an' before a vowel-initial custom faction type or mode", () => {
    const out = generateDarkFactionLocal(
      {
        mode: "Undead Empire",
        factionType: "Inquisition",
        scope: darkFactionConfig.scopes[0],
        moralPosture: darkFactionConfig.moralPostures[0],
      },
      seededRng(22),
    );
    expect(
      out.summary.startsWith(
        "An inquisition operating through an undead empire",
      ),
    ).toBe(true);
    expect(out.content).toContain(" is an inquisition with real authority");
  });

  it("states the posture as a clause in the danger section, without dash fragments", () => {
    const out = generateDarkFactionLocal(
      {
        mode: "Plague City",
        factionType: "Plague Cult",
        scope: darkFactionConfig.scopes[0],
        moralPosture: "Openly cruel — they no longer pretend otherwise",
      },
      seededRng(23),
    );
    expect(out.content).toContain(
      "Their chosen posture is “Openly cruel”: they no longer pretend otherwise.",
    );
    expect(out.content).not.toContain("—");
  });

  it("quotes noun-phrase postures in the danger section", () => {
    const out = generateDarkFactionLocal(
      {
        moralPosture: "Fallen idealists — they remember what they meant to be",
      },
      seededRng(25),
    );
    expect(out.content).toContain(
      "Their chosen posture is “Fallen idealists”: they remember what they meant to be.",
    );
  });

  it("frames campaign context as a sentence without doubled full stops", () => {
    const plain = generateDarkFactionLocal(
      { campaignContext: "The plague city of Ashford, under quarantine" },
      seededRng(24),
    );
    expect(plain.content).toContain(
      "Campaign context: The plague city of Ashford, under quarantine.",
    );

    const punctuated = generateDarkFactionLocal(
      { campaignContext: "A cursed kingdom under siege." },
      seededRng(24),
    );
    expect(punctuated.content).toContain(
      "Campaign context: A cursed kingdom under siege.",
    );
    expect(punctuated.content).not.toContain("..");
  });

  it("never gives the rival or a second NPC the faction's or leader's name", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const out = generateDarkFactionLocal({}, seededRng(seed));
      const rival = /- \*\*👥 (.+?)\*\*/.exec(out.lore)?.[1];
      const npcs = [...out.lore.matchAll(/- \*\*👤 (.+?)\*\*/g)].map(
        (m) => m[1],
      );
      expect(rival).toBeDefined();
      expect(rival).not.toBe(out.title);
      expect(npcs).toHaveLength(2);
      expect(npcs[1]).not.toBe(npcs[0]);
    }
  });

  it("does not repeat the internal conflict as the secret, and fixes the agent sentence", () => {
    const out = generateDarkFactionLocal({}, seededRng(25));
    expect(out.lore).toContain("- **Secret**: see Internal Conflict below.");
    expect(out.lore).not.toContain("Does the parts");
    expect(out.lore).toContain(
      "Handles the parts of the work no one else will",
    );
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateDarkFactionLocal({}, seededRng(13))).toEqual(
      generateDarkFactionLocal({}, seededRng(13)),
    );
  });

  it("buildDarkFactionPrompt includes resolved options and ban prompt", () => {
    const { systemInstruction, userMessage, resolved } = buildDarkFactionPrompt(
      { mode: "Witch-Hunt", factionType: "Witch-Hunter Lodge" },
      "- Existing: The Ashen Veil (faction)",
      seededRng(14),
    );
    expect(systemInstruction).toContain("grimdark worldbuilding");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: The Ashen Veil (faction)");
    expect(userMessage).toContain("- Dark Fantasy Mode: Witch-Hunt");
    expect(userMessage).toContain("- Faction Type: Witch-Hunter Lodge");
    expect(resolved.name.length).toBeGreaterThan(0);
  });

  it("parseDarkFactionResponse falls back to the resolved name and labels", () => {
    const { resolved } = buildDarkFactionPrompt({}, "", seededRng(15));
    const out = parseDarkFactionResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.name);
    expect(out.labels).toContain("dark-fantasy-faction");
    expect(out.labels).toContain("grimdark");
  });

  it("throws on invalid JSON", () => {
    const { resolved } = buildDarkFactionPrompt({}, "", seededRng(16));
    expect(() => parseDarkFactionResponse("nope", resolved)).toThrow();
  });
});

describe("urban fantasy faction (#1137)", () => {
  it("offers each required city mode, faction type, scope and moral posture", () => {
    expect(urbanFantasyFactionConfig.modes).toEqual(
      expect.arrayContaining([
        "Hidden-world city politics",
        "Occult crime",
        "Monster diplomacy",
        "Magical bureaucracy",
        "Street-level magic",
        "Paranormal investigation",
        "Corporate occult",
      ]),
    );
    expect(urbanFantasyFactionConfig.types).toEqual(
      expect.arrayContaining([
        "Mage Cabal",
        "Monster Court",
        "Paranormal Agency",
        "Occult Gang",
        "Hunter Lodge",
        "Fae Market",
        "Supernatural Corporation",
        "Secret Council",
      ]),
    );
    expect(urbanFantasyFactionConfig.scopes).toEqual(
      expect.arrayContaining([
        "Neighbourhood",
        "City District",
        "Whole City",
        "Transit Network",
        "University",
        "Corporate Campus",
        "Hidden Market",
        "Regional Network",
      ]),
    );
    expect(urbanFantasyFactionConfig.moralPostures).toEqual(
      expect.arrayContaining([
        "Protective but secretive",
        "Predatory but lawful",
        "Pragmatic brokers",
        "Idealistic investigators",
        "Ancient aristocrats",
        "Street-level survivors",
      ]),
    );
    expect(urbanFantasyFactionSchema.axes.map((axis) => axis.id)).toEqual([
      "mode",
      "factionType",
      "scope",
      "moralPosture",
      "goal",
      "conflict",
      "hook",
    ]);
    expect(
      urbanFantasyFactionSchema.axes[0].pool({
        genre: "",
        values: {},
        traits: [],
      }),
    ).toEqual(urbanFantasyFactionConfig.modes);
  });

  it("keeps valid selections in the local faction output and includes every section", () => {
    const options = {
      mode: "Paranormal investigation",
      factionType: "Paranormal Agency",
      scope: "Transit Network",
      moralPosture: "Idealistic investigators",
    };
    const resolved = resolveUrbanFantasyFaction(options, seededRng(20));
    const out = generateUrbanFantasyFactionLocal(options, seededRng(20));

    expect(resolved).toMatchObject(options);
    expect(out.type).toBe("faction");
    expect(out.summary).toContain("paranormal agency");
    expect(out.summary).toContain("transit network");
    expect(out.summary).not.toContain("\n");
    expect(`${out.content}\n${out.lore}`).not.toMatch(/vampire|horror/i);
    expect(out.content).toContain("### Genre labels");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### What they want");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.content).toContain("### How to use them at the table");
    expect(out.lore).toContain("### At a Glance");
    for (const field of [
      "**📍 Base**:",
      "**Resource**:",
      "**Symbol**:",
      "**Secret**:",
      "**Immediate Hook**:",
    ]) {
      expect(out.lore).toContain(field);
    }
    expect(out.lore).toContain("### Notable NPCs");
    expect(out.lore).toContain("### Internal Conflict");
    expect(out.lore).toContain("### Rival Faction");
    expect(out.labels).toEqual(
      expect.arrayContaining([
        "urban-fantasy",
        "modern-fantasy",
        "supernatural-faction",
        "hidden-world",
      ]),
    );
  });

  it("includes the selected options in the AI prompt", () => {
    const { systemInstruction, userMessage, resolved } =
      buildUrbanFantasyFactionPrompt(
        {
          mode: "Corporate occult",
          factionType: "Supernatural Corporation",
          scope: "Corporate Campus",
          moralPosture: "Pragmatic brokers",
        },
        "- Existing: The Night Registry (faction)",
        seededRng(21),
      );

    expect(systemInstruction).toContain("modern institutions");
    expect(systemInstruction).toContain("### Genre labels");
    expect(userMessage).toContain("- Urban Fantasy Mode: Corporate occult");
    expect(userMessage).toContain("- Faction Type: Supernatural Corporation");
    expect(userMessage).toContain("- Operating Scope: Corporate Campus");
    expect(userMessage).toContain("- Moral Posture: Pragmatic brokers");
    expect(userMessage).toContain(`- Faction Name: ${resolved.name}`);
  });

  it("rejects malformed or incomplete AI faction responses", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(22));

    expect(() =>
      parseUrbanFantasyFactionResponse("not json", resolved),
    ).toThrow();
    expect(() =>
      parseUrbanFantasyFactionResponse(
        JSON.stringify({ title: "The Permit Office", summary: "A faction." }),
        resolved,
      ),
    ).toThrow(/missing required content/);
  });

  it("rejects headings and field labels with empty section values", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(23));
    const response = urbanFantasyAiResponse({
      summary: "A faction with an agenda.",
      content: `### Genre labels

### What they control

### What they want

### Why they are dangerous

### How to use them at the table`,
      lore: `### At a Glance
- **📍 Base**:
- **Resource**:
- **Symbol**:
- **Secret**:
- **Immediate Hook**:

### Notable NPCs
- **👤 **:
- **👤 **:

### Internal Conflict

### Rival Faction
- **👥 **:`,
    });

    expect(() =>
      parseUrbanFantasyFactionResponse(JSON.stringify(response), resolved),
    ).toThrow(/missing required content/);
  });

  it("rejects required structure contained only inside Markdown code fences", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(232));
    const valid = urbanFantasyAiResponse();
    const response = urbanFantasyAiResponse({
      content: `\n\`\`\`md\n${valid.content}\n\`\`\``,
      lore: `\n~~~md\n${valid.lore}\n~~~`,
    });

    expect(() =>
      parseUrbanFantasyFactionResponse(JSON.stringify(response), resolved),
    ).toThrow(/missing required content/);
  });

  it("rejects whitespace-only NPC and rival names", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(231));
    const validLore = urbanFantasyAiResponse().lore;
    const whitespaceNpcLore = validLore
      .replace("Mara Venn", "   ")
      .replace("Theo Barrow", " \t ");
    const whitespaceRivalLore = validLore.replace("Northside Mutual", "   ");

    expect(() =>
      parseUrbanFantasyFactionResponse(
        JSON.stringify(urbanFantasyAiResponse({ lore: whitespaceNpcLore })),
        resolved,
      ),
    ).toThrow(/2-3 named Notable NPC bullets/);
    expect(() =>
      parseUrbanFantasyFactionResponse(
        JSON.stringify(urbanFantasyAiResponse({ lore: whitespaceRivalLore })),
        resolved,
      ),
    ).toThrow(/exactly one named Rival Faction/);
  });

  it("rejects multiple named rival factions", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt(
      {},
      "",
      seededRng(2321),
    );
    const validLore = urbanFantasyAiResponse().lore;
    const multipleRivals = validLore.replace(
      "- **👥 Northside Mutual**: offers residents an open deal in exchange for control of the crossing.",
      "- **👥 Northside Mutual**: offers residents an open deal in exchange for control of the crossing.\n- **👥 The Night Registry**: a second rival.",
    );

    expect(() =>
      parseUrbanFantasyFactionResponse(
        JSON.stringify(urbanFantasyAiResponse({ lore: multipleRivals })),
        resolved,
      ),
    ).toThrow(/exactly one named Rival Faction/);
  });

  it("uses only fixed labels and ignores model-provided functional labels", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt(
      {},
      "",
      seededRng(2322),
    );
    const output = parseUrbanFantasyFactionResponse(
      JSON.stringify(
        urbanFantasyAiResponse({
          labels: ["mystery-generator", "user-label", "urban-fantasy"],
        }),
      ),
      resolved,
    );

    expect(output.labels).not.toContain("mystery-generator");
    expect(output.labels).not.toContain("user-label");
    expect(output.labels).toContain("urban-fantasy");
  });

  it("strips Markdown images and HTML media from every model field before saving", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(24));
    const response = urbanFantasyAiResponse({
      title: "The Registry ![title](https://tracker.example/title.png)",
      summary:
        "A civic office keeps order. ![summary](https://tracker.example/summary.png) <style>@import url(https://tracker.example/summary.css);</style>",
      content: urbanFantasyAiResponse().content.replace(
        "controls access to an unlisted transit platform",
        'controls access ![data](data:image/png;base64,AAAA) to a transit platform <span style="background-image:url(https://tracker.example/content.png)">record</span> <input type="image" src="https://tracker.example/image-input.png"><input type="image" src="data:image/png;base64,AAAA"><input type="image" src="blob:https://app.example/image-id"><svg><filter><feImage href="https://tracker.example/remote-svg.png"></feImage></filter></svg><svg><filter><feImage href="data:image/png;base64,AAAA"></feImage></filter></svg><svg><filter><feImage href="blob:https://app.example/svg-image"></feImage></filter></svg>',
      ),
      lore: urbanFantasyAiResponse()
        .lore.replace(
          "a punched blue transit token",
          '![blob](blob:https://app.example/abc) <img src="https://tracker.example/symbol.png"> <link rel="stylesheet" href="https://tracker.example/lore.css">',
        )
        .replace(
          "a municipal planner who reads gaps in city records.",
          'a municipal planner who reads gaps in city records. <video src="https://tracker.example/clip.mp4"></video>',
        ),
      labels: ["![label](https://tracker.example/label.png)", "urban-fantasy"],
    });

    const output = parseUrbanFantasyFactionResponse(
      JSON.stringify(response),
      resolved,
    );
    const savedFields = [
      output.title,
      output.summary,
      output.content,
      output.lore,
      ...output.labels,
    ].join("\n");

    expect(savedFields).not.toMatch(/https?:\/\/tracker\.example/);
    expect(savedFields).not.toMatch(/data:image|blob:/);
    expect(savedFields).not.toMatch(/<\/?(?:img|video|input)\b/i);
    expect(savedFields).not.toMatch(/<svg\b|<feimage\b|<filter\b|href\s*=/i);
    expect(savedFields).not.toMatch(/style\s*=|<style\b|@import|url\(/i);
    expect(output.title).toContain("title");
    expect(output.summary).toContain("summary");
    expect(output.labels).not.toContain("label");
  });

  it("strips media syntax from campaign context in local results", () => {
    const output = generateUrbanFantasyFactionLocal(
      {
        campaignContext:
          'The west market district. ![map](https://tracker.example/map.png) <audio src="https://tracker.example/ambience.mp3"></audio> <span style="background-image:url(https://tracker.example/context.png)">market</span> <style>@import url(https://tracker.example/context.css);</style> <input type="image" src="https://tracker.example/context-input.png"> <svg><filter><feImage href="https://tracker.example/context-svg.png"></feImage></filter></svg>',
      },
      seededRng(25),
    );

    expect(output.content).toContain("The west market district.");
    expect(output.content).not.toContain("tracker.example");
    expect(output.content).not.toContain("<audio");
    expect(output.content).not.toContain("<input");
    expect(output.content).not.toMatch(/<svg\b|<feimage\b|<filter\b|href\s*=/i);
    expect(output.content).not.toMatch(/style\s*=|<style\b|@import|url\(/i);
  });

  it("sanitizes custom options before resolving and generating local factions", () => {
    const customInputs = [
      "![custom option](https://attacker.example/remote.png)",
      "![custom option](data:image/png;base64,AAAA)",
      "![custom option](blob:https://attacker.example/image-id)",
      '<img src="https://attacker.example/html.png" alt="custom option">',
      '<input type="image" src="https://attacker.example/input.png">',
      '<input type="image" src="data:image/png;base64,AAAA">',
      '<input type="image" src="blob:https://attacker.example/image-id">',
      '<svg><filter><feImage href="https://attacker.example/svg.png"></feImage></filter></svg>',
      '<svg><filter><feImage href="data:image/png;base64,AAAA"></feImage></filter></svg>',
      '<svg><filter><feImage href="blob:https://attacker.example/svg-image"></feImage></filter></svg>',
      '<span style="background-image:url(https://attacker.example/style.png)">custom option</span>',
      "<style>@import url(https://attacker.example/import.css);</style>custom option",
      '<table title="a > b" background="https://attacker.example/table.png">custom option</table>',
      '<svg><rect fill="url(https://attacker.example/paint.svg#paint)"/></svg>',
    ];
    const optionKeys = [
      "mode",
      "factionType",
      "scope",
      "moralPosture",
    ] as const;
    let seed = 30;

    for (const optionKey of optionKeys) {
      for (const customValue of customInputs) {
        const options = { [optionKey]: customValue };
        const resolved = resolveUrbanFantasyFaction(options, seededRng(seed));
        const output = generateUrbanFantasyFactionLocal(
          options,
          seededRng(seed),
        );
        const savedContent = [
          resolved.mode,
          resolved.factionType,
          resolved.scope,
          resolved.moralPosture,
          output.summary,
          output.content,
          output.lore,
        ].join("\n");

        expect(resolved[optionKey].trim()).toBeTruthy();
        expect(savedContent).not.toMatch(
          /https?:\/\/attacker\.example|data:image|blob:|<img\b|<input\b|<svg\b|<feimage\b|<filter\b|href\s*=|style\s*=|<style\b|@import|url\(/i,
        );
        seed += 1;
      }
    }
  });
});
