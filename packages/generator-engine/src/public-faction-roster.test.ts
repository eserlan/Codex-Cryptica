import { describe, it, expect } from "vitest";
import {
  buildFactionRosterPrompt,
  parseFactionRosterResponse,
  generateFactionRosterLocal,
  resolveFactionRoster,
  factionRosterConfig,
} from "./public-faction-roster";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("resolveFactionRoster", () => {
  it("honours an explicit size within 3-6", () => {
    const resolved = resolveFactionRoster({ size: "5" }, seededRng(1));
    expect(resolved.size).toBe(5);
  });

  it("falls back to a pooled size when out of range", () => {
    const resolved = resolveFactionRoster({ size: "10" }, seededRng(1));
    expect(factionRosterConfig.sizes.map(Number)).toContain(resolved.size);
  });

  it("defaults theme to the first faction theme", () => {
    const resolved = resolveFactionRoster({}, seededRng(1));
    expect(resolved.theme).toBeTruthy();
  });
});

describe("generateFactionRosterLocal", () => {
  it("generates exactly `size` member sections, each with a connection to another member", () => {
    const out = generateFactionRosterLocal({ size: "4" }, seededRng(3));
    expect(out.type).toBe("note");
    const headings = out.content.match(/^### .+$/gm) ?? [];
    expect(headings).toHaveLength(4);
    // Every member section names a connection back into the roster.
    const connectionLines =
      out.content.match(/^- \*\*Connection\*\*:.+$/gm) ?? [];
    expect(connectionLines).toHaveLength(4);
    expect(out.labels).toContain("faction-roster");
    expect(out.labels).toContain("faction-roster-generator");
    expect(out.lore).toContain("### At a Glance");
  });

  it("reflects the handed-over faction in the local (no-AI) fallback, not generic filler", () => {
    // The public "Generate Roster" handoff always seeds a local draft on
    // mount before any AI call — matches generatePlotTwistLocal's precedent
    // of using a handed-over premise even offline (#2808 follow-up).
    const out = generateFactionRosterLocal(
      {
        size: "3",
        factionContext:
          "[Faction Context]\nFaction: The Compact\nA merchant guild that fixes prices across three ports.",
      },
      seededRng(4),
    );
    expect(out.title).toBe("The Compact's Notable Members");
    expect(out.summary).toContain("The Compact");
    expect(out.content).toContain("for The Compact");
    expect(out.lore).toContain("Loyalty to The Compact");
  });

  it("falls back to a proper noun when factionContext has no 'Faction:' line", () => {
    const out = generateFactionRosterLocal(
      { size: "3", factionContext: "Vess Marrow leads the operation." },
      seededRng(4),
    );
    expect(out.title).toBe("Vess Marrow's Notable Members");
  });

  it("falls back to generic phrasing when no factionContext is given", () => {
    const out = generateFactionRosterLocal({ size: "3" }, seededRng(4));
    expect(out.title).toBe("Notable Members");
    expect(out.summary).toContain("of the faction,");
  });

  it("never points a member's connection at itself", () => {
    const out = generateFactionRosterLocal({ size: "3" }, seededRng(21));
    const names = [...out.content.matchAll(/^### (.+?) — /gm)].map((m) => m[1]);
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sectionMatch = out.content.match(
        new RegExp(`### ${escaped} — [\\s\\S]*?(?=\\n### |$)`),
      );
      expect(sectionMatch?.[0]).not.toContain(`(${name})`);
    }
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateFactionRosterLocal({ size: "5" }, seededRng(9))).toEqual(
      generateFactionRosterLocal({ size: "5" }, seededRng(9)),
    );
  });
});

describe("buildFactionRosterPrompt", () => {
  it("embeds the faction context, ban prompt, and session context", () => {
    const { systemInstruction, userMessage } = buildFactionRosterPrompt(
      {
        factionContext:
          "Title: The Compact\nA merchant guild that fixes prices across three ports.",
        structure: "Council",
      },
      "- Existing: Alder Cass (character)",
      seededRng(2),
    );
    expect(userMessage).toContain("The Compact");
    expect(userMessage).toContain("[Source Faction");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: Alder Cass (character)");
    expect(userMessage).toContain("- Structure: Council");
  });

  it("names the consistency-pass constraints explicitly", () => {
    const { systemInstruction } = buildFactionRosterPrompt(
      {},
      "",
      seededRng(1),
    );
    expect(systemInstruction).toContain("consistency pass");
    expect(systemInstruction).toContain("connection.member");
    expect(systemInstruction).toContain(
      "no member's motive duplicates the faction's own goal",
    );
  });

  it("pins proper nouns already named in the faction context", () => {
    const { userMessage } = buildFactionRosterPrompt(
      { factionContext: "Vess Marrow leads the smuggling operation." },
      "",
      seededRng(5),
    );
    expect(userMessage).toContain("Vess Marrow");
  });

  it("excludes names already established by the handed-over context from the avoid-list", () => {
    const { systemInstruction } = buildFactionRosterPrompt(
      {
        factionContext: "Vess Marrow leads the operation.",
        avoidNames: ["Vess Marrow", "Some Other Name"],
      },
      "",
      seededRng(5),
    );
    expect(systemInstruction).toContain("Some Other Name");
    expect(systemInstruction).not.toContain("already-used names: Vess Marrow");
  });
});

describe("parseFactionRosterResponse", () => {
  const { resolved } = buildFactionRosterPrompt({}, "", seededRng(3));

  it("renders one deterministic section per member", () => {
    const json = JSON.stringify({
      title: "The Compact's Inner Circle",
      summary: "x",
      members: [
        {
          name: "Vess Marrow",
          role: "Quartermaster",
          duty: "Moves cargo",
          motive: "Wants out",
          stance: "Trapped",
          trait: "Counts coins twice",
          wantNow: "Needs an alibi",
          leverage: "Owes a debt",
          connection: { member: "Sister Aln", nature: "reports to" },
        },
        {
          name: "Sister Aln",
          role: "True believer",
          duty: "Recruits",
          motive: "Wants converts",
          stance: "Zealot",
          trait: "Never blinks",
          wantNow: "Needs a sign",
          leverage: "Feared exposure",
        },
      ],
      lore: "### At a Glance\n- **Structure**: Council",
      labels: ["faction-roster"],
    });
    const out = parseFactionRosterResponse(json, resolved);
    expect(out.title).toBe("The Compact's Inner Circle");
    expect(out.content).toContain("### Vess Marrow — Quartermaster");
    expect(out.content).toContain("### Sister Aln — True believer");
    expect(out.content).toContain("- **Connection**: reports to (Sister Aln)");
    expect(out.lore).toContain("### At a Glance");
  });

  it("clamps parsed members to the resolved roster size, not a fixed cap", () => {
    const { resolved: sizeThreeResolved } = buildFactionRosterPrompt(
      { size: "3" },
      "",
      seededRng(1),
    );
    const json = JSON.stringify({
      title: "Roster",
      members: Array.from({ length: 6 }, (_, i) => ({
        name: `Member ${i + 1}`,
        role: "Role",
      })),
    });
    const out = parseFactionRosterResponse(json, sizeThreeResolved);
    const headings = out.content.match(/^### .+$/gm) ?? [];
    expect(headings).toHaveLength(3);
  });

  it("drops a connection naming a member not present in the roster", () => {
    const json = JSON.stringify({
      title: "Roster",
      members: [
        {
          name: "Vess Marrow",
          role: "Quartermaster",
          connection: { member: "Nobody Real", nature: "reports to" },
        },
      ],
    });
    const out = parseFactionRosterResponse(json, resolved);
    expect(out.content).not.toContain("Connection");
  });

  it("drops a connection naming the member itself", () => {
    const json = JSON.stringify({
      title: "Roster",
      members: [
        {
          name: "Vess Marrow",
          role: "Quartermaster",
          connection: { member: "Vess Marrow", nature: "reports to" },
        },
      ],
    });
    const out = parseFactionRosterResponse(json, resolved);
    expect(out.content).not.toContain("Connection");
  });

  it("falls back to a generic title when none is given", () => {
    const out = parseFactionRosterResponse("{}", resolved);
    expect(out.title).toBe("Notable Members");
    expect(out.content).toBe("");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseFactionRosterResponse("nope", resolved)).toThrow();
  });
});
