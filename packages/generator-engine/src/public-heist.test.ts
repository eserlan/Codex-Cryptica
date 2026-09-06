import { describe, expect, it } from "vitest";
import {
  buildHeistPrompt,
  buildHeistRepairPrompt,
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
    expect(out.lore).toContain(
      `### ${heistConfig.objectives.Theft.momentHeading}`,
    );
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
    const out = generateHeistLocal({ heistType: "Theft" }, seededRng(12));
    const section = out.lore
      .split(`### ${heistConfig.objectives.Theft.momentHeading}`)[1]
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

  it("gives every pressure line something that advances during normal play", () => {
    // The prompt requires pressure to advance on its own, not only when the
    // crew fails — a config entry that only bites on a mistake contradicts it.
    for (const [label, pressure] of Object.entries(
      heistConfig.pressureByComplication,
    )) {
      expect(
        /\b(advance|every|each)\b/i.test(pressure),
        `pressure for "${label}" names no advancing trigger: ${pressure}`,
      ).toBe(true);
    }
  });

  it("summarises pressure in the quick reference instead of copying it", () => {
    // Verbatim duplication here was the single most common redundancy across a
    // 240-generation sweep — it hit every single output.
    for (const heistType of Object.keys(heistConfig.objectives)) {
      const out = generateHeistLocal({ heistType }, seededRng(9));
      const full = out.content.split("- **Pressure**: ")[1].split("\n")[0];
      const summary = out.lore.split("- **Pressure**: ")[1].split("\n")[0];
      expect(summary).not.toBe(full);
      expect(summary.length).toBeLessThan(full.length);
    }
  });

  it("gives every catch a quick-reference summary as well as a full line", () => {
    for (const entry of Object.values(heistConfig.catchesByKind).flat()) {
      const label = entry.split(" — ")[0];
      expect(
        heistConfig.pressureSummaryByComplication[label],
        `no pressure summary for catch "${label}"`,
      ).toBeTruthy();
    }
  });

  it("never gives a record or a carried package a catch about freeing it", () => {
    // A record need not leave the building and a planted package arrives with
    // the crew, so "fixed in place and must be freed" contradicts both.
    for (const heistType of ["Information", "Plant Evidence"]) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const out = generateHeistLocal({ heistType }, seededRng(seed));
        const line = out.content.split("**The catch**: ")[1].split("\n")[0];
        expect(line, `${heistType} drew a removal catch: ${line}`).not.toMatch(
          /freed|fixed in place|cannot be carried by one person/i,
        );
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

  it("names the point of no return for the deed, not always the prize", () => {
    const expected: Array<[string, string]> = [
      ["Theft", "### When the Prize Is Taken"],
      ["Plant Evidence", "### When the Evidence Is Planted"],
      ["Assassination", "### When the Target Is Killed"],
      ["Rescue", "### When the Captive Is Freed"],
      ["Extraction", "### When the Subject Walks"],
      ["Sabotage", "### When the Sabotage Is Committed"],
      ["Information", "### When the Record Is Read"],
    ];
    for (const [heistType, heading] of expected) {
      const out = generateHeistLocal({ heistType }, seededRng(4));
      expect(out.lore, `${heistType} should use ${heading}`).toContain(heading);
      // A plant job has no "prize taken" moment at all.
      if (heistType !== "Theft") {
        expect(out.lore).not.toContain("### When the Prize Is Taken");
      }
    }
  });

  it("does not write a retrieval step for a job the crew starts holding", () => {
    const out = generateHeistLocal(
      { heistType: "Plant Evidence" },
      seededRng(4),
    );
    const objective = out.content.split("### The Package")[1].split("### ")[0];
    // The package is not already inside the target — getting it in is the job.
    expect(objective).toContain("The crew already has it");
    expect(objective).toContain("has to end up in the innermost secured space");
    // The rings guard the destination, not the package.
    expect(out.lore).toContain(
      "the destination the package must reach, not the package itself",
    );
  });

  it("keeps the completing action from skipping most of the alarm track", () => {
    for (const heistType of Object.keys(heistConfig.objectives)) {
      const out = generateHeistLocal({ heistType }, seededRng(6));
      const moment = out.lore
        .split(`### ${heistConfig.objectives[heistType].momentHeading}`)[1]
        .split("### ")[0];
      expect(moment, `${heistType} skipped the alarm track`).toContain(
        "**2 — Alert**",
      );
      expect(moment).not.toContain("Lethal Response");
      expect(moment).not.toContain("Lockdown");
    }
  });

  it("keeps the shared pools free of theft-only assumptions", () => {
    // These pools are reused by every heist type, so nothing in them may
    // assume the objective is an object being removed — a plant job has
    // nothing go missing, and a sabotage has nothing to carry out.
    const removalWording = /\bthe prize\b|absence|taken away|carried out/i;
    for (const pool of [
      heistConfig.triggers,
      heistConfig.complications,
      heistConfig.routeClosures,
      heistConfig.pursuits,
      heistConfig.flashbackSeeds,
    ]) {
      for (const entry of pool) {
        expect(
          removalWording.test(entry),
          `shared pool entry assumes a theft: ${entry}`,
        ).toBe(false);
      }
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
    // Pinned to Theft: the route check now names the type's own moment heading.
    const { userMessage } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    expect(userMessage).toContain("run a consistency pass");
    expect(userMessage).toContain(
      'exactly one complication is marked "(default)"',
    );
    expect(userMessage).toContain(
      'the route lost in "The Getaway" is the one "When the Prize Is Taken" closes, and is the one the crew entered by',
    );
    expect(userMessage).toContain("Ownership and location:");
    expect(userMessage).toContain("Alarm reachability:");
    expect(userMessage).toContain(
      "nothing offered as a solution may be something an earlier rule declared impossible",
    );
    expect(userMessage).toContain(
      "each security ring names at least two genuinely different approaches",
    );
    expect(userMessage).toContain("level 4 still leaves a costly option");
  });

  it("always demands system-neutral effects — this generator has no system option", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("Keep every effect system-neutral");
    expect(userMessage).toContain(
      "Do not use rounds, turns, saving throws, DCs, checks, advantage/disadvantage, hit points, damage numbers",
    );
    expect(userMessage).toContain("a GM converts it to their system of choice");
  });

  it("allows only short in-scene pressure intervals, not wall-clock cadence", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("a short in-scene interval of minutes");
    expect(userMessage).toContain(
      "Never a long wall-clock cadence such as once an hour, once a day, or once a week",
    );
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

  it("states the type's starting position, protection and completing action", () => {
    const { userMessage } = buildHeistPrompt(
      { heistType: "Plant Evidence" },
      "",
      seededRng(1),
    );
    expect(userMessage).toContain(
      "- Starting position: The crew already has the package when the job begins.",
    );
    expect(userMessage).toContain(
      "- What the security protects: the destination the package must reach, not the package itself",
    );
    expect(userMessage).toContain(
      "- The action that completes the job: leaving the package where it will be found and believed",
    );
    expect(userMessage).toContain("### When the Evidence Is Planted");
    expect(userMessage).toContain(
      "Do NOT merely rename theft concepts for the other heist types",
    );
    expect(userMessage).toContain(
      "if the crew already carries the objective then it is NOT inside the target, there is no retrieval step to write",
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

  it("separates reaching the objective from accomplishing it", () => {
    const { userMessage } = buildHeistPrompt(
      { heistType: "Assassination" },
      "",
      seededRng(1),
    );
    expect(userMessage).toContain(
      "Getting to the objective and accomplishing it are two different problems",
    );
    expect(userMessage).toContain(
      "two or three genuinely different opportunities or methods for the kill itself",
    );
  });

  it("requires special vulnerabilities to be explained and clocks to be runnable", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("say in one clause WHY it works");
    expect(userMessage).toContain(
      "name what advances it and how many advances fill it",
    );
  });

  it("asks the repair pass for objective approaches and coherent effects", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Assassination", genre: "Classic Fantasy" },
      "",
      seededRng(1),
    );
    const prompt = buildHeistRepairPrompt([], resolved);
    expect(prompt).toContain("Ways in are not ways to do the job");
    expect(prompt).toContain("reads as an arbitrary game mechanic");
    expect(prompt).toContain(
      "If something alters an appearance, a reflection or a reading rather than the thing itself",
    );
    expect(prompt).toContain("how many advances fill it");
    expect(prompt).toContain("leftover scaffolding");
    expect(prompt).toContain(
      "A Classic Fantasy scenario should not carry job titles",
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

describe("buildHeistRepairPrompt", () => {
  it("passes the deterministic findings through verbatim", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Sabotage" },
      "",
      seededRng(1),
    );
    const prompt = buildHeistRepairPrompt(
      [{ message: "Alarm level 3 is missing." }, { message: "Two defaults." }],
      resolved,
    );
    expect(prompt).toContain("1. Alarm level 3 is missing.");
    expect(prompt).toContain("2. Two defaults.");
  });

  it("forbids reinventing the scenario", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const prompt = buildHeistRepairPrompt([], resolved);
    expect(prompt).toContain("Do NOT write a new one");
    expect(prompt).toContain(
      "Reinventing the scenario is a failure, not a fix",
    );
    expect(prompt).toContain(
      "if a section is already correct, return it word for word",
    );
  });

  it("still runs the semantic checklist when nothing was auto-detected", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const prompt = buildHeistRepairPrompt([], resolved);
    expect(prompt).toContain("Automated checks found no structural problems");
    expect(prompt).toContain("Named people behave in line with the motives");
  });

  it("restates the type's own terminology and starting state", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Plant Evidence" },
      "",
      seededRng(1),
    );
    const prompt = buildHeistRepairPrompt([], resolved);
    expect(prompt).toContain('"The Package"');
    expect(prompt).toContain('"When the Evidence Is Planted"');
    expect(prompt).toContain("already has the package");
    expect(prompt).toContain(
      "no step spent obtaining something the crew already has",
    );
  });

  it("asks for the whole corrected object, not a list of criticisms", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    const prompt = buildHeistRepairPrompt([], resolved);
    expect(prompt).toContain("Return the complete corrected heist");
    expect(prompt).toContain("with every field present");
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

  it("deduplicates sections at parse time so no repair call is needed", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const out = parseHeistResponse(
      JSON.stringify({
        title: "T",
        content: "### The Score\nSteal it.\n\n### The Prize\nA diadem.",
        lore:
          "### Security Rings\n- **Perimeter**: first\n\n" +
          "### Security Rings\n- **Perimeter**: second\n\n" +
          "### The Prize\n\n### The Getaway\nGone.",
      }),
      resolved,
      seededRng(2),
    );
    expect(out.lore.match(/### Security Rings/g)).toHaveLength(1);
    expect(out.lore).toContain("first");
    expect(out.lore).not.toContain("second");
    // A lore section may not restate a heading content already used, and a
    // heading with nothing under it is dropped rather than rendered empty.
    expect(out.lore).not.toContain("### The Prize");
    expect(out.content).toContain("A diadem.");
  });

  it("does not backfill a section the model filed under content", () => {
    // Cross-field dedupe drops the lore copy; backfilling from lore alone
    // would then re-add it and manufacture a duplicate across the document.
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const out = parseHeistResponse(
      JSON.stringify({
        title: "T",
        content: "### The Score\nGo.\n\n### Alarm Track\n- **0 — Quiet**: calm",
        lore: "### The Getaway\nGone.",
      }),
      resolved,
      seededRng(2),
    );
    const whole = `${out.content}\n${out.lore}`;
    expect(whole.match(/### Alarm Track/g)).toHaveLength(1);
    // Flashbacks were genuinely absent, so those are still restored.
    expect(out.lore).toContain("### Flashback Opportunities");
  });

  it("keeps text that appears before the first heading", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const out = parseHeistResponse(
      JSON.stringify({
        title: "T",
        content: "A line first.\n\n### The Score\nGo.",
        lore: "",
      }),
      resolved,
      seededRng(2),
    );
    expect(out.content).toContain("A line first.");
    expect(out.content).toContain("### The Score");
  });

  it("backfills a required section the model skipped", () => {
    // Observed in a real sample: one generation in ten ended cleanly after
    // "The Getaway" and never wrote "Flashback Opportunities".
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const lore =
      "### GM Quick Reference\n- **Objective**: x\n\n### The Getaway\nGone.";
    const out = parseHeistResponse(
      JSON.stringify({ title: "T", content: "### The Score\nGo.", lore }),
      resolved,
      seededRng(2),
    );
    expect(out.lore).toContain("### Flashback Opportunities");
    expect(out.lore).toContain("### Alarm Track");
    expect(out.lore).toContain("**0 — Quiet**");
    // What the model did write is untouched.
    expect(out.lore).toContain("### The Getaway");
    expect(out.lore).toContain("Gone.");
  });

  it("leaves sections alone when the model wrote them all", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const lore =
      "### Alarm Track\n- **0 — Quiet**: calm\n\n### Flashback Opportunities\n- a bribed guard";
    const out = parseHeistResponse(
      JSON.stringify({ title: "T", content: "c", lore }),
      resolved,
      seededRng(2),
    );
    expect(out.lore).toBe(lore);
  });

  it("does not invent sections it cannot rebuild coherently", () => {
    // A Security Rings block naming a different building would be worse than
    // its absence, so only the generic pools are backfilled.
    const { resolved } = buildHeistPrompt(
      { heistType: "Theft" },
      "",
      seededRng(1),
    );
    const out = parseHeistResponse(
      JSON.stringify({
        title: "T",
        content: "c",
        lore: "### The Getaway\nGone.",
      }),
      resolved,
      seededRng(2),
    );
    expect(out.lore).not.toContain("### Security Rings");
    expect(out.lore).not.toContain("### The Hidden Factor");
  });

  it("states a concrete overall word budget", () => {
    const { userMessage } = buildHeistPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("must come in under 900 words");
  });

  it("throws on unusable JSON so the engine can fall back locally", () => {
    const { resolved } = buildHeistPrompt({}, "", seededRng(1));
    expect(() => parseHeistResponse("not json at all", resolved)).toThrow();
  });
});
