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
  const governingBodyType =
    options.governingBodyType || pickFrom(councilVoteConfig.bodyTypes, rng);
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
  "labels": ["council-vote", "political-intrigue", "quest-generator"]
}
Exactly ${resolved.councilSize} named council members are required. Use these names and starting archetypes as inspiration — invent a full personality, agenda, and secret for each rather than just restating the archetype: ${resolved.members.map((m) => `${m.name} (${m.archetype}, initial stance: ${m.stance})`).join(", ")}.
This is a political puzzle, not a sequence of mandatory fetch quests: give most voters multiple viable approaches with different costs, ensure at least one easy solution creates a future complication, and never let a single action guarantee a majority.
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
  return {
    type: "event",
    title: data.title || resolved.title,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["council-vote", "political-intrigue", "quest-generator"],
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
The ${resolved.governingBodyType} must call the vote ${resolved.deadline}. Under a ${resolved.votingRule.toLowerCase()} rule across ${resolved.councilSize} seats, the party needs to shift the room before then.`;

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
