import { describe, expect, it } from "vitest";
import {
  buildCouncilVoteFoundationPrompt,
  buildCouncilVoteFoundationRepairPrompt,
  buildCouncilVotePathsPrompt,
  buildCouncilVotePathsRepairPrompt,
  councilVoteConfig,
  generateCouncilVoteLocal,
  mergeCouncilVoteOutput,
  parseCouncilVoteFoundation,
  parseCouncilVotePathsResponse,
} from "./public-council-vote";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateCouncilVoteLocal", () => {
  it("returns the event council-vote structure with one member per seat", () => {
    const out = generateCouncilVoteLocal({ councilSize: "3" }, seededRng(5));
    expect(out.type).toBe("event");
    expect(out.content).toContain("### The Proposal");
    expect(out.content).toContain("### The Deadline");
    expect(out.lore).toContain("### Council Members");
    expect(out.lore.match(/^- \*\*/gm)?.length).toBe(3);
    expect(out.lore).toContain("costly best solution");
    expect(out.labels).toContain("council-vote");
  });

  it("includes the genre as a label", () => {
    const out = generateCouncilVoteLocal(
      { genre: "Cyberpunk / Corporate" },
      seededRng(5),
    );
    expect(out.labels).toContain("Cyberpunk / Corporate");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateCouncilVoteLocal(
      {
        proposal: "recognise the exiled claimant",
        governingBodyType: "Senate",
        councilSize: "5",
        votingRule: "Unanimous",
        deadline: "before the eclipse",
        campaignContext: "a fractured senate rebuilding after a coup",
      },
      seededRng(2),
    );
    expect(out.content).toContain("recognise the exiled claimant");
    expect(out.content).toContain("a fractured senate rebuilding after a coup");
    expect(out.content).toContain("before the eclipse");
    expect(out.title).toBe("The Vote of the Senate");
    expect(out.lore).toContain("Unanimous, 5 seats");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateCouncilVoteLocal({}, seededRng(9))).toEqual(
      generateCouncilVoteLocal({}, seededRng(9)),
    );
  });

  it("only ever resolves to one of the supported council sizes", () => {
    for (const size of ["2", "4", "10", "not-a-number"]) {
      const out = generateCouncilVoteLocal({ councilSize: size }, seededRng(3));
      expect(out.lore.match(/^- \*\*/gm)?.length).toBe(5);
    }
  });
});

describe("buildCouncilVoteFoundationPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildCouncilVoteFoundationPrompt(
      {
        genre: "Cyberpunk",
        proposal: "fund the harbour militia",
        governingBodyType: "Corporate Board",
        councilSize: "7",
        campaignContext: "a corp war over the docks",
      },
      "- Existing: The Neon Compact (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre: Cyberpunk");
    expect(userMessage).toContain("- Proposal: fund the harbour militia");
    expect(userMessage).toContain("- Governing Body: Corporate Board");
    expect(userMessage).toContain("Exactly 7 named council members");
    expect(userMessage).toContain("a corp war over the docks");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Neon Compact");
    expect(resolved.governingBodyType).toBe("Corporate Board");
    expect(resolved.councilSize).toBe(7);
    expect(resolved.genre).toBe("Cyberpunk");
  });

  it("asks only for the foundation sections and defers Possible Paths to a second step", () => {
    const { userMessage } = buildCouncilVoteFoundationPrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      'Do NOT write "Possible Paths" or "Follow-Up Hooks" yet',
    );
    expect(userMessage).toContain(
      "EXACTLY these sections, in this order, and no others: '### Voting Procedure'",
    );
    expect(userMessage).toContain("'### Investigation Leads'.");
    expect(userMessage).not.toContain("Possible Paths' markdown");
  });

  it("requires the archetype label to match the councillor's actual dependency", () => {
    const { userMessage } = buildCouncilVoteFoundationPrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      "the archetype label must be consistent with the councillor's actual described behavior — do not label a councillor who follows no one and has no dependency as a 'Loyal Shadow' or similar follower archetype",
    );
  });

  it("requires the antagonist section to name any faction bribing, coercing, monitoring, or retaliating", () => {
    const { userMessage } = buildCouncilVoteFoundationPrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      "name any faction actively bribing, coercing, monitoring, or retaliating against the party — say 'None' only if no such faction appears anywhere else in this content",
    );
  });

  it("fixes the objective as immutable and forbids leaked prompt/meta-commentary", () => {
    const { userMessage } = buildCouncilVoteFoundationPrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain("fix the party's exact objective");
    expect(userMessage).toContain(
      "step two must never contradict it or introduce an amendment if it requires the proposal to pass unchanged",
    );
    expect(userMessage).toContain(
      "never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated",
    );
  });

  it("checks stance consistency and estimate arithmetic before returning", () => {
    const { userMessage } = buildCouncilVoteFoundationPrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      'every councillor\'s stance is identical everywhere it appears (their own bullet and "Current Vote Estimate")',
    );
    expect(userMessage).toContain(
      'the tally in "Current Vote Estimate" is arithmetically correct for 7 seats',
    );
    expect(userMessage).toContain(
      "every dependency names a real councillor from this same roster and is stated in only one direction",
    );
  });

  it("defaults genre to Classic Fantasy when unset", () => {
    const { resolved } = buildCouncilVoteFoundationPrompt({}, "", seededRng(1));
    expect(resolved.genre).toBe("Classic Fantasy");
  });

  it("picks a theme-appropriate governing body when none is specified", () => {
    const { resolved } = buildCouncilVoteFoundationPrompt(
      { genre: "Cyberpunk / Corporate" },
      "",
      seededRng(6),
    );
    expect(
      councilVoteConfig.bodyTypesByTheme["Cyberpunk / Corporate"],
    ).toContain(resolved.governingBodyType);
  });

  it("exposes the shared config lists", () => {
    expect(councilVoteConfig.sizes).toEqual(["3", "5", "7", "9"]);
    expect(councilVoteConfig.bodyTypes).toContain("Criminal Syndicate");
    expect(councilVoteConfig.votingRules).toContain("Secret Ballot");
  });
});

describe("buildCouncilVoteFoundationRepairPrompt", () => {
  it("asks to fix, not regenerate, amendment-shaped persuasion conditions and antagonist contradictions", () => {
    const prompt = buildCouncilVoteFoundationRepairPrompt();
    expect(prompt).toContain(
      "proofread and repair the scenario you just wrote above — do not write a new one, only fix what's broken",
    );
    expect(prompt).toContain(
      "no councillor's persuasion condition may itself function as an amendment, exemption, rider, sunset clause, or substitute proposal",
    );
    expect(prompt).toContain(
      'If such a faction exists and "Antagonist Influence" says "None" or doesn\'t name it, correct that section to name it',
    );
    expect(prompt).toContain(
      "If nothing needs fixing, return the scenario exactly as it was.",
    );
  });

  it("verifies recusal-adjusted thresholds and ballot-type clarity, and bans claiming the objective resolves inherent harms", () => {
    const prompt = buildCouncilVoteFoundationRepairPrompt();
    expect(prompt).toContain(
      "verify the resulting threshold is stated and mathematically correct",
    );
    expect(prompt).toContain(
      "Explicitly define whether ballots are secret, public, or convert to a recorded division under a stated procedure — do not leave the ballot type ambiguous",
    );
    expect(prompt).toContain(
      'Ensure every persuasion condition that requires evidence has a corresponding entry in "### Investigation Leads"',
    );
    expect(prompt).toContain(
      "the objective must not claim the harm is resolved",
    );
  });
});

describe("buildCouncilVotePathsRepairPrompt", () => {
  it("asks to fix invented dependencies and unestablished mechanisms in the paths, not write new ones", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
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

  it("recounts the true minimum vote count, deletes insurance/overshoot votes from the smallest coalition, and forbids unnecessary unanimity in the best solution", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
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

  it("bans manufacturing the best solution's cost by padding it with an action on an already-secured councillor", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "it specifically may not target a councillor whose vote is already secured just to manufacture the appearance of a cost",
    );
    expect(prompt).toContain(
      "If removing such padding would leave this path identical to another path in targets and outcome, delete the padding rather than keep it as filler, and see rule 8.",
    );
  });

  it("requires a path to use a councillor's own persuasion condition rather than defaulting to a looser dependency", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "If a councillor has their own specific persuasion condition stated in the scenario above, a path must use that condition directly to flip their vote rather than defaulting to a looser dependency-based trigger",
    );
    expect(prompt).toContain(
      "a dependency may substitute for a councillor's own condition only if the path explains why their own condition is unavailable or impractical in that path",
    );
  });

  it("requires the three paths to be materially different in targets or methodology", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "The three paths must be materially different from each other in their targeted councillors or their methodology.",
    );
    expect(prompt).toContain(
      "If the costly best solution (or any other path) targets the identical councillors through identical actions as another path, with only a cost paragraph appended, rewrite it with a genuinely distinct approach or targets",
    );
  });

  it("requires each path's tally summary to equal the literal sum of its own breakdown, including stale totals left over from another path", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
    expect(prompt).toContain(
      "must exactly equal the literal sum of that same path's own seat-by-seat breakdown — recount the breakdown digit by digit",
    );
    expect(prompt).toContain(
      "even if the mismatch is just a stale total left over from a different path",
    );
  });

  it("bans counting an unconfirmed councillor toward the threshold", () => {
    const prompt = buildCouncilVotePathsRepairPrompt();
    expect(prompt).toContain(
      'no path may count an "Unknown" or otherwise unconfirmed councillor toward the required total, even if a dependency nudges their disposition',
    );
    expect(prompt).toContain(
      "a dependency altering someone's mood is not the same as securing their vote",
    );
  });
});

describe("parseCouncilVoteFoundation", () => {
  const { resolved } = buildCouncilVoteFoundationPrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"The Salt Road Levy","content":"### The Proposal\\ny","lore":"### Voting Procedure","labels":["council-vote"]}\n```';
    const out = parseCouncilVoteFoundation(json, resolved);
    expect(out.title).toBe("The Salt Road Levy");
    expect(out.content).toContain("The Proposal");
  });

  it("falls back to the resolved title and throws on bad JSON", () => {
    const out = parseCouncilVoteFoundation(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.title);
    expect(() => parseCouncilVoteFoundation("nope", resolved)).toThrow();
  });

  it("always includes the council-vote label, even if the model omits it", () => {
    const withoutLabel = parseCouncilVoteFoundation(
      '{"title":"X","content":"c","lore":"l","labels":["political-intrigue"]}',
      resolved,
    );
    expect(withoutLabel.labels).toContain("council-vote");

    const missingLabelsField = parseCouncilVoteFoundation(
      '{"title":"X","content":"c","lore":"l"}',
      resolved,
    );
    expect(missingLabelsField.labels).toContain("council-vote");
  });

  it("strips foreign labels the model may echo back, like quest-generator", () => {
    const out = parseCouncilVoteFoundation(
      '{"title":"X","content":"c","lore":"l","labels":["quest-generator","council-vote"]}',
      resolved,
    );
    expect(out.labels).not.toContain("quest-generator");
    expect(out.labels).toContain("council-vote");
  });

  it("appends the resolved genre as a label even though the model doesn't know to", () => {
    const out = parseCouncilVoteFoundation(
      '{"title":"X","content":"c","lore":"l","labels":["council-vote"]}',
      resolved,
    );
    expect(out.labels).toContain(resolved.genre);
  });

  it("corrects a contradictory 'Antagonist Influence: None' when a non-None level was requested", () => {
    const { resolved: dominant } = buildCouncilVoteFoundationPrompt(
      { antagonistInfluence: "Dominant" },
      "",
      seededRng(3),
    );
    const lore =
      "### Voting Procedure\nSimple majority.\n### Antagonist Influence\nNone.\n### Investigation Leads\nAsk around.";
    const out = parseCouncilVoteFoundation(
      JSON.stringify({ title: "X", content: "c", lore }),
      dominant,
    );
    expect(out.lore).toContain(
      "### Antagonist Influence\nAntagonist influence over the council is dominant.",
    );
    expect(out.lore).not.toContain("### Antagonist Influence\nNone");
    expect(out.lore).toContain("Ask around");
  });

  it("leaves a genuine 'None' antagonist section untouched when None was actually requested", () => {
    const { resolved: none } = buildCouncilVoteFoundationPrompt(
      { antagonistInfluence: "None" },
      "",
      seededRng(3),
    );
    const lore = "### Antagonist Influence\nNone.";
    const out = parseCouncilVoteFoundation(
      JSON.stringify({ title: "X", content: "c", lore }),
      none,
    );
    expect(out.lore).toBe(lore);
  });

  it("leaves a substantive antagonist section untouched even if it starts with 'No'", () => {
    const { resolved: dominant } = buildCouncilVoteFoundationPrompt(
      { antagonistInfluence: "Dominant" },
      "",
      seededRng(3),
    );
    const lore =
      "### Antagonist Influence\nNo single hand controls the vote, but the Ironmere Syndicate bribes two councillors and monitors the rest through hired informants.";
    const out = parseCouncilVoteFoundation(
      JSON.stringify({ title: "X", content: "c", lore }),
      dominant,
    );
    expect(out.lore).toBe(lore);
  });
});

describe("buildCouncilVotePathsPrompt", () => {
  it("treats the foundation pass's output as fixed and asks only for paths and hooks", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain("Treat everything already established there");
    expect(userMessage).toContain(
      "Do not invent a new roster, restate the scenario, or write anything else.",
    );
    expect(userMessage).toContain('"possiblePaths":');
    expect(userMessage).toContain('"followUpHooks":');
    expect(userMessage).toContain(NAME_BAN_PROMPT);
  });

  it("states the seven rules covering stances, veto, ballot secrecy, amendments, dependencies, and the costly best solution", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain("Follow these rules when writing the paths:");
    expect(userMessage).toContain(
      "1. Treat each councillor's initial stance, motive, and dependency exactly as established above",
    );
    expect(userMessage).toContain(
      "Never describe the party spending effort on, or in any way endangering or risking, a councillor whose vote is already secured.",
    );
    expect(userMessage).toContain(
      "No path may describe a veto-holder as simply outvoted",
    );
    expect(userMessage).toContain(
      "persuasion, bribery, or coercion yields only an expected vote unless",
    );
    expect(userMessage).toContain(
      "The costly best solution is the least harmful viable route that fully resolves the central dilemma",
    );
    expect(userMessage).toContain(
      "Do not sacrifice an uninvolved party's interests, force unanimity, or endanger an already-secured vote",
    );
    expect(userMessage).toContain(
      "Write every section as scene-appropriate prose. Do not restate the wording of these rules verbatim in the output",
    );
  });

  it("requires stabilizing an existing majority and distinguishing required votes from insurance votes", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain(
      "If the current vote estimate already projects enough votes to clear the threshold, the smallest viable coalition must stabilize the fragile or leaning supporters already in place, or secure one backup vote against defection",
    );
    expect(userMessage).toContain(
      'clearly distinguish the votes actually required to clear the threshold from any extra "insurance" vote pursued purely as a hedge against defection — never present an insurance vote as required',
    );
  });

  it("bans inventing or reversing dependencies and exceeding what a dependency describes", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain(
      "Only use dependencies exactly as established above — never invent a dependency link between councillors that wasn't stated, never reverse the direction of one that was, and never let its effect exceed exactly what it describes",
    );
  });

  it("bans amendments even when framed as a separate programme, and inventing procedural mechanisms", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain(
      "even one framed as a separate programme that functionally changes how the proposal applies",
    );
    expect(userMessage).toContain(
      "no path may invent or use a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define",
    );
  });

  it("bans describing a projected vote as locked in", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain(
      'never describe a projected vote as "locked in."',
    );
  });

  it("simulates the vote seat by seat and checks the paths against the established foundation before returning", () => {
    const { userMessage } = buildCouncilVotePathsPrompt();
    expect(userMessage).toContain(
      "Before returning, simulate the vote from start to finish and check every path against the rules above",
    );
    expect(userMessage).toContain(
      "list the final vote of every councillor per path, seat by seat, including councillors the path did not target",
    );
    expect(userMessage).toContain(
      "confirm every dependency used is one that was actually established above, in the direction it was defined, with an effect no larger than what it describes",
    );
    expect(userMessage).toContain(
      "confirm the smallest viable coalition targets only councillors whose support is actually needed to clear the threshold, and that any extra vote is clearly marked as insurance, not required",
    );
    expect(userMessage).toContain(
      "confirm no path — including the costly best solution — alters the proposal itself if the objective requires it to pass unchanged",
    );
    expect(userMessage).toContain(
      'confirm "Antagonist Influence" is not contradicted by anything described in these new sections',
    );
    expect(userMessage).toContain(
      "confirm the output contains no prompt instructions, placeholder-name notes, or generation commentary",
    );
  });
});

describe("parseCouncilVotePathsResponse", () => {
  it("parses fenced JSON for both sections", () => {
    const json =
      '```json\n{"possiblePaths":"### Possible Paths\\nx","followUpHooks":"### Follow-Up Hooks\\ny"}\n```';
    const out = parseCouncilVotePathsResponse(json);
    expect(out.possiblePaths).toContain("### Possible Paths");
    expect(out.followUpHooks).toContain("### Follow-Up Hooks");
  });

  it("defaults missing fields to empty strings and throws on bad JSON", () => {
    const out = parseCouncilVotePathsResponse('{"possiblePaths":"p"}');
    expect(out.possiblePaths).toBe("p");
    expect(out.followUpHooks).toBe("");
    expect(() => parseCouncilVotePathsResponse("nope")).toThrow();
  });
});

describe("mergeCouncilVoteOutput", () => {
  it("joins the foundation lore with the paths and hooks in order", () => {
    const out = mergeCouncilVoteOutput(
      {
        title: "The Vote",
        content: "content body",
        lore: "### Voting Procedure\nx",
        labels: ["council-vote", "political-intrigue"],
      },
      {
        possiblePaths: "### Possible Paths\ny",
        followUpHooks: "### Follow-Up Hooks\nz",
      },
    );
    expect(out.type).toBe("event");
    expect(out.title).toBe("The Vote");
    expect(out.content).toBe("content body");
    expect(out.lore).toBe(
      "### Voting Procedure\nx\n\n### Possible Paths\ny\n\n### Follow-Up Hooks\nz",
    );
    expect(out.labels).toEqual(["council-vote", "political-intrigue"]);
    expect(out.status).toBe("active");
  });

  it("omits an empty paths or hooks section rather than leaving a blank line", () => {
    const out = mergeCouncilVoteOutput(
      {
        title: "The Vote",
        content: "content body",
        lore: "### Voting Procedure\nx",
        labels: ["council-vote"],
      },
      { possiblePaths: "### Possible Paths\ny", followUpHooks: "" },
    );
    expect(out.lore).toBe("### Voting Procedure\nx\n\n### Possible Paths\ny");
  });
});
