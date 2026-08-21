import { describe, it, expect } from "vitest";
import {
  buildMinorMagicItemPrompt,
  parseMinorMagicItemResponse,
  generateMinorMagicItemLocal,
} from "./public-minor-magic-item";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateMinorMagicItemLocal", () => {
  it("returns the expected structure with headings and labels", () => {
    const out = generateMinorMagicItemLocal({}, seededRng(5));
    expect(out.type).toBe("item");
    expect(out.content).toContain("### Description");
    expect(out.lore).toContain("### Quick Reference");
    expect(out.lore).toContain("### Magical Effect & Mechanics");
    expect(out.lore).toContain("### Quirk or Drawback");
    expect(out.lore).toContain("### Suggested Use in Play");
    expect(out.lore).toContain("### Provenance & Rumour");
    expect(out.labels).toContain("minor-magic-item");
    expect(out.labels).toContain("imported-draft");
  });

  it("honours explicit options passed in", () => {
    const out = generateMinorMagicItemLocal(
      {
        genre: "Cyberpunk / Corporate",
        form: "Burner Soft / Subroutine Chip",
        usageLimit: "Single Use (Breaks / Consumed on Activation)",
        utility:
          "Infiltration & Stealth (Muffling sound, masking scent, creating distraction, dimming light)",
        activation: "Speaking a whisper / command word",
        quirkSeverity: "None (Clean, quiet, functional)",
      },
      seededRng(2),
    );
    expect(out.lore).toContain(
      "- **Item Form**: Burner Soft / Subroutine Chip",
    );
    expect(out.lore).toContain(
      "- **Usage Limit**: Single Use (Breaks / Consumed on Activation)",
    );
    expect(out.lore).toContain(
      "- **Activation**: Speaking a whisper / command word",
    );
    expect(out.lore).toContain("- **Primary Utility**: Infiltration & Stealth");
    expect(out.lore).not.toContain(
      "(Muffling sound, masking scent, creating distraction, dimming light)",
    );
    expect(out.lore).toContain("- **Setting / Theme**: Cyberpunk / Corporate");
    expect(out.lore).toContain(
      "The item functions cleanly with no discernible side effect",
    );
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateMinorMagicItemLocal({}, seededRng(42))).toEqual(
      generateMinorMagicItemLocal({}, seededRng(42)),
    );
  });
});

describe("buildMinorMagicItemPrompt", () => {
  it("embeds genre, form, usageLimit, utility, activation, quirk, ban prompt, and consistency pass", () => {
    const { userMessage, resolved } = buildMinorMagicItemPrompt(
      {
        genre: "Classic Fantasy",
        form: "Charm / Talisman",
        usageLimit: "Fragile Charges (1d4+1 uses, breaks on last)",
        utility:
          "Sensory & Detection (Finding water, detecting lies, seeing warmth, hearing whispers)",
        activation: "Snapping / Crushing in hand",
        quirkSeverity:
          "Harmless Sensory Tell (Ozone smell, faint chime, spark of light)",
        campaignContext: "A dark forest campaign set in the Whispering Woods.",
      },
      "- Existing: Dusk Lantern (item)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre/Theme: Classic Fantasy");
    expect(userMessage).toContain("- Item Form: Charm / Talisman");
    expect(userMessage).toContain(
      "- Usage Limit / Charges: Fragile Charges (1d4+1 uses, breaks on last)",
    );
    expect(userMessage).toContain("- Focus / Utility: Sensory & Detection");
    expect(userMessage).toContain(
      "- Activation Method: Snapping / Crushing in hand",
    );
    expect(userMessage).toContain(
      "A dark forest campaign set in the Whispering Woods",
    );
    expect(userMessage).toContain(
      "Single Core Function: Keep each minor item centred on ONE core function.",
    );
    expect(userMessage).toContain(
      "Prioritise Practical, Gameable Utility: Even for strange, odd, or whimsical items, the core effect must have clear, immediate practical or gameable utility",
    );
    expect(userMessage).toContain(
      "Avoid adding secondary effects such as memory alteration or information-gathering (e.g. mood detection, aura sensing, or heartbeat tracking)",
    );
    expect(userMessage).toContain(
      'Enforce Required Output Sections: Every single generated item MUST include both the "### Quick Reference" and the full "### Magical Effect & Mechanics" section',
    );
    expect(userMessage).toContain(
      "Physical Form Matters: Make the physical form matter directly to how the item is handled, activated, and used in play.",
    );
    expect(userMessage).toContain(
      "Restrained Drawbacks & Tells: Keep quirks and drawbacks strictly restrained to one or two subtle, relevant tells",
    );
    expect(userMessage).toContain(
      "Independent Identity: Avoid automatically connecting newly generated items to lore, factions, or history from previous generations.",
    );
    expect(userMessage).toContain(
      "Accurate Quick Reference: In the Quick Reference section, **Primary Utility** must name ONLY the single specific function",
    );
    expect(userMessage).toContain(
      "Grounded Provenance Variety: Avoid recurring fantasy-generator clichés",
    );
    expect(userMessage).toContain("Before returning, run a consistency pass:");
    expect(userMessage).toContain(
      'Both "### Quick Reference" and the core mechanics section ("### Magical Effect & Mechanics") are present in full with clear, concrete mechanics',
    );
    expect(userMessage).toContain(
      "The item's core utility is immediately understandable, practical, and tempting to a player to use at the table",
    );
    expect(userMessage).toContain(
      "The item is centred on one core function without extraneous secondary effects",
    );
    expect(userMessage).toContain(
      "In Quick Reference, **Primary Utility** describes ONLY the specific effect actually present",
    );
    expect(userMessage).toContain(
      "Quirks and drawbacks are restrained to 1-2 subtle, relevant tells without setting-specific assumptions",
    );
    expect(userMessage).toContain(
      "The Provenance & Rumour section avoids generic generator tropes",
    );
    expect(userMessage).toContain(
      "The item stands on its own without forced links to prior generation lore",
    );
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("- Existing: Dusk Lantern (item)");
    expect(userMessage).toContain("Genre-Appropriate Causal Logic:");
    expect(userMessage).toContain(
      'The underlying causal logic strictly matches "Classic Fantasy"',
    );
    expect(resolved.suggestedName).toBeTruthy();
  });

  it("adapts causal logic and mechanics heading for technological genres", () => {
    const { userMessage } = buildMinorMagicItemPrompt({
      genre: "Cyberpunk / Corporate",
    });
    expect(userMessage).toContain("Technological / Hard-Sci-Fi Causality");
    expect(userMessage).toContain("NEVER introduce supernatural spells");
    expect(userMessage).toContain("### Technical Effect & Mechanism");
  });

  it("adapts causal logic and mechanics heading for Western / Frontier themes", () => {
    const { userMessage } = buildMinorMagicItemPrompt({
      genre: "Western / Frontier",
    });
    expect(userMessage).toContain("Western / Frontier Causality");
    expect(userMessage).toContain("Prefer frontier-era materials");
    expect(userMessage).toContain(
      "Avoid defaulting to sci-fi/steampunk mechanisms",
    );
    expect(userMessage).toContain("### Frontier Effect & Mechanics");
  });

  it("generates technological mechanics and names in local fallback for sci-fi/cyberpunk", () => {
    const out = generateMinorMagicItemLocal(
      {
        genre: "Cyberpunk / Corporate",
      },
      seededRng(1),
    );
    expect(out.lore).toContain("### Technical Effect & Mechanism");
    expect(out.lore).not.toContain("### Magical Effect & Mechanics");
    expect(out.content).toMatch(
      /anti-static polymer|composite|tactical webbing/,
    );
    expect(out.title).toBe("Static Filter");
  });

  it("generates period-appropriate frontier mechanics and materials in local fallback for Western", () => {
    const out = generateMinorMagicItemLocal(
      {
        genre: "Western / Frontier",
      },
      seededRng(1),
    );
    expect(out.lore).toContain("### Frontier Effect & Mechanics");
    expect(out.lore).not.toContain("### Technical Effect & Mechanism");
    expect(out.lore).not.toContain("### Magical Effect & Mechanics");
    expect(out.content).toMatch(
      /stamped sheet brass|saddle leather|whittled pine|tin canister|beeswax|notched copper|rawhide/,
    );
    expect(out.title).toBe("Prairie Notch");
  });

  it("includes avoidNames ban list in prompt and filters names present in context", () => {
    const { userMessage } = buildMinorMagicItemPrompt({
      avoidNames: ["Cinder Bead", "Glimmer Phial", "Whispering Woods"],
      campaignContext: "A dark forest campaign set in the Whispering Woods.",
    });

    expect(userMessage).toContain("Already created or used this session");
    expect(userMessage).toContain("- Cinder Bead");
    expect(userMessage).toContain("- Glimmer Phial");
    // Whispering Woods was in the campaignContext so it is excluded from the avoidNames ban list
    expect(userMessage).not.toContain("- Whispering Woods");
  });
});

describe("parseMinorMagicItemResponse", () => {
  const { resolved } = buildMinorMagicItemPrompt({}, "", seededRng(1));
  it("parses fenced JSON", () => {
    const json =
      '```json\n{"title":"Glimmer Phial","content":"### Description\\nA small glass phial.","lore":"### Quick Reference\\n- **Item Form**: Phial","labels":["minor-magic-item","imported-draft"]}\n```';
    const out = parseMinorMagicItemResponse(json, resolved);
    expect(out.title).toBe("Glimmer Phial");
    expect(out.content).toContain("A small glass phial.");
    expect(out.labels).toEqual(["minor-magic-item", "imported-draft"]);
  });

  it("enforces required Quick Reference and mechanics heading when omitted by model", () => {
    const out = parseMinorMagicItemResponse(
      '{"title":"Iron Charm","content":"A heavy iron charm.","lore":"### Quirk or Drawback\\nCold to the touch."}',
      resolved,
    );
    expect(out.lore).toContain("### Quick Reference");
    expect(out.lore).toContain("- **Item Form**:");
    expect(out.lore).toContain("### Magical Effect & Mechanics");
    expect(out.lore).toContain("### Quirk or Drawback");
  });

  it("falls back to resolved suggestedName when title is missing and throws on unparseable JSON", () => {
    const out = parseMinorMagicItemResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.suggestedName);
    expect(() =>
      parseMinorMagicItemResponse("not valid json", resolved),
    ).toThrow();
  });
});
