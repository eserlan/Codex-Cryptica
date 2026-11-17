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

  it("strips Markdown images and HTML media from every model field before saving", () => {
    const { resolved } = buildUrbanFantasyFactionPrompt({}, "", seededRng(24));
    const response = urbanFantasyAiResponse({
      title: "The Registry ![title](https://tracker.example/title.png)",
      summary:
        "A civic office keeps order. ![summary](https://tracker.example/summary.png)",
      content: urbanFantasyAiResponse().content.replace(
        "controls access to an unlisted transit platform",
        "controls access ![data](data:image/png;base64,AAAA) to a transit platform",
      ),
      lore: urbanFantasyAiResponse()
        .lore.replace(
          "a punched blue transit token",
          '![blob](blob:https://app.example/abc) <img src="https://tracker.example/symbol.png">',
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
    expect(savedFields).not.toMatch(/<\/?(?:img|video)\b/i);
    expect(output.title).toContain("title");
    expect(output.summary).toContain("summary");
    expect(output.labels).toContain("label");
  });

  it("strips media syntax from campaign context in local results", () => {
    const output = generateUrbanFantasyFactionLocal(
      {
        campaignContext:
          'The west market district. ![map](https://tracker.example/map.png) <audio src="https://tracker.example/ambience.mp3"></audio>',
      },
      seededRng(25),
    );

    expect(output.content).toContain("The west market district.");
    expect(output.content).not.toContain("tracker.example");
    expect(output.content).not.toContain("<audio");
  });
});
