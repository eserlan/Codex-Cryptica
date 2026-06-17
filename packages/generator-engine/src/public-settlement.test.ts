import { describe, it, expect } from "vitest";
import {
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
  settlementConfig,
} from "./public-settlement";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateSettlementLocal", () => {
  it("returns the location lore structure", () => {
    const out = generateSettlementLocal({}, seededRng(5));
    expect(out.type).toBe("location");
    expect(out.content).toContain("### Description");
    expect(out.content).toContain("### Atmosphere");
    expect(out.lore).toContain("### GM Reference Information");
    expect(out.lore).toContain("### Points of Interest");
    expect(out.lore).toContain("### Controlling Factions");
    expect(out.labels).toContain("rpg-location");
  });

  it("honours an explicit size and its points-of-interest count", () => {
    const out = generateSettlementLocal({ size: "Hamlet" }, seededRng(2));
    expect(out.lore).toContain("- **Size**: Hamlet");
    // Hamlet => 1 point of interest
    const poiLines = out.lore.split("\n").filter((l) => l.startsWith("- **📍"));
    expect(poiLines).toHaveLength(1);
  });

  it("honours an explicit economy", () => {
    const out = generateSettlementLocal({ economy: "Mining" }, seededRng(3));
    expect(out.lore).toContain("- **Primary Economy**: Mining");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateSettlementLocal({}, seededRng(9))).toEqual(
      generateSettlementLocal({}, seededRng(9)),
    );
  });
});

describe("buildSettlementPrompt", () => {
  it("embeds size, economy, ban prompt and session context", () => {
    const { userMessage, resolved } = buildSettlementPrompt(
      { size: "City", economy: "Trade Hub" },
      "- Existing: Saltmere (location)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Size: City");
    expect(userMessage).toContain("- Primary Economy: Trade Hub");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("- Existing: Saltmere (location)");
    expect(resolved.population).toBe(
      settlementConfig.sizes.find((s) => s.name === "City")!.range,
    );
  });
});

describe("parseSettlementResponse", () => {
  const { resolved } = buildSettlementPrompt({}, "", seededRng(1));
  it("parses fenced JSON", () => {
    const json =
      '```json\n{"title":"Saltmere","content":"### Description\\nx","lore":"### GM Reference Information","labels":["rpg-location"]}\n```';
    const out = parseSettlementResponse(json, resolved);
    expect(out.title).toBe("Saltmere");
    expect(out.content).toContain("Description");
  });
  it("falls back to the resolved name and throws on bad JSON", () => {
    const out = parseSettlementResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.name);
    expect(() => parseSettlementResponse("nope", resolved)).toThrow();
  });
});
