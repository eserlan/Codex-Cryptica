import { describe, expect, it } from "vitest";
import {
  buildCouncilVotePrompt,
  councilVoteConfig,
  generateCouncilVoteLocal,
  parseCouncilVoteResponse,
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

describe("buildCouncilVotePrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildCouncilVotePrompt(
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
    expect(userMessage).toContain("at least two viable voting coalitions");
    expect(userMessage).toContain("costly best solution");
    expect(resolved.governingBodyType).toBe("Corporate Board");
    expect(resolved.councilSize).toBe(7);
    expect(resolved.genre).toBe("Cyberpunk");
  });

  it("asks the model to self-verify member count, coalitions, and internal consistency", () => {
    const { userMessage } = buildCouncilVotePrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain("run a consistency pass");
    expect(userMessage).toContain("mathematically achievable with 7 seats");
    expect(userMessage).toContain(
      "every councillor's stance is identical everywhere",
    );
    expect(userMessage).toContain("resolve both sides of the central dilemma");
    expect(userMessage).toContain("state that dependency explicitly");
  });

  it("treats initial stances as fixed and forbids spending effort on already-secured votes", () => {
    const { userMessage } = buildCouncilVotePrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      "Treat each councillor's initial stance as fixed source data",
    );
    expect(userMessage).toContain(
      "do not describe the party spending effort or resources on councillors whose vote is already secured",
    );
    expect(userMessage).toContain(
      "must improve on or replace the original proposal",
    );
  });

  it("requires each coalition path to obey the voting procedure and resolve each councillor's true motive", () => {
    const { userMessage } = buildCouncilVotePrompt(
      { councilSize: "7" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain(
      'every coalition path in "Possible Paths", including the costly best solution, obeys the stated "Voting Procedure"',
    );
    expect(userMessage).toContain(
      "must directly resolve, reward, or override that councillor's true agenda",
    );
  });

  it("defaults genre to Classic Fantasy when unset", () => {
    const { resolved } = buildCouncilVotePrompt({}, "", seededRng(1));
    expect(resolved.genre).toBe("Classic Fantasy");
  });

  it("picks a theme-appropriate governing body when none is specified", () => {
    const { resolved } = buildCouncilVotePrompt(
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

describe("parseCouncilVoteResponse", () => {
  const { resolved } = buildCouncilVotePrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"The Salt Road Levy","content":"### The Proposal\\ny","lore":"### Voting Procedure","labels":["council-vote"]}\n```';
    const out = parseCouncilVoteResponse(json, resolved);
    expect(out.title).toBe("The Salt Road Levy");
    expect(out.content).toContain("The Proposal");
  });

  it("falls back to the resolved title and throws on bad JSON", () => {
    const out = parseCouncilVoteResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.title);
    expect(() => parseCouncilVoteResponse("nope", resolved)).toThrow();
  });

  it("always includes the council-vote label, even if the model omits it", () => {
    const withoutLabel = parseCouncilVoteResponse(
      '{"title":"X","content":"c","lore":"l","labels":["political-intrigue"]}',
      resolved,
    );
    expect(withoutLabel.labels).toContain("council-vote");

    const missingLabelsField = parseCouncilVoteResponse(
      '{"title":"X","content":"c","lore":"l"}',
      resolved,
    );
    expect(missingLabelsField.labels).toContain("council-vote");
  });

  it("strips foreign labels the model may echo back, like quest-generator", () => {
    const out = parseCouncilVoteResponse(
      '{"title":"X","content":"c","lore":"l","labels":["quest-generator","council-vote"]}',
      resolved,
    );
    expect(out.labels).not.toContain("quest-generator");
    expect(out.labels).toContain("council-vote");
  });
});
