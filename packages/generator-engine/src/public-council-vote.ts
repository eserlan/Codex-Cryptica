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
 *
 * AI generation is a two-pass chat (#2033): repeated testing showed the model
 * reliably contradicting its own earlier sections once "Possible Paths" and
 * "Costly Best Solution" arrived deep into a single ~800-word generation —
 * reversed/invented dependencies, persuasion conditions swapped for unrelated
 * evidence, amendments introduced despite an immutable objective, majorities
 * rebuilt from scratch when one already existed. Splitting into a foundation
 * pass (roster, procedure, estimate) and a paths pass that receives the
 * foundation as real chat history — not a hand-summarized re-injection —
 * lets the second call read the fixed facts instead of holding them in
 * working memory while also composing new prose.
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
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { type ConceptSeed, formatSeedBlock } from "./concept-seed";
import {
  FIXING_DETAIL,
  ONE_PASS_DETAIL,
  StagedProgress,
  type StagedProgressStep,
} from "./staged-progress";
import { askModel, readJsonObject, type JsonObject } from "./staged-runtime";
import { councilVoteConfig } from "./public-council-vote-constants";
export { councilVoteConfig };

export type CouncilVoteStageId = "foundation" | "paths";

export const COUNCIL_VOTE_PROGRESS_STEPS: ReadonlyArray<{
  id: CouncilVoteStageId;
  label: string;
}> = [
  { id: "foundation", label: "Council roster, procedure and initial tally" },
  { id: "paths", label: "Persuasion paths and follow-up hooks" },
];

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
  avoidNames?: string[];
  seed?: ConceptSeed | null;
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

  const avoidSet = new Set(
    options.avoidNames?.map((n) => n.trim().toLowerCase()) ?? [],
  );
  const members: CouncilVoteMember[] = Array.from(
    { length: councilSize },
    () => {
      let name = generateName(rng);
      let attempts = 0;
      while (avoidSet.has(name.toLowerCase()) && attempts < 10) {
        name = generateName(rng);
        attempts++;
      }
      return {
        name,
        archetype: pickFrom(councilVoteConfig.archetypes, rng),
        stance: pickFrom(councilVoteConfig.stances, rng),
      };
    },
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

// The only labels this generator's own schema asks for. "council-vote"
// drives the main/rail content split in generator-document-layout.ts
// (LAYOUT_RULES), matched by `labels.includes(rule.label)` in rule-array
// order — so a stray foreign label like "quest-generator" (present earlier
// in that array) would win the match even with "council-vote" also present.
// Whitelisting to this generator's own known labels, rather than just
// appending "council-vote", closes that off regardless of what the model
// echoes back or invents.
const KNOWN_LABELS = ["council-vote", "political-intrigue"];

// The model has repeatedly written "### Antagonist Influence\nNone." while
// describing bribery, coercion, or retaliation elsewhere in the same output,
// despite direct prompt instructions against it (observed across several
// consecutive real generations). `resolved.antagonistInfluence` is a known
// input value (never "None" unless the request actually asked for that), so
// unlike the narrative-consistency checks this one prompt alone can't
// reliably enforce, this one has ground truth to check against in code.
const ANTAGONIST_SECTION_RE =
  /(###\s*Antagonist Influence\s*\n)([\s\S]*?)(?=\n###\s|$)/i;

function fixContradictoryAntagonistSection(
  lore: string,
  antagonistInfluence: string,
): string {
  if (antagonistInfluence === "None") return lore;
  const match = lore.match(ANTAGONIST_SECTION_RE);
  if (!match) return lore;
  const body = match[2].trim();
  // Short-circuit only on a bare "None"/"No" answer, not a longer sentence
  // that happens to start with those words but goes on to actually describe
  // something (e.g. "No hostile hand — yet, though the Syndicate watches.").
  const saysNone =
    body.length === 0 || (/^no(ne)?\b/i.test(body) && body.length < 40);
  if (!saysNone) return lore;
  const replacement = `Antagonist influence over the council is ${antagonistInfluence.toLowerCase()}.`;
  return lore.replace(ANTAGONIST_SECTION_RE, `$1${replacement}`);
}

// ---------------------------------------------------------------------------
// Pass 1 — Foundation: everything a path must respect, nothing that depends
// on a path. Council members, their dependencies, the procedure, and the
// current estimate are fixed here and never revisited.
// ---------------------------------------------------------------------------

export interface CouncilVoteFoundationPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedCouncilVote;
}

export function buildCouncilVoteFoundationPrompt(
  options: CouncilVoteGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): CouncilVoteFoundationPrompt {
  const resolved = resolveCouncilVote(options, rng);
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );
  const avoidPrompt = avoid.length
    ? `Avoid reusing these recent councillor or NPC names: ${avoid.join(", ")}.\n`
    : "";
  const seedBlock = options.seed
    ? `\n\n${formatSeedBlock(options.seed, "Political council vote concept")}\n`
    : "";

  const userMessage = `Generate the FOUNDATION of a Council Vote political RPG quest in JSON format: the party must secure enough votes on a council before an urgent decision is made, instead of persuading a single ruler. This is step one of two — a second step will build the possible paths to victory afterward, treating everything you establish here as fixed, unchangeable fact. Do NOT write "Possible Paths" or "Follow-Up Hooks" yet; those come later.
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
${formatCampaignContextBlock(resolved.campaignContext)}${seedBlock}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this vote (3-6 words)",
  "content": "A player-facing multi-paragraph hook (markdown formatted) describing the proposal, the deadline, and why the party has been drawn into the vote.",
  "lore": "GM-only details (markdown formatted) with EXACTLY these sections, in this order, and no others: '### Voting Procedure' (the threshold and any exploitable procedural rules — if a veto, recusal, abstention, verification, or amendment mechanism exists, state it explicitly; do not leave it implied), '### Current Vote Estimate' (the tally implied here must be mathematically consistent with the stances given below), '### Council Members' (one bullet per member, each named '**Name** (Archetype)', giving their public position, true agenda, initial stance, what would genuinely persuade them, a secret or piece of leverage, and — where relevant — a dependency naming another councillor whose vote or mood changes what would persuade this one; the archetype label must be consistent with the councillor's actual described behavior — do not label a councillor who follows no one and has no dependency as a 'Loyal Shadow' or similar follower archetype), '### Antagonist Influence' (name any faction actively bribing, coercing, monitoring, or retaliating against the party — say 'None' only if no such faction appears anywhere else in this content), '### Investigation Leads'.",
  "labels": ["council-vote", "political-intrigue"]
}
Exactly ${resolved.councilSize} named council members are required. Use these names and starting archetypes as inspiration — invent a full personality, agenda, and secret for each rather than just restating the archetype: ${resolved.members.map((m) => `${m.name} (${m.archetype}, initial stance: ${m.stance})`).join(", ")}.
This is a political puzzle, not a sequence of mandatory fetch quests: give most voters multiple viable approaches with different costs, and never let the roster guarantee a majority on its own.
Set the vote firmly within the ${resolved.genre} genre — the governing body, council members, and stakes should feel native to that setting.
Before drafting anything else, fix the party's exact objective — the specific proposal outcome that would satisfy the party — and hold it immutable: state it clearly, since step two must never contradict it or introduce an amendment if it requires the proposal to pass unchanged.
${NAME_BAN_PROMPT}
${avoidPrompt}${sessionContext}
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated — the output is the adventure itself, nothing about producing it.
Before returning, double-check: every councillor's stance is identical everywhere it appears (their own bullet and "Current Vote Estimate"); the tally in "Current Vote Estimate" is arithmetically correct for ${resolved.councilSize} seats; every dependency names a real councillor from this same roster and is stated in only one direction; and "Antagonist Influence" does not contradict any antagonist action described in "content". Fix any mismatch before responding.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

// Pass 1.5 — Foundation repair: a real sample caught the foundation pass
// establishing a persuasion condition that was itself an amendment ("a sworn
// covenant guaranteeing permanent timber tax exemptions") for an objective
// that required the proposal to pass unchanged. Pass 2 then correctly used
// that exact established condition (per its own rules) and inherited the
// violation — splitting into two passes only fixes "pass 2 contradicts pass
// 1," not "pass 1 contradicts itself." This repair turn runs before pass 2
// ever sees the foundation, so it can't inherit a defect that's fixed here.
// Mirrors public-dungeon.ts's coherence-repair pass: proofread and fix, not
// regenerate.
export function buildCouncilVoteFoundationRepairPrompt(genre: string): string {
  return `Before continuing, proofread and repair the scenario you just wrote above — do not write a new one, only fix what's broken, and return the complete corrected JSON object in the exact same schema, with every field present, not just the parts you changed.
Check specifically:
1. If the objective established above requires the proposal to pass strictly unchanged, no councillor's persuasion condition may itself function as an amendment, exemption, rider, sunset clause, or substitute proposal. If any councillor's persuasion condition is shaped this way (grants an exemption, alters an implementation term, carves out a special treatment), rewrite it to something that persuades without altering the proposal's terms — a bribe, evidence, a favour, a threat, a service, or exposing a secret.
2. "### Antagonist Influence" must name any faction actively bribing, coercing, monitoring, or retaliating against the party that is described anywhere else in this content — including inside a councillor's true agenda or secret/leverage. If such a faction exists and "Antagonist Influence" says "None" or doesn't name it, correct that section to name it.
3. Re-confirm every councillor's stance is identical everywhere it appears, the vote estimate tally is arithmetically correct, and every dependency names a real councillor from the roster in only one direction.
4. If "### Voting Procedure" establishes an absence or recusal mechanism that lowers the threshold, verify the resulting threshold is stated and mathematically correct. Explicitly define whether ballots are secret, public, or convert to a recorded division under a stated procedure — do not leave the ballot type ambiguous.
5. Ensure every persuasion condition that requires evidence has a corresponding entry in "### Investigation Leads" describing how to obtain it. Ensure the stated objective does not claim to resolve a harm that is inherent to the proposal itself passing unchanged — if the proposal still causes that harm even when it passes exactly as written, the objective must not claim the harm is resolved.
6. Every councillor's name must fit the ${genre} setting — do not use a name whose style clashes with the genre (e.g. a modern surname in a Classic Fantasy setting, or a medieval-fantasy name in a Cyberpunk or Sci-Fi setting). If any name doesn't fit, rename that entity, keeping the change consistent everywhere the name appears in this content.
If nothing needs fixing, return the scenario exactly as it was.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;
}

export interface CouncilVoteFoundation {
  title: string;
  content: string;
  /** Voting Procedure, Current Vote Estimate, Council Members, Antagonist
   *  Influence, and Investigation Leads sections, in that order — everything
   *  the paths pass treats as fixed. */
  lore: string;
  labels: string[];
}

function councilVoteFoundationFromRecord(
  data: JsonObject,
  resolved: ResolvedCouncilVote,
): CouncilVoteFoundation {
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  const labels = rawLabels.filter(
    (label: unknown): label is string =>
      typeof label === "string" && KNOWN_LABELS.includes(label),
  );
  if (!labels.includes("council-vote")) labels.unshift("council-vote");
  if (!labels.includes(resolved.genre)) labels.push(resolved.genre);
  const lore = fixContradictoryAntagonistSection(
    typeof data.lore === "string" ? data.lore : "",
    resolved.antagonistInfluence,
  );
  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : resolved.title,
    content: typeof data.content === "string" ? data.content : "",
    lore,
    labels,
  };
}

export function parseCouncilVoteFoundation(
  text: string,
  resolved: ResolvedCouncilVote,
): CouncilVoteFoundation {
  return councilVoteFoundationFromRecord(parseFencedJson(text), resolved);
}

export function readCouncilVoteFoundation(
  reply: string,
  resolved: ResolvedCouncilVote,
): CouncilVoteFoundation | null {
  const data = readJsonObject(reply);
  if (!data) return null;
  const parsed = councilVoteFoundationFromRecord(data, resolved);
  return parsed.content.trim() && parsed.lore.trim() ? parsed : null;
}

// ---------------------------------------------------------------------------
// Pass 2 — Paths: sent as a second turn on the same chat session, so the
// model has the foundation pass's actual output in its own history rather
// than a hand-summarized re-injection of it.
// ---------------------------------------------------------------------------

export interface CouncilVotePathsPrompt {
  systemInstruction: string;
  userMessage: string;
}

export function buildCouncilVotePathsPrompt(): CouncilVotePathsPrompt {
  const userMessage = `Now write ONLY the "### Possible Paths" and "### Follow-Up Hooks" sections that build on the Council Vote scenario you generated above. Treat everything already established there — the objective, the voting procedure, every councillor's stance, motive, secret, and dependency, the current vote estimate, and the antagonist influence — as fixed, unchangeable fact. Do not invent a new roster, restate the scenario, or write anything else.
${NAME_BAN_PROMPT}
Return a valid JSON object matching this structure exactly:
{
  "possiblePaths": "'### Possible Paths' markdown, ordered smallest to largest: the smallest viable coalition that clears the threshold, then at least one broader or riskier alternative, then a distinct costly best solution last.",
  "followUpHooks": "'### Follow-Up Hooks' markdown."
}
Follow these rules when writing the paths:
1. Treat each councillor's initial stance, motive, and dependency exactly as established above — do not alter, invent, or omit any of it. Every path must explain exactly how a specific councillor's vote changes from that stance, and the tally must be recalculated from those changes under the established voting procedure. Never describe the party spending effort on, or in any way endangering or risking, a councillor whose vote is already secured. If the current vote estimate already projects enough votes to clear the threshold, the smallest viable coalition must stabilize the fragile or leaning supporters already in place, or secure one backup vote against defection — not construct an entirely new coalition or target councillors whose support isn't needed to win. Within every path, clearly distinguish the votes actually required to clear the threshold from any extra "insurance" vote pursued purely as a hedge against defection — never present an insurance vote as required.
2. No path may describe a veto-holder as simply outvoted, and no path may invent or use a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define.
3. Account for ballot secrecy: persuasion, bribery, or coercion yields only an expected vote unless the voting procedure states an explicit verification mechanism — under a secret or unverified ballot, present every path's outcome as a projection, distinct from the actual final ballot, in every path equally, not only some, and never describe a projected vote as "locked in."
4. If the established objective requires the proposal to pass unchanged, no path — including the costly best solution — may introduce an amendment, sunset clause, substitute proposal, rider, exemption, or altered implementation term, even one framed as a separate programme that functionally changes how the proposal applies. Any councillor whose demand requires such a change stays unavailable for genuine persuasion in every path.
5. Only use dependencies exactly as established above — never invent a dependency link between councillors that wasn't stated, never reverse the direction of one that was, and never let its effect exceed exactly what it describes (a dependency that says a councillor's price or stance "shifts" is not license to assume they copy another councillor's vote outright). If a path changes the vote of a councillor another one depends on, it must state what that dependent councillor does as a result — none left dangling. If any investigation lead described in a path could plausibly trigger a procedural rule from the established voting procedure (such as a delay or a point of order), account for that risk explicitly.
6. The costly best solution is the least harmful viable route that fully resolves the central dilemma — not simply the largest coalition or the most votes. It must persuade each targeted councillor only through the exact condition already established for them (never a substitute condition or unrelated evidence), and its cost must be a genuine, lasting political, moral, financial, or strategic consequence required to fully resolve the dilemma — not a manufactured one and not merely time or resources spent investigating. Do not sacrifice an uninvolved party's interests, force unanimity, or endanger an already-secured vote beyond what the objective actually requires.
7. Coalition diversity: The three paths must construct genuinely distinct valid coalitions representing different political approaches: the smallest viable coalition via direct transactional logrolling or targeted favours; the broader/riskier alternative via procedural mechanisms, recusal rules, committee bylaws, or exposing secrets/kompromat; and the costly best solution via durable moral or structural resolution of the core dilemma. Account for both councillor dependencies and persuasion conditions to target different voting blocs rather than minor tweaks to the same core bloc.
8. Concise operational narrative: Keep full motivations, personal histories, and worldviews with the councillors in the foundation pass. Do not re-narrate a councillor's biography or emotional justification in the paths section. Make the coalition paths concise, highlighting only their distinct political strategy, the specific action/leverage applied per targeted councillor, any triggered dependency cascade, immediate operational risks, lasting consequences, and the resulting vote tally.
9. Write every section as scene-appropriate prose. Do not restate the wording of these rules verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated.
10. For each of the three paths, include a machine-checkable final ballot after the prose: one line for every councillor in the exact format "- **Name** — Support — Reason: ..." (use Oppose, Abstain, or Undecided as appropriate). Include every seat exactly once, carrying untargeted stances forward. End each ballot with "Tally: Support N, Oppose N, Abstain N, Undecided N". These are the projected outcomes under the stated procedure, not guaranteed ballots under a secret ballot. Do not omit the seat-by-seat outcome or tally.
Before returning, simulate the vote from start to finish and check every path against the rules above: list the final vote of every councillor per path, seat by seat, including councillors the path did not target — an untargeted councillor's vote carries over unchanged from their established stance unless the path explains why it moved — then recalculate the tally against the established threshold and double-check the arithmetic; confirm no path relies on an unexplained vote change, ignores an opposing or abstaining councillor, endangers an already-secured vote, violates ballot secrecy in any path, or invents or uses a procedural mechanism not established above; confirm every dependency used is one that was actually established above, in the direction it was defined, with an effect no larger than what it describes; confirm the smallest viable coalition targets only councillors whose support is actually needed to clear the threshold, and that any extra vote is clearly marked as insurance, not required; confirm no path — including the costly best solution — alters the proposal itself if the objective requires it to pass unchanged; confirm the costly best solution persuades each targeted councillor only through their exact established condition and that its cost is a lasting consequence, not merely time or resources spent; confirm "Possible Paths" is ordered smallest viable coalition, then broader/riskier alternative, then the costly best solution, each using a distinct political approach; confirm the narrative stays concise without repeating councillor biographies; confirm "Antagonist Influence" is not contradicted by anything described in these new sections; and confirm the output contains no prompt instructions, placeholder-name notes, or generation commentary. Fix any mismatch before responding.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
  };
}

// Pass 2.5 — Paths repair: a real sample used a dependency link between two
// councillors that was never established (only the reverse direction was
// stated), and separately hedged a councillor's outcome with "abstains" when
// no abstention mechanism exists in the established voting procedure. The
// paths pass's own single-shot end-of-prompt checklist didn't catch it — the
// same self-verification-in-one-generation limitation the whole two-pass
// split exists to work around, just recurring one section later. This turn
// proofreads the paths pass's own output the same way the repair pass
// proofreads the foundation.
export function buildCouncilVotePathsRepairPrompt(): string {
  return `Before continuing, proofread and repair the "Possible Paths" and "Follow-Up Hooks" you just wrote above — do not write new paths, only fix what's broken, and return the complete corrected JSON object in the exact same schema, with every field present, not just the parts you changed.
Check specifically across these core invariants and style requirements:
1. Every dependency used across the paths is one that was actually established in the scenario above, used in the direction it was defined, with an effect no larger than what it describes. If any path invented a dependency link that was never stated, or reversed one that was, remove or correct it — including removing any vote change that only happened because of the invented dependency. If a councillor has their own specific persuasion condition stated in the scenario above, a path must use that condition directly to flip their vote rather than defaulting to a looser dependency-based trigger — a dependency may substitute for a councillor's own condition only if the path explains why their own condition is unavailable or impractical in that path. If a path changes the vote of a councillor whom another councillor depends upon, verify that the dependent councillor's reaction is resolved consistently and not left contradictory or dangling.
2. No path uses a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define — including a hedge like "or abstains" presented as a live possibility.
3. Each targeted councillor is persuaded only through their exact established condition or their established secret/leverage — never a substitute condition or unrelated evidence.
4. No path — including the costly best solution — alters the proposal itself if the objective established above requires it to pass unchanged. No path may introduce an amendment, sunset clause, substitute proposal, rider, exemption, or altered implementation term, even one framed as a separate programme.
5. Recount exactly how many additional votes are needed beyond the current baseline to clear the threshold (threshold minus the votes already secured on the required side of the estimate). The smallest viable coalition must target exactly that many councillors — no more. Delete any additional target beyond that count, and delete all insurance votes from the smallest viable coalition entirely; an insurance/backup vote belongs only in the broader alternative, never the smallest coalition.
6. The costly best solution must pursue the least coercive coalition sufficient to fully resolve the dilemma, not the largest, most coercive, or most unanimous one available — it may not seek unanimity unless unanimity itself produces a concrete benefit unavailable from a simple majority (state that benefit explicitly if unanimity is used). It may not target more councillors than the recounted minimum from rule 5 without a stated reason specific to fully resolving the dilemma (not just "extra margin," which belongs in the broader alternative instead) — and it specifically may not target a councillor whose vote is already secured just to manufacture the appearance of a cost; padding an otherwise-identical coalition with a needless action on an already-secured councillor is exactly the "manufactured" cost this rule already forbids. If removing such padding would leave this path identical to another path in targets and outcome, delete the padding rather than keep it as filler, and see rule 8. If the proposal itself causes an unavoidable harm even when it passes exactly as written, the best solution must mitigate that harm through a separate, lawful action described in the path — not by implying the vote itself resolves it.
7. Every path's stated tally summary (however many are Support/Oppose/Abstain/etc.) must exactly equal the literal sum of that same path's own seat-by-seat breakdown — recount the breakdown digit by digit and correct the summary line if it doesn't match, even if the mismatch is just a stale total left over from a different path. Separately, no path may count an "Unknown" or otherwise unconfirmed councillor toward the required total, even if a dependency nudges their disposition — a dependency altering someone's mood is not the same as securing their vote. If a path's own recounted breakdown doesn't actually clear the threshold, either add a direct action that secures the additional vote or rewrite the path's conclusion to match what the breakdown actually shows.
8. The three paths must be materially different from each other in their targeted councillors or their methodology. If the costly best solution (or any other path) targets the identical councillors through identical actions as another path, with only a cost paragraph appended, rewrite it with a genuinely distinct approach or targets — or, if the same targets truly are the least coercive option available, make the cost and methodology description reflect something the smallest coalition's own narration doesn't already say. Ensure the paths explore different political methodologies (such as direct logrolling, procedural leverage, or structural resolution).
9. Keep full councillor motivations and backstories in the foundation pass. Prune repetitive biographical summaries or re-explanations of a councillor's worldview from the paths; keep each path concise, operational, and focused on strategy, leverage, cascade, and tally.
If nothing needs fixing, return the paths exactly as they were.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;
}

export interface CouncilVotePathsAuditResult {
  valid: boolean;
  issues: string[];
}

type CouncilVotePathTier = "smallest" | "alternative" | "best";
type CouncilVotePosition = "Support" | "Oppose" | "Abstain" | "Undecided";
type CouncilVoteInitialPosition = CouncilVotePosition | "Leaning" | "Unknown";

const TIER_PATTERNS: Record<CouncilVotePathTier, RegExp> = {
  smallest: /\b(?:smallest|minimal|minimum)\s+(?:viable\s+)?coalition\b/i,
  alternative: /\b(?:broader|alternative|riskier)\b/i,
  best: /\b(?:costly\s+best|best\s+solution)\b/i,
};

interface ParsedCouncilVoteTiers {
  tiers: Map<CouncilVotePathTier, string>;
  order: CouncilVotePathTier[];
}

function councilVoteTiers(text: string): ParsedCouncilVoteTiers {
  const matches = (
    Object.entries(TIER_PATTERNS) as [CouncilVotePathTier, RegExp][]
  )
    .flatMap(([tier, pattern]) => {
      const headingPattern = new RegExp(
        `^#{1,6}[^\\n]*${pattern.source}`,
        "im",
      );
      const match = headingPattern.exec(text);
      return match ? [{ tier, index: match.index }] : [];
    })
    .sort((a, b) => a.index - b.index);
  const tiers = new Map<CouncilVotePathTier, string>();
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const end = matches[index + 1]?.index ?? text.length;
    tiers.set(current.tier, text.slice(current.index, end));
  }
  return { tiers, order: matches.map((match) => match.tier) };
}

function normalizedPosition(
  position: CouncilVoteInitialPosition,
): CouncilVotePosition {
  return position === "Leaning" || position === "Unknown"
    ? "Undecided"
    : position;
}

interface CouncilVoteBallotRow {
  name: string;
  position: CouncilVotePosition;
  reason: string;
}

interface CouncilVoteMemberPosition {
  name: string;
  position: CouncilVotePosition;
}

function readCouncilVoteMemberPositions(foundationLore: string): {
  section: string;
  members: CouncilVoteMemberPosition[];
} {
  const section =
    foundationLore.match(
      /###\s*Council Members\s*\n([\s\S]*?)(?=\n###\s|$)/i,
    )?.[1] ?? "";
  const members = [
    ...section.matchAll(
      /^\s*-\s*\*\*(.+?)\*\*[^\n]*?Initial stance:\s*(Support|Oppose|Abstain|Undecided|Leaning|Unknown)\b[^\n]*$/gim,
    ),
  ].map((match) => ({
    name: match[1].trim(),
    position: normalizedPosition(match[2] as CouncilVoteInitialPosition),
  }));
  return { section, members };
}

function readCouncilVoteBallotRows(text: string): CouncilVoteBallotRow[] {
  return [
    ...text.matchAll(
      /^\s*-\s*\*\*(.+?)\*\*\s*[—:-]\s*(Support|Oppose|Abstain|Undecided)\s*[—:-]\s*Reason:\s*([^\n]+)$/gim,
    ),
  ].map((match) => ({
    name: match[1].trim(),
    position: match[2] as CouncilVotePosition,
    reason: match[3].trim(),
  }));
}

function auditBallotRoster(
  tier: CouncilVotePathTier,
  members: CouncilVoteMemberPosition[],
  rows: CouncilVoteBallotRow[],
  issues: string[],
): Map<string, CouncilVoteBallotRow> {
  const byName = new Map(
    rows.map((row) => [row.name.toLocaleLowerCase(), row]),
  );
  auditMissingBallotMembers(tier, members, byName, issues);
  auditUnknownBallotMembers(tier, members, rows, issues);
  auditChangedBallots(tier, members, rows, issues);
  if (rows.length !== members.length || byName.size !== members.length) {
    issues.push(
      `${tier} coalition ballot must list each councillor exactly once.`,
    );
  }
  return byName;
}

function auditMissingBallotMembers(
  tier: CouncilVotePathTier,
  members: CouncilVoteMemberPosition[],
  byName: Map<string, CouncilVoteBallotRow>,
  issues: string[],
): void {
  for (const member of members) {
    if (!byName.has(member.name.toLocaleLowerCase())) {
      issues.push(
        `${tier} coalition ballot is missing ${member.name}'s final vote and reason.`,
      );
    }
  }
}

function auditUnknownBallotMembers(
  tier: CouncilVotePathTier,
  members: CouncilVoteMemberPosition[],
  rows: CouncilVoteBallotRow[],
  issues: string[],
): void {
  const knownNames = new Set(
    members.map((member) => member.name.toLowerCase()),
  );
  for (const row of rows) {
    if (!knownNames.has(row.name.toLowerCase())) {
      issues.push(
        `${tier} coalition ballot includes unknown councillor ${row.name}.`,
      );
    }
  }
}

function auditBallotRowChange(
  tier: CouncilVotePathTier,
  member: CouncilVoteMemberPosition,
  row: CouncilVoteBallotRow,
  issues: string[],
): void {
  if (
    /\b(?:carry\s+over|carries\s+over|carrying\s+over|unchanged|remains?\s+(?:as|at)|keeps?\s+(?:their\s+)?(?:initial|original)\s+(?:vote|position))\b/i.test(
      row.reason,
    ) &&
    row.position !== member.position
  ) {
    issues.push(
      `${tier} coalition changes ${row.name}'s vote while describing it as carried over unchanged.`,
    );
  }
}

function auditChangedBallots(
  tier: CouncilVotePathTier,
  members: CouncilVoteMemberPosition[],
  rows: CouncilVoteBallotRow[],
  issues: string[],
): void {
  const membersByName = new Map(
    members.map((member) => [member.name.toLocaleLowerCase(), member]),
  );
  for (const row of rows) {
    const member = membersByName.get(row.name.toLocaleLowerCase());
    if (member) {
      auditBallotRowChange(tier, member, row, issues);
    }
  }
}

function countBallotPositions(rows: CouncilVoteBallotRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.position] += 1;
      return counts;
    },
    { Support: 0, Oppose: 0, Abstain: 0, Undecided: 0 },
  );
}

function auditBallotTally(
  tier: CouncilVotePathTier,
  text: string,
  rows: CouncilVoteBallotRow[],
  issues: string[],
) {
  const match = text.match(
    /\bTally:\s*Support\s+(\d+)\s*,\s*Oppose\s+(\d+)\s*,\s*Abstain\s+(\d+)\s*,\s*Undecided\s+(\d+)/i,
  );
  if (!match) {
    issues.push(`${tier} coalition ballot is missing its structured tally.`);
    return null;
  }
  const expected = countBallotPositions(rows);
  const stated = match.slice(1).map(Number);
  const actual = [
    expected.Support,
    expected.Oppose,
    expected.Abstain,
    expected.Undecided,
  ];
  if (stated.some((count, index) => count !== actual[index])) {
    issues.push(
      `${tier} coalition tally does not match its seat-by-seat ballot.`,
    );
  }
  return expected;
}

function auditBallotThreshold(
  tier: CouncilVotePathTier,
  foundationLore: string,
  seatCount: number,
  supportVotes: number,
  issues: string[],
): void {
  const procedure =
    foundationLore.match(
      /###\s*Voting Procedure\s*\n([\s\S]*?)(?=\n###\s|$)/i,
    )?.[1] ?? "";
  const threshold = approvalThreshold(procedure, seatCount);
  if (threshold === null) {
    issues.push(
      "Foundation voting procedure does not state a parseable approval threshold.",
    );
  } else if (supportVotes < threshold) {
    issues.push(
      `${tier} coalition ballot projects ${supportVotes} support votes, below the ${threshold}-vote approval threshold.`,
    );
  }
}

function auditDependencyResponses(
  tier: CouncilVotePathTier,
  foundationSection: string,
  members: CouncilVoteMemberPosition[],
  ballot: Map<string, CouncilVoteBallotRow>,
  issues: string[],
): void {
  const memberLines = foundationSection.split(/\n(?=\s*-\s*\*\*)/);
  for (const line of memberLines) {
    auditDependencyResponseLine(tier, line, members, ballot, issues);
  }
}

function auditDependencyResponseLine(
  tier: CouncilVotePathTier,
  line: string,
  members: CouncilVoteMemberPosition[],
  ballot: Map<string, CouncilVoteBallotRow>,
  issues: string[],
): void {
  const sourceMatch = line.match(/^\s*-\s*\*\*(.+?)\*\*/);
  const dependencyMatch = line.match(
    /\bdepends?\s+on\s+(?:the\s+vote\s+of\s+)?(?:\*{1,2})?([^*.,;]+?)(?:\*{1,2})?(?:[.,;]|$)/i,
  );
  if (!sourceMatch || !dependencyMatch) return;
  const dependent = members.find(
    (member) =>
      member.name.toLowerCase() === sourceMatch[1].trim().toLowerCase(),
  );
  const target = members.find(
    (member) =>
      member.name.toLowerCase() === dependencyMatch[1].trim().toLowerCase(),
  );
  if (!dependent || !target) {
    issues.push(
      `${tier} coalition cannot validate a dependency with an unknown councillor.`,
    );
    return;
  }
  const targetRow = ballot.get(target.name.toLowerCase());
  const dependentRow = ballot.get(dependent.name.toLowerCase());
  if (targetRow && dependentRow) {
    auditChangedDependencyTarget(
      tier,
      target,
      dependent,
      targetRow,
      dependentRow,
      issues,
    );
  }
}

function auditChangedDependencyTarget(
  tier: CouncilVotePathTier,
  target: CouncilVoteMemberPosition,
  dependent: CouncilVoteMemberPosition,
  targetRow: CouncilVoteBallotRow,
  dependentRow: CouncilVoteBallotRow,
  issues: string[],
): void {
  if (
    targetRow.position !== target.position &&
    !/\b(cascade|dependenc|after|because|when)\b/i.test(dependentRow.reason)
  ) {
    issues.push(
      `${tier} coalition changes ${target.name}'s vote without resolving dependent ${dependent.name}'s response.`,
    );
  }
}

function auditPathBallot(
  tier: CouncilVotePathTier,
  text: string,
  foundationLore: string,
  issues: string[],
): void {
  const { section, members } = readCouncilVoteMemberPositions(foundationLore);
  if (members.length === 0) {
    issues.push(
      "Foundation does not expose parseable councillor names and initial stances.",
    );
    return;
  }
  const rows = readCouncilVoteBallotRows(text);
  const ballot = auditBallotRoster(tier, members, rows, issues);
  const tally = auditBallotTally(tier, text, rows, issues);
  if (
    rows.length !== members.length ||
    ballot.size !== members.length ||
    !tally
  )
    return;
  auditBallotThreshold(
    tier,
    foundationLore,
    members.length,
    tally.Support,
    issues,
  );
  auditDependencyResponses(tier, section, members, ballot, issues);
}

function approvalThreshold(procedure: string, seats: number): number | null {
  const explicit = procedure.match(
    /(?:approval\s+)?threshold\s*(?:is|of|:)\s*(\d+)\s+(?:of\s+\d+\s+)?(?:votes?|seats?)/i,
  );
  if (explicit) return Number(explicit[1]);
  if (/\b(?:two[\s-]thirds|2\s*\/\s*3)\b/i.test(procedure))
    return Math.ceil((seats * 2) / 3);
  if (/\b(?:three[\s-]fifths|3\s*\/\s*5)\b/i.test(procedure))
    return Math.ceil((seats * 3) / 5);
  if (/\bunanimous\b/i.test(procedure)) return seats;
  if (/\bsimple\s+majority\b/i.test(procedure))
    return Math.floor(seats / 2) + 1;
  return null;
}

function auditProposalAndSecrecy(
  text: string,
  context: {
    votingRule?: string;
    fixedProposal?: boolean;
    foundationLore?: string;
  },
  issues: string[],
): void {
  if (context.fixedProposal !== false) {
    const amendmentMatch = text.match(
      /\b(amendment|rider|sunset clause|substitute proposal|exempt(?:ion)?)\b/i,
    );
    if (amendmentMatch) {
      issues.push(
        `Paths introduce potential amendment or exemption term ("${amendmentMatch[0]}") for a fixed proposal.`,
      );
    }
  }

  const foundationVotingRule =
    context.foundationLore?.match(
      /###\s*Voting Procedure\s*\n([\s\S]*?)(?=\n###\s|$)/i,
    )?.[1] ?? "";
  const isSecret = /\bsecret\b/i.test(
    context.votingRule ?? foundationVotingRule,
  );
  if (isSecret && /\blocked in\b/i.test(text)) {
    issues.push(
      'Paths treat projected votes as "locked in" under a secret ballot procedure.',
    );
  }
}

const REQUIRED_TIER_ORDER: CouncilVotePathTier[] = [
  "smallest",
  "alternative",
  "best",
];

function auditTierOrder(order: CouncilVotePathTier[], issues: string[]): void {
  if (
    order.length === REQUIRED_TIER_ORDER.length &&
    order.some((tier, idx) => tier !== REQUIRED_TIER_ORDER[idx])
  ) {
    issues.push(
      "Paths must be ordered smallest viable coalition, then broader alternative, then costly best solution.",
    );
  }
}

/**
 * Programmatic consistency audit for generated council-vote paths: checks
 * proposal immutability, ballot secrecy, all three coalition tiers, and—when
 * foundation lore is supplied—seat-by-seat tallies, approval thresholds, and
 * dependency cascade accounting.
 */
export function auditCouncilVotePaths(
  paths: CouncilVotePaths,
  context: {
    votingRule?: string;
    fixedProposal?: boolean;
    foundationLore?: string;
  } = {},
): CouncilVotePathsAuditResult {
  const issues: string[] = [];
  const text = paths.possiblePaths || "";

  if (!text.trim()) {
    issues.push("Possible paths content is empty.");
    return { valid: false, issues };
  }

  auditProposalAndSecrecy(text, context, issues);

  const { tiers, order } = councilVoteTiers(text);
  for (const tier of REQUIRED_TIER_ORDER) {
    if (!tiers.has(tier)) {
      issues.push(`Paths are missing the ${tier} coalition tier.`);
      continue;
    }
    if (context.foundationLore) {
      auditPathBallot(tier, tiers.get(tier)!, context.foundationLore, issues);
    }
  }

  auditTierOrder(order, issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}

export interface CouncilVotePaths {
  possiblePaths: string;
  followUpHooks: string;
}

function councilVotePathsFromRecord(data: JsonObject): CouncilVotePaths {
  return {
    possiblePaths:
      typeof data.possiblePaths === "string" ? data.possiblePaths : "",
    followUpHooks:
      typeof data.followUpHooks === "string" ? data.followUpHooks : "",
  };
}

export function parseCouncilVotePathsResponse(text: string): CouncilVotePaths {
  return councilVotePathsFromRecord(parseFencedJson(text));
}

export function readCouncilVotePaths(reply: string): CouncilVotePaths | null {
  const data = readJsonObject(reply);
  if (!data) return null;
  const parsed = councilVotePathsFromRecord(data);
  return parsed.possiblePaths.trim() && parsed.followUpHooks.trim()
    ? parsed
    : null;
}

export interface CouncilVoteFourTurnArgs<TFoundation, TPaths> {
  send: (userMessage: string) => Promise<string>;
  foundationPrompt: string;
  foundationRepairPrompt: string;
  pathsPrompt: string;
  pathsRepairPrompt: string;
  readFoundation: (reply: string) => TFoundation | null;
  readPaths: (reply: string) => TPaths | null;
  validatePaths?: (foundation: TFoundation, paths: TPaths) => boolean;
  onProgress?: (steps: StagedProgressStep[]) => void;
  signal?: AbortSignal;
}

/**
 * Shared 4-turn Council Vote runner (foundation → foundation repair → paths →
 * paths repair) on a single chat session. Keeps the unrepaired draft of either
 * stage when its repair turn fails or returns an unusable payload, and returns
 * `null` when either initial stage draft is unusable. Cancellation via `signal`
 * propagates immediately.
 */
export async function runCouncilVoteFourTurn<TFoundation, TPaths>(
  args: CouncilVoteFourTurnArgs<TFoundation, TPaths>,
): Promise<{ foundation: TFoundation; paths: TPaths } | null> {
  const progress = new StagedProgress(
    COUNCIL_VOTE_PROGRESS_STEPS,
    args.onProgress,
  );
  const { signal } = args;

  progress.set("foundation", "active");
  const initialFoundation = await askModel(
    () => args.send(args.foundationPrompt),
    args.readFoundation,
    { signal },
  );
  if (!initialFoundation) {
    progress.abandon("foundation", ONE_PASS_DETAIL);
    return null;
  }

  progress.set("foundation", "active", FIXING_DETAIL);
  const repairedFoundation = await askModel(
    () => args.send(args.foundationRepairPrompt),
    args.readFoundation,
    { signal },
  );
  const foundation = repairedFoundation ?? initialFoundation;
  progress.set("foundation", "done");

  progress.set("paths", "active");
  const initialPaths = await askModel(
    () => args.send(args.pathsPrompt),
    args.readPaths,
    { signal },
  );
  if (!initialPaths) {
    progress.abandon("paths", ONE_PASS_DETAIL);
    return null;
  }

  progress.set("paths", "active", FIXING_DETAIL);
  const repairedPaths = await askModel(
    () => args.send(args.pathsRepairPrompt),
    args.readPaths,
    { signal },
  );
  const paths = repairedPaths ?? initialPaths;
  if (args.validatePaths && !args.validatePaths(foundation, paths)) {
    progress.abandon("paths", "The generated paths failed consistency checks.");
    return null;
  }
  progress.set("paths", "done");

  return { foundation, paths };
}

export interface CouncilVoteStagedDeps {
  send: (userMessage: string) => Promise<string>;
  onProgress?: (steps: StagedProgressStep[]) => void;
  signal?: AbortSignal;
}

export async function runCouncilVoteStaged(
  prompt: CouncilVoteFoundationPrompt,
  deps: CouncilVoteStagedDeps,
): Promise<PublicGeneratorOutput | null> {
  const stages = await runCouncilVoteFourTurn({
    send: deps.send,
    foundationPrompt: prompt.userMessage,
    foundationRepairPrompt: buildCouncilVoteFoundationRepairPrompt(
      prompt.resolved.genre,
    ),
    pathsPrompt: buildCouncilVotePathsPrompt().userMessage,
    pathsRepairPrompt: buildCouncilVotePathsRepairPrompt(),
    readFoundation: (reply) =>
      readCouncilVoteFoundation(reply, prompt.resolved),
    readPaths: readCouncilVotePaths,
    validatePaths: (foundation, paths) =>
      auditCouncilVotePaths(paths, {
        votingRule: prompt.resolved.votingRule,
        fixedProposal: true,
        foundationLore: foundation.lore,
      }).valid,
    onProgress: deps.onProgress,
    signal: deps.signal,
  });
  return stages
    ? mergeCouncilVoteOutput(stages.foundation, stages.paths)
    : null;
}

/** Combines both passes into the shape every other public generator returns. */
export function mergeCouncilVoteOutput(
  foundation: CouncilVoteFoundation,
  paths: CouncilVotePaths,
): PublicGeneratorOutput {
  const lore = [foundation.lore, paths.possiblePaths, paths.followUpHooks]
    .filter(Boolean)
    .join("\n\n");
  return {
    type: "event",
    title: foundation.title,
    summary: "",
    content: foundation.content,
    lore,
    labels: foundation.labels,
    status: "active",
  };
}

/**
 * Extracts generated councillor names from council vote output
 * so subsequent generations can avoid immediately repeating them.
 */
export function extractCouncilVoteNames(output: {
  content?: string;
  lore?: string;
}): string[] {
  const names = new Set<string>();
  const text = `${output.lore ?? ""}\n${output.content ?? ""}`;

  const memberMatches = text.matchAll(
    /-\s+\*\*([^*()\n]+?)(?:\s*\(([^)]+)\)|\s*[—–-]\s*[^*]+)?\*\*/g,
  );
  for (const m of memberMatches) {
    const raw = m[1]?.trim();
    if (
      raw &&
      raw.length > 1 &&
      raw.length < 40 &&
      !/^(?:voting|current|council|antagonist|investigation|the\b)/i.test(raw)
    ) {
      names.add(raw);
    }
  }

  const altMatches = text.matchAll(/-\s+\*\*([^*()\n]+?)\*\*\s*\(([^)]+)\)/g);
  for (const m of altMatches) {
    const raw = m[1]?.trim();
    if (
      raw &&
      raw.length > 1 &&
      raw.length < 40 &&
      !/^(?:voting|current|council|antagonist|investigation|the\b)/i.test(raw)
    ) {
      names.add(raw);
    }
  }

  return [...names];
}

export function generateCouncilVoteLocal(
  options: CouncilVoteGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveCouncilVote(options, rng);

  const memberLines = resolved.members
    .map((m) => {
      const hint =
        councilVoteConfig.persuasionHints[m.archetype] ??
        "persuadable through the right blend of evidence, favours, or leverage: exactly which is for the table to discover";
      return `- **${m.name}** (${m.archetype}) — Initial stance: ${m.stance}. ${hint[0].toUpperCase()}${hint.slice(1)}.`;
    })
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
At least two coalitions of votes can carry the proposal — persuasion and evidence for the cautious, leverage and favours for the desperate. The costly best solution: win every seat outright, but only by spending every favour and secret in hand — the vote passes clean, and the party leaves owing debts, and making enemies, they cannot yet see the price of.

### Follow-Up Hooks
However the vote resolves, whichever councillors were crossed or courted will remember it long after the ballots are counted.`;

  return {
    type: "event",
    title: resolved.title,
    summary: "",
    content,
    lore,
    labels: [
      "council-vote",
      "political-intrigue",
      resolved.governingBodyType,
      resolved.genre,
    ],
    status: "active",
  };
}
