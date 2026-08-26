import { describe, it, expect } from "vitest";
import {
  buildNpcPrompt,
  parseNpcResponse,
  generateNpcLocal,
  injectDndNpcQuickStats,
  npcThemeConfig,
  NAME_BAN_PROMPT,
} from "./public-npc";

// Deterministic rng (LCG) so prompt/local output is stable across runs.
function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateNpcLocal", () => {
  it("returns a full PublicGeneratorOutput with the four content sections", () => {
    const out = generateNpcLocal({}, seededRng(42));
    expect(out.type).toBe("character");
    expect(out.title.length).toBeGreaterThan(0);
    expect(out.content).toContain("### Who they are");
    expect(out.content).toContain("### What they want");
    expect(out.content).toContain("### Why they are useful");
    expect(out.content).toContain("### How to use them at the table");
    expect(out.lore).toContain("### At a Glance");
    expect(out.labels).toContain("npc-generator");
    expect(out.status).toBe("active");
  });

  it("honours explicit race/role/alignment options", () => {
    const out = generateNpcLocal(
      { race: "Dwarf", role: "Blacksmith", alignment: "Lawful Good" },
      seededRng(1),
    );
    expect(out.lore).toContain("- **Ancestry**: Dwarf");
    expect(out.lore).toContain("- **Role**: Blacksmith");
    expect(out.summary).toContain("dwarf");
  });

  it("uses the theme morality label when a theme is provided", () => {
    const morality = npcThemeConfig.moralities["Vampire / Gothic Noir"][0];
    const out = generateNpcLocal(
      { theme: "Vampire / Gothic Noir", alignment: morality.id },
      seededRng(7),
    );
    expect(out.lore).toContain(`- **Moral Stance**: ${morality.label}`);
  });

  it("offers dedicated Cosmic Horror NPC choices", () => {
    expect(npcThemeConfig.ancestries["Cosmic Horror"]).toContain(
      "Dream-Touched Human",
    );
    expect(npcThemeConfig.roles["Cosmic Horror"]).toContain("Investigator");
    expect(npcThemeConfig.moralities["Cosmic Horror"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "evidence_bound" }),
      ]),
    );
  });

  it("injects D&D quick stats only when requested", () => {
    const without = generateNpcLocal({ role: "Mage" }, seededRng(3));
    expect(without.lore).not.toContain("Class / Archetype");
    const withStats = generateNpcLocal(
      { role: "Mage", includeDndQuickStats: true },
      seededRng(3),
    );
    expect(withStats.lore).toContain("Class / Archetype");
    expect(withStats.lore).toContain("Wizard / Level 5");
  });

  it("is deterministic for a fixed rng seed", () => {
    expect(generateNpcLocal({}, seededRng(99))).toEqual(
      generateNpcLocal({}, seededRng(99)),
    );
  });
});

describe("buildNpcPrompt", () => {
  it("embeds the theme voice, ban prompt, and session context", () => {
    const { systemInstruction, userMessage } = buildNpcPrompt(
      { theme: "Cyberpunk / Corporate", role: "Netrunner" },
      "- Existing: The Grid (faction)",
      seededRng(5),
    );
    expect(systemInstruction).toContain("near-future cyberpunk");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: The Grid (faction)");
    expect(userMessage).toContain("- Role: Netrunner");
    expect(userMessage).toContain("Genre/Theme: Cyberpunk / Corporate");
  });

  it("uses the morality behavioral directive when the theme defines one", () => {
    const morality = npcThemeConfig.moralities["Classic Fantasy"][0];
    const { userMessage } = buildNpcPrompt(
      { theme: "Classic Fantasy", alignment: morality.id },
      "",
      seededRng(2),
    );
    expect(userMessage).toContain(`- Moral Stance: ${morality.label}`);
    expect(userMessage).toContain(morality.aiPromptDirective);
  });

  it("uses the Western / Frontier morality anchors and voice", () => {
    const morality = npcThemeConfig.moralities["Western / Frontier"][0];
    const { systemInstruction, userMessage } = buildNpcPrompt(
      { theme: "Western / Frontier", alignment: morality.id },
      "",
      seededRng(2),
    );
    expect(systemInstruction).toContain("weird west or classic frontier");
    expect(userMessage).toContain(`- Moral Stance: ${morality.label}`);
    expect(userMessage).toContain(morality.aiPromptDirective);
  });

  it("falls back to a generic voice for an unknown theme", () => {
    const { systemInstruction } = buildNpcPrompt(
      { theme: "Nonsense" },
      "",
      seededRng(1),
    );
    expect(systemInstruction).toContain("tabletop RPG");
  });
});

describe("parseNpcResponse", () => {
  const { resolved } = buildNpcPrompt({ role: "Mage" }, "", seededRng(11));

  it("parses a fenced JSON payload", () => {
    const json =
      '```json\n{"title":"Sora","summary":"A mage.","content":"### Who they are\\nSora.","lore":"### At a Glance\\n- **Role**: Mage","labels":["mage"]}\n```';
    const out = parseNpcResponse(json, { role: "Mage" }, resolved);
    expect(out.title).toBe("Sora");
    expect(out.content).toContain("Sora");
    expect(out.labels).toEqual(["mage"]);
  });

  it("injects quick stats into parsed lore when requested", () => {
    const json =
      '{"title":"Sora","summary":"x","content":"y","lore":"### At a Glance\\n- **Role**: Mage","labels":[]}';
    const out = parseNpcResponse(
      json,
      { role: "Mage", includeDndQuickStats: true },
      resolved,
    );
    expect(out.lore).toContain("Class / Archetype");
  });

  it("throws on invalid JSON so the caller can fall back", () => {
    expect(() =>
      parseNpcResponse("not json", { role: "Mage" }, resolved),
    ).toThrow();
  });
});

describe("injectDndNpcQuickStats", () => {
  it("is idempotent", () => {
    const once = injectDndNpcQuickStats(
      "### At a Glance\n- **Role**: Mage",
      "Mage",
    );
    expect(injectDndNpcQuickStats(once, "Mage")).toBe(once);
  });
});

describe("Delve Boss / Key NPC contextual generation", () => {
  it("generates local delve boss output with lair sector, alert response, and secret tie", () => {
    const out = generateNpcLocal(
      {
        role: "Dungeon Mastermind",
        theme: "Classic Fantasy",
        delveContext: {
          delveTitle: "The Sunken Vault",
          conflict: "Goblins vs Kobold miners",
          secret: "Houses an active planar core",
          sectors: ["Guarded Gateway", "Deep Arcana Vault"],
        },
      },
      seededRng(42),
    );

    expect(out.lore).toContain("- **Delve Sector / Lair**:");
    expect(out.lore).toContain("- **Relation to Inhabitants**:");
    expect(out.lore).toContain("- **Tie to Central Secret**:");
    expect(out.lore).toContain("### Alert & Lair Response");
    expect(out.lore).toContain("Stage 1 (Unaware)");
    expect(out.lore).toContain("Stage 2 (Alerted)");
    expect(out.lore).toContain("Stage 3 (Lair Defense / Confrontation)");
    expect(out.labels).toContain("delve-boss");
    expect(out.labels).toContain("dungeon-npc");
  });

  it("builds an AI prompt with delve instructions and structured delve context block", () => {
    const { systemInstruction, userMessage, resolved } = buildNpcPrompt(
      {
        role: "Bound Vault Guardian",
        delveContext: {
          delveTitle: "Submerged Crypt",
          theme: "Gothic Horror",
          conflict: "Vampire spawn feasting on trapped ghouls",
          secret: "A silver sarcophagus contains a star beast",
          sectors: ["Flooded Nave", "Inner Crypt"],
        },
      },
      "",
      seededRng(10),
    );

    expect(resolved.isDelve).toBe(true);
    expect(systemInstruction).toContain("DELVE / DUNGEON CONTEXT ACTIVE");
    expect(systemInstruction).toContain("Alert & Lair Response");
    expect(userMessage).toContain("[Delve Source Context]");
    expect(userMessage).toContain("- Dungeon Location: Submerged Crypt");
    expect(userMessage).toContain(
      "- Central Secret / Mystery: A silver sarcophagus contains a star beast",
    );
    expect(userMessage).toContain("- Key Sectors: Flooded Nave, Inner Crypt");
  });

  it("parses AI response and injects delve-boss and dungeon-npc labels", () => {
    const { resolved } = buildNpcPrompt(
      {
        role: "Dungeon Mastermind",
        delveContext: "Ancient Necropolis",
      },
      "",
      seededRng(15),
    );

    const json =
      '{"title":"Xalvador","summary":"Lair master.","content":"### Who they are\\nXalvador.","lore":"### At a Glance\\n- **Role**: Dungeon Mastermind","labels":["rpg-character"]}';
    const out = parseNpcResponse(json, {}, resolved);
    expect(out.labels).toContain("delve-boss");
    expect(out.labels).toContain("dungeon-npc");
  });
});
