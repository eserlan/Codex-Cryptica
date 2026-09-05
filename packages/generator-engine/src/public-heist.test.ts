import { describe, expect, it } from "vitest";
import {
  buildHeistPrompt,
  generateHeistLocal,
  heistConfig,
  parseHeistResponse,
} from "./public-heist";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateHeistLocal", () => {
  it("returns every section of the heist framework", () => {
    const out = generateHeistLocal({}, seededRng(5));
    expect(out.type).toBe("event");
    expect(out.content).toContain("### The Score");
    expect(out.content).toContain("### The Prize");
    expect(out.content).toContain("### Casing the Target");
    expect(out.lore).toContain("### The Hidden Factor");
    expect(out.lore).toContain("### Security Rings");
    expect(out.lore).toContain("### Alarm Track");
    expect(out.lore).toContain("### Complications");
    expect(out.lore).toContain("### The Getaway");
    expect(out.lore).toContain("### Flashback Opportunities");
    expect(out.labels).toContain("heist");
    expect(out.labels).toContain("heist-generator");
  });

  it("lays out all five alarm states in escalating order", () => {
    const out = generateHeistLocal({}, seededRng(7));
    const positions = heistConfig.alarmStates.map((state) =>
      out.lore.indexOf(state),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("gives each security ring more than one way through it", () => {
    const out = generateHeistLocal({}, seededRng(4));
    for (const ring of ["Perimeter", "Access", "Inner Vault"]) {
      const line = out.lore
        .split("\n")
        .find((l) => l.startsWith(`- **${ring}**`));
      expect(line, `missing ${ring} ring`).toBeDefined();
      // "by X, by Y, or by Z" — at least two distinct approaches per layer.
      expect(line!.match(/\bby\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("marks exactly one complication as the default and fires a trigger on the lift", () => {
    const out = generateHeistLocal({}, seededRng(12));
    expect(out.lore.match(/\(default\)/g)?.length).toBe(1);
    expect(out.lore).toContain("**When the prize is taken:**");
  });

  it("gives the prize a practical complication drawn from the config", () => {
    const out = generateHeistLocal({}, seededRng(3));
    const label = heistConfig.prizeComplications
      .map((c) => c.split(" — ")[0])
      .find((c) => out.content.includes(`**The catch**: ${c}`));
    expect(label).toBeDefined();
  });

  it("compromises the original route and offers alternates plus a pursuit", () => {
    const out = generateHeistLocal({}, seededRng(8));
    expect(out.lore).toContain("Alternate route A");
    expect(out.lore).toContain("Alternate route B");
    expect(out.lore).toContain("**Pursuit**:");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateHeistLocal(
      {
        genre: "Cyberpunk / Corporate",
        heistType: "Extraction",
        targetScale: "Legendary",
        targetType: "Data Fortress",
        prize: "the Ashgrove source ledger",
        campaignContext: "a crew burned by their last fixer",
      },
      seededRng(2),
    );
    expect(out.content).toContain("Extraction at");
    expect(out.content).toContain("the Ashgrove source ledger");
    expect(out.content).toContain("a crew burned by their last fixer");
    expect(out.content).toContain("legendary-scale data fortress");
    expect(out.labels).toContain("Cyberpunk / Corporate");
    expect(out.labels).toContain("Extraction");
  });

  it("picks a genre-appropriate target when none is given", () => {
    const out = generateHeistLocal(
      { genre: "Western / Frontier" },
      seededRng(6),
    );
    const matched = heistConfig.targetTypesByTheme["Western / Frontier"].some(
      (t) => out.content.includes(t),
    );
    expect(matched).toBe(true);
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateHeistLocal({}, seededRng(9))).toEqual(
      generateHeistLocal({}, seededRng(9)),
    );
  });
});

describe("buildHeistPrompt", () => {
  it("passes the resolved options through into the prompt", () => {
    const { userMessage, resolved } = buildHeistPrompt(
      {
        genre: "Sci-Fi / Space Opera",
        heistType: "Sabotage",
        targetScale: "Major",
        targetType: "Orbital Station Vault",
      },
      "",
      seededRng(1),
    );
    expect(resolved.genre).toBe("Sci-Fi / Space Opera");
    expect(userMessage).toContain("- Heist Type: Sabotage");
    expect(userMessage).toContain("- Target Scale: Major");
    expect(userMessage).toContain("- Target: Orbital Station Vault");
    expect(userMessage).toContain(resolved.prizeComplication);
    expect(userMessage).toContain(NAME_BAN_PROMPT);
  });

  it("asks for every framework section by its exact heading", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    for (const heading of [
      "### The Score",
      "### The Prize",
      "### Casing the Target",
      "### The Hidden Factor",
      "### Security Rings",
      "### Alarm Track",
      "### Complications",
      "### The Getaway",
      "### Flashback Opportunities",
    ]) {
      expect(userMessage).toContain(heading);
    }
  });

  it("ends with a field-specific consistency pass", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("run a consistency pass");
    expect(userMessage).toContain(
      'exactly one complication is marked "(default)"',
    );
    expect(userMessage).toContain(
      'the compromised route in "The Getaway" is the same route the crew entered by',
    );
    expect(userMessage).toContain(
      "each of the three security rings names at least two different approaches",
    );
  });

  it("appends the session context", () => {
    const { userMessage } = buildHeistPrompt(
      {},
      "Existing session names: Vex",
      seededRng(1),
    );
    expect(userMessage).toContain("Existing session names: Vex");
  });
});

describe("parseHeistResponse", () => {
  it("parses a fenced JSON response", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const out = parseHeistResponse(
      '```json\n{"title":"The Glass Testament","content":"### The Score\\nTake it.","lore":"### Alarm Track\\n- **0 — Quiet**","labels":["heist"]}\n```',
      resolved,
    );
    expect(out.title).toBe("The Glass Testament");
    expect(out.content).toContain("### The Score");
    expect(out.labels).toContain("heist");
  });

  it("drops foreign labels that would hijack another generator's layout rule", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const out = parseHeistResponse(
      '{"title":"T","content":"c","lore":"l","labels":["quest-generator","heist","infiltration"]}',
      resolved,
    );
    expect(out.labels).not.toContain("quest-generator");
    expect(out.labels).toContain("heist");
    expect(out.labels).toContain("infiltration");
  });

  it("falls back to the resolved title when the model omits one", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const out = parseHeistResponse('{"content":"c","lore":"l"}', resolved);
    expect(out.title).toBe(resolved.title);
    expect(out.labels).toContain("heist");
    expect(out.labels).toContain(resolved.genre);
  });

  it("throws on unusable JSON so the engine can fall back locally", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    expect(() => parseHeistResponse("not json at all", resolved)).toThrow();
  });
});
