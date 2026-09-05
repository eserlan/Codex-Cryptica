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
    const out = generateHeistLocal({ heistType: "Theft" }, seededRng(5));
    expect(out.type).toBe("event");
    expect(out.content).toContain("### The Score");
    // The objective section is named for the heist type, not always "The Prize".
    expect(out.content).toContain(
      `### ${heistConfig.objectives.Theft.heading}`,
    );
    expect(out.content).toContain("### Casing the Target");
    expect(out.lore).toContain("### GM Quick Reference");
    expect(out.lore).toContain("### The Hidden Factor");
    expect(out.lore).toContain("### Security Rings");
    expect(out.lore).toContain("### Alarm Track");
    expect(out.lore).toContain("### Complications");
    expect(out.lore).toContain("### When the Prize Is Taken");
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

  it("marks exactly one complication as the default", () => {
    const out = generateHeistLocal({}, seededRng(12));
    expect(out.lore.match(/\(default\)/g)?.length).toBe(1);
  });

  it("gives the point of no return its own section that feeds the getaway", () => {
    const out = generateHeistLocal({}, seededRng(12));
    const section = out.lore
      .split("### When the Prize Is Taken")[1]
      .split("### ")[0];
    // The trigger fires, escalates the alarm, and closes the way in — and the
    // getaway opens from that same closure rather than an unrelated reason.
    expect(section).toContain("**2 — Alert**");
    expect(section).toContain("the crew's way in closes behind them");
    expect(heistConfig.routeClosures.some((c) => section.includes(c))).toBe(
      true,
    );
    expect(out.lore).toContain(
      "The service route from the casing is gone for exactly that reason",
    );
  });

  it("summarises the whole heist in a seven-line GM quick reference", () => {
    const out = generateHeistLocal({}, seededRng(15));
    const section = out.lore
      .split("### GM Quick Reference")[1]
      .split("### ")[0];
    for (const line of [
      "**Objective**",
      "**Primary obstacle**",
      "**Hidden factor**",
      "**Point of no return**",
      "**Pressure**",
      "**Default complication**",
      "**Escape problem**",
    ]) {
      expect(section, `missing quick-reference line ${line}`).toContain(line);
    }
    expect(section.match(/^- /gm)?.length).toBe(7);
  });

  it("states the pressure with a trigger that can fire inside one infiltration", () => {
    const out = generateHeistLocal({}, seededRng(3));
    const pressure = Object.values(heistConfig.pressureByComplication).find(
      (p) => out.content.includes(p),
    );
    expect(pressure).toBeDefined();
    // No wall-clock rates that would never come up during a single job.
    expect(out.content).not.toMatch(/once per hour|per day|each week/i);
  });

  it("leaves a costly option open at the top of the alarm track", () => {
    const out = generateHeistLocal({}, seededRng(5));
    const lethal = out.lore.split("**4 — Lethal Response**")[1].split("\n")[0];
    expect(lethal).toMatch(/drawn off|bargained with|given something/);
  });

  it("offers four to six flashback prompts rather than a long list", () => {
    const out = generateHeistLocal({}, seededRng(7));
    const section = out.lore.split("### Flashback Opportunities")[1];
    const count = section.match(/^- /gm)?.length ?? 0;
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(6);
  });

  it("gives the objective a practical catch drawn from the config", () => {
    const out = generateHeistLocal({ heistType: "Theft" }, seededRng(3));
    const label = heistConfig.catchesByKind.object
      .map((c) => c.split(" — ")[0])
      .find((c) => out.content.includes(`**The catch**: ${c}`));
    expect(label).toBeDefined();
  });

  it("draws the catch from the pool that suits the objective, not a shared one", () => {
    // "Cursed — carrying it costs the bearer" is nonsense for an assassination
    // target, and "it does not want to leave" is nonsense for a machine.
    for (const [heistType, kind] of Object.entries(
      heistConfig.catchKindByType,
    )) {
      const valid = heistConfig.catchesByKind[kind].map(
        (c) => c.split(" — ")[0],
      );
      for (let seed = 1; seed <= 12; seed += 1) {
        const out = generateHeistLocal({ heistType }, seededRng(seed));
        const used = out.content
          .split("**The catch**: ")[1]
          .split(" — ")[0]
          .trim();
        expect(
          valid,
          `${heistType} drew a ${kind}-incompatible catch: ${used}`,
        ).toContain(used);
      }
    }
  });

  it("gives every catch a matching pressure line", () => {
    const everyCatch = Object.values(heistConfig.catchesByKind).flat();
    for (const entry of everyCatch) {
      const label = entry.split(" — ")[0];
      expect(
        heistConfig.pressureByComplication[label],
        `no pressure defined for catch "${label}"`,
      ).toBeTruthy();
    }
  });

  it("offers alternate routes that differ in kind, plus a pursuit", () => {
    const out = generateHeistLocal({}, seededRng(8));
    const section = out.lore.split("### The Getaway")[1].split("### ")[0];
    expect(section).toContain("**Fast but exposed**");
    expect(section).toContain("**Covert but slow**");
    expect(section).toContain("**Hard route**");
    expect(section).toContain("**Pursuit**:");
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

  it("keeps campaign context inside The Score rather than inventing a section", () => {
    const out = generateHeistLocal(
      {
        heistType: "Assassination",
        campaignContext: "a crew burned by their last fixer",
      },
      seededRng(2),
    );
    // The AI schema declares content holds exactly Score/Prize/Casing.
    expect(out.content).not.toContain("### Campaign Fit");
    expect(out.content.match(/^### .+$/gm)).toEqual([
      "### The Score",
      "### The Target",
      "### Casing the Target",
    ]);
    expect(out.content.split("### The Target")[0]).toContain(
      "a crew burned by their last fixer",
    );
  });

  it("never turns a custom option into a label that could hijack another generator's layout rule", () => {
    const out = generateHeistLocal(
      {
        genre: "quest-generator",
        heistType: "encounter-generator",
        targetType: "npc-generator",
      },
      seededRng(4),
    );
    expect(out.labels).toEqual(["heist", "heist-generator"]);
    // The custom values still flavour the prose — they just aren't labels.
    expect(out.content).toContain("encounter-generator at");
  });

  it("names the objective section for the selected heist type", () => {
    const cases: Array<[string, string]> = [
      ["Theft", "### The Prize"],
      ["Assassination", "### The Target"],
      ["Rescue", "### The Captive"],
      ["Extraction", "### The Subject"],
      ["Sabotage", "### The System"],
      ["Information", "### The Record"],
      ["Plant Evidence", "### The Package"],
    ];
    for (const [heistType, heading] of cases) {
      const out = generateHeistLocal({ heistType }, seededRng(3));
      expect(out.content, `${heistType} should use ${heading}`).toContain(
        heading,
      );
    }
  });

  it("falls back to a generic objective section for a custom heist type", () => {
    const out = generateHeistLocal({ heistType: "Blackmail" }, seededRng(3));
    expect(out.content).toContain("### The Objective");
  });

  it("gives the objective actionable where/window/protection detail", () => {
    const out = generateHeistLocal(
      { heistType: "Assassination" },
      seededRng(3),
    );
    const section = out.content.split("### The Target")[1].split("### ")[0];
    for (const field of [
      "**Where**",
      "**Window**",
      "**Protection**",
      "**Once it is done**",
    ]) {
      expect(section, `objective missing ${field}`).toContain(field);
    }
  });

  it("does not let lockdown pre-empt the route the point of no return closes", () => {
    const out = generateHeistLocal({}, seededRng(5));
    const lockdown = out.lore.split("**3 — Lockdown**")[1].split("\n")[0];
    // Lockdown bars the public doors; the service route is closed later, by
    // the prize being lifted — the two must not claim the same closure.
    expect(lockdown).toContain("the service route is a staff route and stays");
    expect(out.lore).toContain("the crew's way in closes behind them");
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
      'the route lost in "The Getaway" is the one "When the Prize Is Taken" closes, and is the one the crew entered by',
    );
    expect(userMessage).toContain(
      "nothing offered as a solution may be something an earlier rule declared impossible",
    );
    expect(userMessage).toContain(
      "each security ring names at least two genuinely different approaches",
    );
    expect(userMessage).toContain("level 4 still leaves a costly option");
  });

  it("demands system-neutral effects when no system is selected", () => {
    const { userMessage, resolved } = buildHeistPrompt({}, "", seededRng(1));
    expect(resolved.system).toBe("System-neutral");
    expect(userMessage).toContain("keep every effect system-neutral");
    expect(userMessage).toContain(
      "Do not use rounds, turns, saving throws, DCs, checks, advantage/disadvantage, hit points, damage numbers",
    );
  });

  it("allows system mechanics once a supported system is selected", () => {
    const { userMessage, resolved } = buildHeistPrompt(
      { system: "D&D 5e" },
      "",
      seededRng(1),
    );
    expect(resolved.system).toBe("D&D 5e");
    expect(userMessage).toContain("The table is playing D&D 5e");
    expect(userMessage).not.toContain("keep every effect system-neutral");
  });

  it("allows only short in-scene pressure intervals, not wall-clock cadence", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("a short in-scene interval of minutes");
    expect(userMessage).toContain(
      "Never a long wall-clock cadence such as once an hour, once a day, or once a week",
    );
  });

  it("ignores an unrecognised system rather than passing it through", () => {
    const { resolved } = buildHeistPrompt(
      { system: "Made Up Game" },
      "",
      seededRng(1),
    );
    expect(resolved.system).toBe("System-neutral");
  });

  it("names the pressure and its trigger in the options block", () => {
    const { userMessage, resolved } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      `- Pressure (what that complication costs during play, and when it bites): ${resolved.pressure}`,
    );
    expect(Object.values(heistConfig.pressureByComplication)).toContain(
      resolved.pressure,
    );
  });

  it("demands the heist type materially shape the scenario", () => {
    const { userMessage } = buildHeistPrompt(
      { heistType: "Assassination" },
      "",
      seededRng(1),
    );
    expect(userMessage).toContain("### The Target");
    expect(userMessage).toContain(
      "a concrete window in which they are alone or unguarded",
    );
    expect(userMessage).toContain(
      "The selected heist type must materially shape the scenario",
    );
    expect(userMessage).toContain(
      'If "The Score" names a second objective as well',
    );
    expect(userMessage).toContain("Objective coverage:");
  });

  it("forbids repeated and empty sections outright", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      "Every heading above appears exactly ONCE in the whole result",
    );
    expect(userMessage).toContain(
      '"content" and "lore" must share no heading between them',
    );
    expect(userMessage).toContain(
      "never emit a heading with nothing written under it",
    );
  });

  it("requires pressure to advance on its own, not only on failure", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      'The "Pressure" must advance on its own during the job, not only when the crew fails',
    );
  });

  it("keeps the point of no return distinct from the alarm track", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      'if the alarm track already closes a route at some level, "When the Prize Is Taken" must not simply close it again',
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

  it("does not echo a custom genre or heist type into the labels", () => {
    const { resolved } = buildHeistPrompt(
      { genre: "quest-generator", heistType: "puzzle-generator" },
      "",
      seededRng(1),
    );
    const out = parseHeistResponse(
      '{"title":"T","content":"c","lore":"l","labels":["heist"]}',
      resolved,
    );
    expect(out.labels).not.toContain("quest-generator");
    expect(out.labels).not.toContain("puzzle-generator");
    expect(out.labels).toContain("heist");
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
