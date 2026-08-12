import { describe, it, expect } from "vitest";
import {
  getGenerator,
  getDefaultInstruction,
  isTitleBanned,
  isSupportedGenerator,
  listGenerators,
  resolveEntityType,
  GENERATOR_ENTITY_TYPE,
  SYSTEM_INSTRUCTION,
  councilVotePathsPrompt,
  councilVoteFoundationRepairPrompt,
  councilVotePathsRepairPrompt,
} from "./campaign-generator-registry";
import {
  type GeneratorRunRequest,
  type GeneratorVaultContext,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";

function run(
  generatorId: GeneratorRunRequest["generatorId"],
  overrides: Partial<GeneratorRunRequest> = {},
): GeneratorRunRequest {
  return {
    generatorId,
    options: {},
    useAI: false,
    themeId: "workspace",
    ...overrides,
  };
}

describe("registry lookup", () => {
  it("returns a definition for every supported id", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      expect(getGenerator(id).id).toBe(id);
    }
  });

  it("lists all generators in order", () => {
    expect(listGenerators().map((g) => g.id)).toEqual([
      "npc",
      "faction",
      "settlement",
      "magic-item",
      "event",
      "ship",
      "language",
      "news-sheet",
      "dungeon",
      "adventure",
      "plot-twist",
      "world",
      "council-vote",
      "secret-society",
      "star-system",
      "alien-race",
    ]);
  });

  it("maps the event generator to the event vault category", () => {
    expect(GENERATOR_ENTITY_TYPE.event).toBe("event");
    expect(getGenerator("event").entityType).toBe("event");
  });

  it("builds an event prompt and generates an event draft", () => {
    const prompt = getGenerator("event").buildPrompt(run("event"));
    expect(prompt).toContain("Generate a campaign event");
    const draft = getGenerator("event").generate(run("event"));
    expect(draft.title.length).toBeGreaterThan(0);
  });

  it("registers plot twists as note drafts with continuity guidance", () => {
    const generator = getGenerator("plot-twist");
    const prompt = generator.buildPrompt(
      run("plot-twist", {
        options: {
          premise: "The peace treaty is about to fail.",
          constraints: "Do not change the villain.",
        },
      }),
    );

    expect(generator.entityType).toBe("note");
    expect(prompt).toContain("The peace treaty is about to fail.");
    expect(prompt).toContain("Do not change the villain.");
    expect(prompt).toContain("without contradicting known facts");
    expect(prompt).toContain("do not invalidate witnessed events");
    expect(prompt).toContain("matching this schema");
    expect(prompt).toContain("Example (illustrative only");
    expect(prompt).toContain(
      'The complete six-section player-facing document belongs in the "content" field',
    );
    expect(generator.generate(run("plot-twist")).content).toContain(
      "## New Choices",
    );
  });

  it("builds a system-aware prompt and maps worlds to locations", () => {
    const prompt = getGenerator("world").buildPrompt(
      run("world", {
        options: {
          worldTagOne: "Trade Hub",
          worldTagTwo: "Refugees",
        },
      }),
    );
    expect(prompt).toContain("Star-system context");
    expect(prompt).toContain("Trade Hub and Refugees");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
    expect(prompt).toContain('leave "connections" as an empty array');
    expect(GENERATOR_ENTITY_TYPE.world).toBe("location");
    expect(getGenerator("world").generate(run("world")).lore).toContain(
      "## Adventure Hooks",
    );
  });

  it("builds a system-aware star-system prompt and maps systems to locations", () => {
    const prompt = getGenerator("star-system").buildPrompt(
      run("star-system", {
        options: {
          systemType: "Binary System",
          genre: "Cyberpunk",
        },
      }),
    );
    expect(prompt).toContain("Binary System");
    expect(prompt).toContain("Cyberpunk");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
    expect(GENERATOR_ENTITY_TYPE["star-system"]).toBe("location");
    const draft = getGenerator("star-system").generate(run("star-system"));
    expect(draft.lore).toContain("## Adventure Hooks");
    expect(draft.lore).toContain("## System-Wide Conflict or Mystery");
  });

  it("builds a context-aware alien-race prompt and maps species to creatures", () => {
    const prompt = getGenerator("alien-race").buildPrompt(
      run("alien-race", {
        options: {
          genre: "Cosmic Horror",
          bodyPlan: "Radially symmetric",
          homeEnvironment: "Ocean world",
        },
      }),
    );
    expect(prompt).toContain("Cosmic Horror");
    expect(prompt).toContain("Radially symmetric");
    expect(prompt).toContain("Ocean world");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
    // The generator's defining rule has to survive into the in-app prompt,
    // not just the public one.
    expect(prompt).toContain(
      "must have consequences elsewhere in the species design",
    );
    // A species is a creature, not an individual character.
    expect(GENERATOR_ENTITY_TYPE["alien-race"]).toBe("creature");
    const draft = getGenerator("alien-race").generate(run("alien-race"));
    expect(draft.content).toContain("## Biology & Lifecycle");
    expect(draft.lore).toContain("## Adventure Hooks");
  });

  it("folds the alien-race document into a single lore field when saving", () => {
    const generator = getGenerator("alien-race");
    const request = run("alien-race");
    const draft = generator.mapOutputToDraft(
      generator.generate(request),
      request,
    );
    expect(draft.entityType).toBe("creature");
    expect(draft.lore).toContain("## Overview");
    expect(draft.lore).toContain("## Weaknesses & Constraints");
  });

  it("throws a user-safe UnsupportedGeneratorError for unknown ids", () => {
    expect(() => getGenerator("dragon")).toThrow(UnsupportedGeneratorError);
    expect(() => getGenerator("dragon")).toThrow(/not available/);
  });

  it("provides a non-empty default instruction for every generator", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      expect(getDefaultInstruction(id).trim().length).toBeGreaterThan(0);
      expect(getDefaultInstruction(id)).toBe(
        getGenerator(id).defaultInstruction,
      );
    }
  });

  it("isSupportedGenerator narrows known ids", () => {
    expect(isSupportedGenerator("npc")).toBe(true);
    expect(isSupportedGenerator("dragon")).toBe(false);
  });
});

describe("secret-society generator", () => {
  it("maps to factions and provides a vault-grounded society prompt", () => {
    expect(GENERATOR_ENTITY_TYPE["secret-society"]).toBe("faction");
    const prompt = getGenerator("secret-society").buildPrompt(
      run("secret-society", { options: { publicFace: "Church" } }),
    );
    expect(prompt).toContain("public face: Church");
    expect(prompt).toContain("secret truth");
    expect(
      getGenerator("secret-society").generate(run("secret-society")).lore,
    ).toContain("Follow-Up Suggestions");
  });
});

describe("council-vote generator", () => {
  it("maps to the note vault category", () => {
    expect(GENERATOR_ENTITY_TYPE["council-vote"]).toBe("note");
    expect(getGenerator("council-vote").entityType).toBe("note");
  });

  it("builds a foundation prompt that names the requested council size, defers Possible Paths to step two, and covers the schema requirements", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote", { options: { councilSize: "7" } }),
    );
    expect(prompt).toContain("exactly 7 named council members");
    expect(prompt).toContain("initial voting stance");
    expect(prompt).toContain(
      'Do NOT write "Possible Paths" or "Follow-Up Hooks" yet',
    );
    expect(prompt).toContain(
      "This is step one of two — a second step will build the possible paths to victory afterward",
    );
    expect(prompt).toContain("fix the party's exact objective");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
  });

  it("requires the archetype to match the councillor's actual dependency and estimate arithmetic to check out", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote", { options: { councilSize: "7" } }),
    );
    expect(prompt).toContain(
      "do not describe a councillor who follows no one and has no dependency as a loyal follower type",
    );
    expect(prompt).toContain(
      "the vote estimate tally is arithmetically correct for 7 seats",
    );
    expect(prompt).toContain(
      "every dependency names a real councillor from this same roster in only one direction",
    );
  });

  it("requires the foundation's antagonist section to name any faction bribing, coercing, monitoring, or retaliating", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote", { options: { councilSize: "7" } }),
    );
    expect(prompt).toContain(
      "any faction actively bribing, coercing, monitoring, or retaliating against the party (only say there is no antagonist if none is described anywhere else in this content)",
    );
  });

  it("defaults to a 5-seat council when no size is given", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote"),
    );
    expect(prompt).toContain("exactly 5 named council members");
  });

  it("repair prompt asks to fix (not regenerate) amendment-shaped persuasion conditions and antagonist contradictions", () => {
    const prompt = councilVoteFoundationRepairPrompt();
    expect(prompt).toContain(
      "proofread and repair the scenario you just wrote above — do not write a new one, only fix what's broken",
    );
    expect(prompt).toContain(
      "no councillor's persuasion condition may itself function as an amendment, exemption, rider, sunset clause, or substitute proposal",
    );
    expect(prompt).toContain(
      'If such a faction exists and the antagonist section says "None" or doesn\'t name it, correct that section to name it',
    );
    expect(prompt).toContain(
      "If nothing needs fixing, return the scenario exactly as it was.",
    );
  });

  it("repair prompt verifies recusal-adjusted thresholds and ballot-type clarity, and bans claiming the objective resolves inherent harms", () => {
    const prompt = councilVoteFoundationRepairPrompt();
    expect(prompt).toContain(
      "verify the resulting threshold is stated and mathematically correct",
    );
    expect(prompt).toContain(
      "Explicitly define whether ballots are secret, public, or convert to a recorded division under a stated procedure — do not leave the ballot type ambiguous",
    );
    expect(prompt).toContain(
      "Ensure every persuasion condition that requires evidence has a corresponding investigation lead describing how to obtain it",
    );
    expect(prompt).toContain(
      "the objective must not claim the harm is resolved",
    );
  });

  it("repair prompt checks names fit the world's genre and asks for a consistent rename if not", () => {
    const prompt = councilVoteFoundationRepairPrompt();
    expect(prompt).toContain(
      "Every councillor's name must fit this world's established genre and setting",
    );
    expect(prompt).toContain(
      "do not use a name whose style clashes with it (e.g. a modern surname in a fantasy world, or a medieval-fantasy name in a sci-fi or cyberpunk world)",
    );
    expect(prompt).toContain(
      "rename that entity, keeping the change consistent everywhere the name appears",
    );
  });

  it("paths prompt states the seven rules covering stances, veto, ballot secrecy, amendments, dependencies, and the costly best solution", () => {
    const prompt = councilVotePathsPrompt();
    expect(prompt).toContain("Treat everything already established there");
    expect(prompt).toContain("Follow these rules when writing the paths:");
    expect(prompt).toContain(
      "1. Treat each councillor's initial stance, motive, and dependency exactly as established above",
    );
    expect(prompt).toContain(
      "Never describe the party spending effort on, or in any way endangering or risking, a councillor whose vote is already secured.",
    );
    expect(prompt).toContain(
      "No path may describe a veto-holder as simply outvoted",
    );
    expect(prompt).toContain(
      "persuasion, bribery, or coercion yields only an expected vote unless",
    );
    expect(prompt).toContain(
      "The costly best solution is the least harmful viable route that fully resolves the central dilemma",
    );
    expect(prompt).toContain(
      "Do not sacrifice an uninvolved party's interests, force unanimity, or endanger an already-secured vote",
    );
    expect(prompt).toContain(
      "Write every section as scene-appropriate prose. Do not restate the wording of these rules verbatim in the output",
    );
  });

  it("paths prompt requires stabilizing an existing majority and distinguishing required votes from insurance votes", () => {
    const prompt = councilVotePathsPrompt();
    expect(prompt).toContain(
      "If the current vote estimate already projects enough votes to clear the threshold, the smallest viable coalition must stabilize the fragile or leaning supporters already in place, or secure one backup vote against defection",
    );
    expect(prompt).toContain(
      'clearly distinguish the votes actually required to clear the threshold from any extra "insurance" vote pursued purely as a hedge against defection',
    );
  });

  it("paths prompt bans inventing/reversing dependencies, amendments even as a separate programme, and unestablished procedural mechanisms", () => {
    const prompt = councilVotePathsPrompt();
    expect(prompt).toContain(
      "never invent a dependency link between councillors that wasn't stated, never reverse the direction of one that was",
    );
    expect(prompt).toContain(
      "even one framed as a separate programme that functionally changes how the proposal applies",
    );
    expect(prompt).toContain(
      "no path may invent or use a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define",
    );
  });

  it("paths prompt requires the costly best solution to use established persuasion and a lasting cost", () => {
    const prompt = councilVotePathsPrompt();
    expect(prompt).toContain(
      "It must persuade each targeted councillor only through the exact condition already established for them (never a substitute condition or unrelated evidence)",
    );
    expect(prompt).toContain(
      "not a manufactured one and not merely time or resources spent investigating",
    );
    expect(prompt).toContain(
      "confirm the costly best solution persuades each targeted councillor only through their exact established condition and that its cost is a lasting consequence",
    );
  });

  it("paths prompt simulates the vote seat by seat and checks paths against the established foundation before returning", () => {
    const prompt = councilVotePathsPrompt();
    expect(prompt).toContain(
      "Before returning, simulate the vote from start to finish and check every path against the rules above",
    );
    expect(prompt).toContain(
      "list the final vote of every councillor per path, seat by seat, including councillors the path did not target",
    );
    expect(prompt).toContain("double-check the arithmetic");
    expect(prompt).toContain(
      "confirm every dependency used is one that was actually established above, in the direction it was defined, with an effect no larger than what it describes",
    );
    expect(prompt).toContain(
      'confirm "Possible Paths" is ordered smallest viable coalition, then broader/riskier alternative, then the costly best solution',
    );
    expect(prompt).toContain(
      'confirm "Antagonist Influence" is not contradicted by anything described in these new sections',
    );
    expect(prompt).toContain(
      "confirm the output contains no prompt instructions, placeholder-name notes, or generation commentary",
    );
  });

  it("paths-repair prompt asks to fix invented dependencies and unestablished mechanisms in the paths, not write new ones", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      'proofread and repair the "Possible Paths" and "Follow-Up Hooks" you just wrote above — do not write new paths, only fix what\'s broken',
    );
    expect(prompt).toContain(
      "If any path invented a dependency link that was never stated, or reversed one that was, remove or correct it",
    );
    expect(prompt).toContain(
      'including a hedge like "or abstains" presented as a live possibility',
    );
    expect(prompt).toContain(
      "If nothing needs fixing, return the paths exactly as they were.",
    );
  });

  it("paths-repair prompt recounts the true minimum vote count, deletes insurance/overshoot votes from the smallest coalition, and forbids unnecessary unanimity in the best solution", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "Recount exactly how many additional votes are needed beyond the current baseline to clear the threshold",
    );
    expect(prompt).toContain(
      "The smallest viable coalition must target exactly that many councillors — no more.",
    );
    expect(prompt).toContain(
      "an insurance/backup vote belongs only in the broader alternative, never the smallest coalition",
    );
    expect(prompt).toContain(
      "The costly best solution must pursue the least coercive coalition sufficient to fully resolve the dilemma",
    );
    expect(prompt).toContain(
      "it may not seek unanimity unless unanimity itself produces a concrete benefit unavailable from a simple majority",
    );
    expect(prompt).toContain(
      'It may not target more councillors than the recounted minimum from rule 5 without a stated reason specific to fully resolving the dilemma (not just "extra margin," which belongs in the broader alternative instead)',
    );
    expect(prompt).toContain(
      "the best solution must mitigate that harm through a separate, lawful action described in the path",
    );
  });

  it("paths-repair prompt bans manufacturing the best solution's cost by padding it with an action on an already-secured councillor", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "it specifically may not target a councillor whose vote is already secured just to manufacture the appearance of a cost",
    );
    expect(prompt).toContain(
      "If removing such padding would leave this path identical to another path in targets and outcome, delete the padding rather than keep it as filler, and see rule 8.",
    );
  });

  it("paths-repair prompt requires a path to use a councillor's own persuasion condition rather than defaulting to a looser dependency", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "If a councillor has their own specific persuasion condition stated in the scenario above, a path must use that condition directly to flip their vote rather than defaulting to a looser dependency-based trigger",
    );
    expect(prompt).toContain(
      "a dependency may substitute for a councillor's own condition only if the path explains why their own condition is unavailable or impractical in that path",
    );
  });

  it("paths-repair prompt requires the three paths to be materially different in targets or methodology", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "The three paths must be materially different from each other in their targeted councillors or their methodology.",
    );
    expect(prompt).toContain(
      "If the costly best solution (or any other path) targets the identical councillors through identical actions as another path, with only a cost paragraph appended, rewrite it with a genuinely distinct approach or targets",
    );
  });

  it("paths-repair prompt requires each path's tally summary to equal the literal sum of its own breakdown, including stale totals left over from another path", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "must exactly equal the literal sum of that same path's own seat-by-seat breakdown — recount the breakdown digit by digit",
    );
    expect(prompt).toContain(
      "even if the mismatch is just a stale total left over from a different path",
    );
  });

  it("paths-repair prompt bans counting an unconfirmed councillor toward the threshold", () => {
    const prompt = councilVotePathsRepairPrompt();
    expect(prompt).toContain(
      'no path may count an "Unknown" or otherwise unconfirmed councillor toward the required total, even if a dependency nudges their disposition',
    );
    expect(prompt).toContain(
      "a dependency altering someone's mood is not the same as securing their vote",
    );
  });

  it("generates a local fallback with one council member per requested seat", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", {
        options: {
          councilSize: "3",
          governingBodyType: "Senate",
          votingRule: "Unanimous",
        },
      }),
    );
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.lore).toContain("## Council Members");
    expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(3);
    expect(draft.lore).toContain("costly best solution");
    expect(draft.labels).toContain("Senate");
    expect(draft.labels).toContain("Unanimous");
  });

  it("reflects the requested scope and tone in the local fallback, not just AI prompts", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", {
        options: {
          scope: "Distributed Across Settlements/Regions",
          tone: "Farcical",
        },
      }),
    );
    expect(draft.lore).toContain("## Scope");
    expect(draft.lore).toContain("Distributed Across Settlements/Regions");
    expect(draft.summary).toContain("farcical");
    expect(draft.labels).toContain("Farcical");
  });

  it("only ever generates one of the supported council sizes, even for out-of-range input", () => {
    for (const size of ["2", "4", "10", "-1", "0"]) {
      const draft = getGenerator("council-vote").generate(
        run("council-vote", { options: { councilSize: size } }),
      );
      expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(5);
    }
  });

  it("falls back to a valid council size when given garbage input", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", { options: { councilSize: "not-a-number" } }),
    );
    expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(5);
  });
});

describe("draft mapping", () => {
  it("maps title, content, lore, and labels", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      {
        title: "Kaeldar",
        summary: "A human guard.",
        lore: "Kaeldar is a human guard.",
        labels: ["Human", "Guard"],
      },
      run("npc"),
    );
    expect(draft.title).toBe("Kaeldar");
    expect(draft.summary).toBe("A human guard.");
    expect(draft.lore).toContain("Kaeldar");
    expect(draft.labels).toEqual(["Human", "Guard"]);
    expect(draft.sourceGeneratorId).toBe("npc");
  });

  it("preserves labels as labels (never tags)", () => {
    const gen = getGenerator("faction");
    const draft = gen.mapOutputToDraft(
      { title: "X", summary: "s", lore: "l", labels: ["Guild"] },
      run("faction"),
    );
    expect(draft).not.toHaveProperty("tags");
    expect(draft.labels).toContain("Guild");
  });

  it("marks templateApplied when an outline is present and applyTemplate is true", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      { title: "X", summary: "s", lore: "l", labels: [] },
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: true,
          templateOutline: "## Overview\n## Secrets",
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(draft.templateApplied).toBe(true);
    expect(draft.templateOutline).toContain("## Overview");
  });

  it("preserves unmatched generated details instead of discarding them", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      {
        title: "X",
        summary: "s",
        lore: "l",
        labels: [],
        unmappedDetails: "extra",
      },
      run("npc"),
    );
    expect(draft.unmappedDetails).toBe("extra");
  });
});

describe("buildPrompt template injection", () => {
  const ctxWithTemplate = (applyTemplate: boolean) => ({
    categoryLabels: [],
    applyTemplate,
    templateOutline:
      "## Overview\nA short explanation of this section.\n\n## Secrets\nHidden details for the GM.",
    neighbors: [],
    worldSample: [],
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("includes the template outline in the prompt when applyTemplate is true", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, { vaultContext: ctxWithTemplate(true) }),
      );
      expect(prompt).toContain(
        'Structure the "lore" field using the template guidance below',
      );
      expect(prompt).toContain("<template_guidance>\n## Overview");
      expect(prompt).toContain("A short explanation of this section.");
      expect(prompt).toContain(
        "Do not reproduce explanatory text, placeholders, questions, examples, or XML tags from <template_guidance> in the generated lore.",
      );
    }
  });

  it("omits the template block when applyTemplate is false", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(false) }),
    );
    expect(prompt).not.toContain("## Overview");
  });

  it("omits the template block when no outline is supplied", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: true,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(prompt).not.toContain("follow this template");
  });

  it("defers the generic lore checklist to the template when one is present", () => {
    const withTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(true) }),
    );
    // generic checklist suppressed, template-fill guidance used instead
    expect(withTpl).not.toContain('The "lore" field should include:');
    expect(withTpl).toContain("Fill every section of the template above");

    const withoutTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(false) }),
    );
    expect(withoutTpl).toContain('The "lore" field should include:');
  });

  it("omits the stock exemplar's conflicting lore headings once a template is applied", () => {
    const withTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(true) }),
    );
    // The stock NPC exemplar's own headings ("## Who She Is", "## Secret",
    // "## Hook") must not appear once a template supplies a different set —
    // showing both would give the model two competing heading sets.
    expect(withTpl).not.toContain("## Who She Is");
    expect(withTpl).not.toContain("Ottavia Brenn");

    const withoutTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(false) }),
    );
    expect(withoutTpl).toContain("Ottavia Brenn");
  });
});

describe("buildPrompt quality + schema", () => {
  it("includes a connections field in the output schema", () => {
    const prompt = getGenerator("npc").buildPrompt(run("npc"));
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("EXACT title");
  });

  it("includes a few-shot exemplar for every generator", () => {
    for (const id of [
      "npc",
      "faction",
      "settlement",
      "magic-item",
      "event",
    ] as const) {
      const prompt = getGenerator(id).buildPrompt(run(id));
      expect(prompt).toContain("Example (illustrative only");
    }
  });

  it("carries the system instruction quality rubric", () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/show through action/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/avoid clich/i);
  });

  it("asks the model to ground in the world when context is present", () => {
    const grounded = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "w1",
              title: "Aranyvér",
              type: "faction",
              contentExcerpt: "x",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(grounded).toContain("weave in at least one entity");

    const empty = getGenerator("npc").buildPrompt(run("npc"));
    expect(empty).toContain('leave "connections" as an empty array');
  });

  it("surfaces Preferences (explicit dropdown selections) right after the instructions, ahead of the generic world context", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        instructions: "helper utility unit",
        options: { race: "Robot", role: "Utility unit" },
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "w1",
              title: "Aranyvér",
              type: "faction",
              contentExcerpt: "x",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    const preferencesIndex = prompt.indexOf("Preferences:");
    const worldGroundingIndex = prompt.indexOf(
      "Existing entities in this world",
    );
    expect(preferencesIndex).toBeGreaterThan(-1);
    expect(worldGroundingIndex).toBeGreaterThan(-1);
    expect(preferencesIndex).toBeLessThan(worldGroundingIndex);
  });
});

describe("buildPrompt cultural naming", () => {
  it("instructs the model to match the world's naming conventions", () => {
    const prompt = getGenerator("npc").buildPrompt(run("npc"));
    expect(prompt).toContain("naming conventions");
    expect(prompt).toContain("do not default to generic");
  });

  it("points to the example entities when world context is present", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "w1",
              title: "Aranyvér",
              type: "character",
              contentExcerpt: "x",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(prompt).toContain(
      "Infer the naming style from the example entities",
    );
  });

  it("uses only an explicitly selected legacy language", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
          selectedLanguage: {
            id: "l1",
            title: "Elvish",
            type: "note",
            contentExcerpt: "Glossary: stars = elen",
            legacy: true,
          },
        },
      }),
    );
    expect(prompt).toContain("Primary Language — Elvish:");
    expect(prompt).toContain("Legacy readable notes");
    expect(prompt).toContain("Elvish");
    expect(prompt).toContain("explicitly selected Primary Language");
  });

  it("renders populated structured language guidance without placeholders", () => {
    const prompt = getGenerator("settlement").buildPrompt(
      run("settlement", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: ["languages"],
          selectedLanguage: {
            id: "l1",
            title: "Lemari",
            type: "note",
            contentExcerpt: "",
            legacy: false,
            languageProfileVersion: 1,
            languageProfile: {
              inputs: {
                genre: "Fantasy",
                tone: "Lyrical",
                role: "Common Speech",
                structure: "Suffix-heavy",
              },
              phonology: {
                consonants: ["l", "m"],
                vowels: ["a", "e"],
                phonotactics: ["CV"],
              },
              naming: {
                placeNamePatterns: ["River root + -a"],
                examples: [
                  { name: "Lema", meaning: "river town", use: "place" },
                ],
              },
              lexicon: [
                { word: "lem", pronunciation: "LEHM", meaning: "river" },
              ],
              grammar: {
                examples: [
                  {
                    text: "Lem na",
                    pronunciation: "LEHM nah",
                    translation: "By the river",
                  },
                ],
              },
              register: { role: "Common Speech" },
              tableUseTips: ["Use open vowels."],
            },
          },
        },
      }),
    );

    expect(prompt).toContain("Place-name patterns: River root + -a");
    expect(prompt).toContain("lem = river");
    expect(prompt).not.toContain("Not specified");
    expect(prompt).toContain("must visibly follow the supplied rules");
  });

  it("injects no authoritative language guidance when none is selected", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );

    expect(prompt).not.toContain("Primary Language");
  });
});

describe("buildPrompt campaign date", () => {
  const baseCtx = (): GeneratorVaultContext => ({
    categoryLabels: [],
    applyTemplate: false,
    neighbors: [],
    worldSample: [],
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("includes the current campaign date when provided", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: { ...baseCtx(), themeName: "X", currentDate: "1247 AE" },
      }),
    );
    expect(prompt).toContain("Current campaign date: 1247 AE");
  });

  it("omits the date line when no campaign date is set", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: baseCtx() }),
    );
    expect(prompt).not.toContain("Current campaign date");
  });
});

describe("buildPrompt source entity", () => {
  it("includes both the content and lore of the source entity for every generator", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, {
          vaultContext: {
            categoryLabels: [],
            applyTemplate: false,
            neighbors: [],
            worldSample: [],
            existingTitles: [],
            labelSuggestions: [],
            includedContext: [],
            sourceEntity: {
              id: "s1",
              title: "Lord Aric",
              type: "character",
              contentExcerpt: "A grim border lord.",
              loreExcerpt:
                "Secretly bankrupt and beholden to a smuggling ring.",
            },
          },
        }),
      );
      expect(prompt).toContain("A grim border lord.");
      expect(prompt).toContain(
        "Lore: Secretly bankrupt and beholden to a smuggling ring.",
      );
    }
  });

  it("requires a mandatory connection and lore mention of the source entity, and resolves unnamed relational terms to it", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        instructions: "helper utility unit that is slaved to its master",
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
          sourceEntity: {
            id: "s1",
            title: "Unit Seven (Archivist)",
            type: "character",
            contentExcerpt: "A deteriorating synthetic consciousness.",
          },
        },
      }),
    );
    expect(prompt).toContain(
      'mention "Unit Seven (Archivist)" by its exact name at least once in "lore"',
    );
    expect(prompt).toContain('"targetTitle": "Unit Seven (Archivist)"');
    expect(prompt).toContain("clearly distinct from");
    expect(prompt).toContain(
      'that relationship is with the Source Entity below, "Unit Seven (Archivist)"',
    );
  });

  it("clarifies the banned-name list only restricts the new entity's title, not references to existing entities", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: ["Unit Seven (Archivist)"],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(prompt).toContain('applies only to the "title"');
    expect(prompt).toContain("may still be referenced normally elsewhere");
  });

  it("adapts biological lore categories for a synthetic/robot character", () => {
    const withRobot = getGenerator("npc").buildPrompt(
      run("npc", { options: { race: "Robot" } }),
    );
    expect(withRobot).toContain("synthetic/mechanical being");
    expect(withRobot).toContain("chassis or frame model");

    const withHuman = getGenerator("npc").buildPrompt(
      run("npc", { options: { race: "Human" } }),
    );
    expect(withHuman).not.toContain("synthetic/mechanical being");
  });
});

describe("buildPrompt world grounding", () => {
  const ctxWithWorld = (worldSample: GeneratorVaultContext["worldSample"]) => ({
    categoryLabels: [],
    applyTemplate: false,
    neighbors: [],
    worldSample,
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("injects existing world entities as positive grounding", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, {
          vaultContext: ctxWithWorld([
            {
              id: "e1",
              title: "Ironhold Keep",
              type: "location",
              contentExcerpt: "A mountain fortress.",
            },
          ]),
        }),
      );
      expect(prompt).toContain("Existing entities in this world");
      expect(prompt).toContain("Ironhold Keep");
      expect(prompt).toContain("A mountain fortress.");
    }
  });

  it("omits the world block when no sample is present", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithWorld([]) }),
    );
    expect(prompt).not.toContain("Existing entities in this world");
  });
});

describe("isTitleBanned", () => {
  const banned = ["Vane", "Archmage Elara Voss", "Dávid Farkas"];

  it("catches hyphenated/compound derivatives of a banned token", () => {
    expect(isTitleBanned("Vane-Smithe", banned)).toBe(true);
    expect(isTitleBanned("Lord Vane", banned)).toBe(true);
    expect(isTitleBanned("Vane", banned)).toBe(true);
  });

  it("does not flag substrings inside a larger word", () => {
    expect(isTitleBanned("Vanessa", banned)).toBe(false);
    expect(isTitleBanned("Vanguard", banned)).toBe(false);
  });

  it("matches multi-word and accented banned names", () => {
    expect(isTitleBanned("Archmage Elara Voss", banned)).toBe(true);
    expect(isTitleBanned("Dávid Farkas the Bold", banned)).toBe(true);
  });

  it("is case-insensitive and returns false for clean names", () => {
    expect(isTitleBanned("VANE-smithe", banned)).toBe(true);
    expect(isTitleBanned("Aric Thornfield", banned)).toBe(false);
  });
});

describe("generator id -> vault category mapping (FR-041)", () => {
  it("maps each generator to its distinct vault category", () => {
    expect(GENERATOR_ENTITY_TYPE).toEqual({
      npc: "character",
      faction: "faction",
      settlement: "location",
      "magic-item": "item",
      event: "event",
      ship: "location",
      language: "note",
      "news-sheet": "note",
      dungeon: "location",
      adventure: "note",
      "plot-twist": "note",
      world: "location",
      "council-vote": "note",
      "secret-society": "faction",
      "star-system": "location",
      "alien-race": "creature",
    });
  });

  it("draft entityType uses the mapped vault category, not the generator id", () => {
    expect(
      getGenerator("npc").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("npc"),
      ).entityType,
    ).toBe("character");
    expect(
      getGenerator("settlement").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("settlement"),
      ).entityType,
    ).toBe("location");
    expect(
      getGenerator("magic-item").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("magic-item"),
      ).entityType,
    ).toBe("item");
  });

  it("falls back to note when the mapped category is absent", () => {
    expect(resolveEntityType("npc", ["note", "place"])).toBe("note");
  });

  it("falls back to the first available category when note is absent", () => {
    expect(resolveEntityType("npc", ["place", "thing"])).toBe("place");
  });

  it("uses the mapped category when present in the campaign", () => {
    expect(resolveEntityType("settlement", ["character", "location"])).toBe(
      "location",
    );
  });
});
