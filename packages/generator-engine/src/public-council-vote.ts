/**
 * Public Council Vote generator — framework-free, for the marketing/SEO
 * generator surface (no login, no vault context).
 *
 * Generates a political vote quest: the party must secure enough votes on a
 * council before an urgent decision is made, instead of persuading a single
 * ruler. Distinct from the in-app "council-vote" entry in
 * campaign-generator-registry.ts, which is vault-context-aware — this file
 * mirrors the public-quest.ts / public-npc.ts split already used for every
 * other simple generator (a lighter, session-only public variant alongside
 * a richer, vault-grounded in-app variant).
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

export const councilVoteConfig = {
  bodyTypes: [
    "Town Council",
    "Noble Court",
    "Senate",
    "Clan Moot",
    "War Council",
    "Corporate Board",
    "Revolutionary Committee",
    "Interstellar Assembly",
    "Criminal Syndicate",
    "Religious Conclave",
  ],
  // Which governing bodies feel native to each world theme/genre — mirrors
  // public-quest.ts's per-genre location/threat pools. Falls back to the
  // full bodyTypes list above for any theme not listed here.
  bodyTypesByTheme: {
    "Classic Fantasy": [
      "Town Council",
      "Noble Court",
      "Senate",
      "Religious Conclave",
    ],
    Pirate: ["Clan Moot", "Criminal Syndicate", "War Council", "Noble Court"],
    "Cyberpunk / Corporate": [
      "Corporate Board",
      "Revolutionary Committee",
      "Criminal Syndicate",
      "Senate",
    ],
    "Vampire / Gothic Noir": [
      "Noble Court",
      "Religious Conclave",
      "Criminal Syndicate",
      "Clan Moot",
    ],
    "Cosmic Horror": [
      "Religious Conclave",
      "Senate",
      "Town Council",
      "Noble Court",
    ],
    "Sci-Fi / Space Opera": [
      "Interstellar Assembly",
      "Senate",
      "Corporate Board",
      "War Council",
    ],
    "Modern Conspiracy": [
      "Senate",
      "Corporate Board",
      "Revolutionary Committee",
      "Criminal Syndicate",
    ],
    "Post-Apocalyptic": [
      "War Council",
      "Clan Moot",
      "Criminal Syndicate",
      "Town Council",
    ],
    "Western / Frontier": [
      "Town Council",
      "War Council",
      "Criminal Syndicate",
      "Noble Court",
    ],
    Steampunk: [
      "Corporate Board",
      "Senate",
      "Noble Court",
      "Revolutionary Committee",
    ],
    Lancer: [
      "Interstellar Assembly",
      "War Council",
      "Corporate Board",
      "Senate",
    ],
    "Space Opera Resistance": [
      "Revolutionary Committee",
      "War Council",
      "Interstellar Assembly",
      "Clan Moot",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Interstellar Assembly",
      "Senate",
      "Corporate Board",
      "Town Council",
    ],
  } as Record<string, string[]>,
  sizes: ["3", "5", "7", "9"],
  votingRules: [
    "Simple Majority",
    "Supermajority (Two-Thirds)",
    "Unanimous",
    "Veto Power",
    "Secret Ballot",
  ],
  scopes: ["Single Location", "Distributed Across Settlements/Regions"],
  tones: ["Political", "Tense", "Desperate", "Farcical", "Somber", "Hopeful"],
  antagonistInfluences: ["None", "Subtle", "Entrenched", "Dominant"],
  archetypes: [
    "Beleaguered Ally",
    "Villain's Toady",
    "Greedy Broker",
    "Loyal Shadow",
    "Traditionalist",
    "Idealist",
    "Wildcard",
  ],
  stances: ["Support", "Oppose", "Leaning", "Unknown"],
};

export interface CouncilVoteGeneratorOptions {
  genre?: string;
  proposal?: string;
  governingBodyType?: string;
  councilSize?: string;
  votingRule?: string;
  deadline?: string;
  scope?: string;
  tone?: string;
  antagonistInfluence?: string;
  campaignContext?: string;
}

interface CouncilVoteMember {
  name: string;
  archetype: string;
  stance: string;
}

interface ResolvedCouncilVote {
  genre: string;
  proposal: string;
  governingBodyType: string;
  councilSize: number;
  votingRule: string;
  deadline: string;
  scope: string;
  tone: string;
  antagonistInfluence: string;
  campaignContext?: string;
  title: string;
  members: CouncilVoteMember[];
}

function resolveCouncilVote(
  options: CouncilVoteGeneratorOptions,
  rng: Rng,
): ResolvedCouncilVote {
  const genre = options.genre?.trim() || "Classic Fantasy";
  const governingBodyType =
    options.governingBodyType ||
    pickFrom(
      councilVoteConfig.bodyTypesByTheme[genre] ?? councilVoteConfig.bodyTypes,
      rng,
    );
  const councilSize = councilVoteConfig.sizes.includes(
    options.councilSize ?? "",
  )
    ? Number(options.councilSize)
    : 5;
  const votingRule =
    options.votingRule || pickFrom(councilVoteConfig.votingRules, rng);
  const deadline = options.deadline?.trim() || "before the week is out";
  const proposal =
    options.proposal?.trim() ||
    "a contested proposal that will reshape the region";
  const scope = options.scope || pickFrom(councilVoteConfig.scopes, rng);
  const tone = options.tone || pickFrom(councilVoteConfig.tones, rng);
  const antagonistInfluence =
    options.antagonistInfluence ||
    pickFrom(councilVoteConfig.antagonistInfluences, rng);
  const campaignContext = options.campaignContext?.trim() || undefined;

  const members: CouncilVoteMember[] = Array.from(
    { length: councilSize },
    () => ({
      name: generateName(rng),
      archetype: pickFrom(councilVoteConfig.archetypes, rng),
      stance: pickFrom(councilVoteConfig.stances, rng),
    }),
  );

  return {
    genre,
    proposal,
    governingBodyType,
    councilSize,
    votingRule,
    deadline,
    scope,
    tone,
    antagonistInfluence,
    campaignContext,
    title: `The Vote of the ${governingBodyType}`,
    members,
  };
}

export interface CouncilVotePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedCouncilVote;
}

export function buildCouncilVotePrompt(
  options: CouncilVoteGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): CouncilVotePrompt {
  const resolved = resolveCouncilVote(options, rng);

  const userMessage = `Generate a Council Vote political RPG quest in JSON format: the party must secure enough votes on a council before an urgent decision is made, instead of persuading a single ruler.
Options:
- Genre: ${resolved.genre}
- Proposal: ${resolved.proposal}
- Governing Body: ${resolved.governingBodyType}
- Council Size: ${resolved.councilSize} seats
- Voting Rule: ${resolved.votingRule}
- Deadline: ${resolved.deadline}
- Scope: ${resolved.scope}
- Tone: ${resolved.tone}
- Antagonist Influence: ${resolved.antagonistInfluence}
${resolved.campaignContext ? `- Campaign Context: ${resolved.campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this vote (3-6 words)",
  "content": "A player-facing multi-paragraph hook (markdown formatted) describing the proposal, the deadline, and why the party has been drawn into the vote.",
  "lore": "GM-only details (markdown formatted) with these sections: '### Voting Procedure' (the threshold and any exploitable procedural rules), '### Current Vote Estimate', '### Council Members' (one bullet per member, each named '**Name** (Archetype)', giving their public position, true agenda, initial stance, what would genuinely persuade them, and a secret or piece of leverage), '### Antagonist Influence', '### Investigation Leads', '### Possible Paths' (at least two viable voting coalitions), '### Follow-Up Hooks'.",
  "labels": ["council-vote", "political-intrigue"]
}
Exactly ${resolved.councilSize} named council members are required. Use these names and starting archetypes as inspiration — invent a full personality, agenda, and secret for each rather than just restating the archetype: ${resolved.members.map((m) => `${m.name} (${m.archetype}, initial stance: ${m.stance})`).join(", ")}.
This is a political puzzle, not a sequence of mandatory fetch quests: give most voters multiple viable approaches with different costs, ensure at least one easy solution creates a future complication, and never let a single action guarantee a majority.
Set the vote firmly within the ${resolved.genre} genre — the governing body, council members, and stakes should feel native to that setting.
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseCouncilVoteResponse(
  text: string,
  resolved: ResolvedCouncilVote,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const labels = Array.isArray(data.labels)
    ? data.labels
    : ["council-vote", "political-intrigue"];
  return {
    type: "event",
    title: data.title || resolved.title,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    // "council-vote" drives the main/rail content split in
    // generator-document-layout.ts (LAYOUT_RULES) — keep it present
    // regardless of what the model echoes back.
    labels: labels.includes("council-vote")
      ? labels
      : ["council-vote", ...labels],
    status: "active",
  };
}

export function generateCouncilVoteLocal(
  options: CouncilVoteGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveCouncilVote(options, rng);

  const memberLines = resolved.members
    .map(
      (m) =>
        `- **${m.name}** (${m.archetype}) — Initial stance: ${m.stance}. Persuadable through the right blend of evidence, favours, or leverage — exactly which is for the table to discover.`,
    )
    .join("\n");

  const content = `### The Proposal
${resolved.proposal}

${resolved.campaignContext ? `### Campaign Fit\nThis vote ties into ${resolved.campaignContext}.\n\n` : ""}### The Deadline
The ${resolved.governingBodyType} — a body shaped by the conventions of a ${resolved.genre.toLowerCase()} setting — must call the vote ${resolved.deadline}. Under a ${resolved.votingRule.toLowerCase()} rule across ${resolved.councilSize} seats, the party needs to shift the room before then.`;

  const lore = `### Voting Procedure
${resolved.votingRule}, ${resolved.councilSize} seats. Scope: ${resolved.scope}.

### Current Vote Estimate
The room is genuinely divided — no faction starts with a guaranteed majority.

### Council Members
${memberLines}

### Antagonist Influence
${
  resolved.antagonistInfluence === "None"
    ? "No hostile hand is on the scale — yet."
    : `Antagonist influence over the council is ${resolved.antagonistInfluence.toLowerCase()}.`
}

### Investigation Leads
Each councillor's public reputation hides a private agenda; asking around the ${resolved.governingBodyType.toLowerCase()}'s usual haunts is the fastest way to learn who can be swayed and how.

### Possible Paths
At least two coalitions of votes can carry the proposal — persuasion and evidence for the cautious, leverage and favours for the desperate.

### Follow-Up Hooks
However the vote resolves, whichever councillors were crossed or courted will remember it long after the ballots are counted.`;

  return {
    type: "event",
    title: resolved.title,
    summary: "",
    content,
    lore,
    labels: ["council-vote", "political-intrigue", resolved.governingBodyType],
    status: "active",
  };
}
