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
    expect(userMessage).toContain("Before returning, run a consistency pass:");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("- Existing: Dusk Lantern (item)");
    expect(resolved.suggestedName).toBeTruthy();
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
