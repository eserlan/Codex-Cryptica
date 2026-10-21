import { formatCampaignContextBlock } from "./campaign-context";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  MOTIF_VARIETY_GUARDRAIL,
  WORLD_RELATION_DEFINITIONS,
  domainVarietyGuardrail,
  villainPowerScaleHint,
  type ResolvedVillain,
} from "./public-villain";
import type { JsonObject } from "./staged-runtime";
import type { VillainFinding } from "./villain-diversity";
import type {
  VillainDrafts,
  VillainPlan,
  VillainStagedDeps,
} from "./villain-staged-contracts";

export const VILLAIN_SYSTEM =
  "You are an assistant that generates detailed RPG campaign villains in JSON format.";

/** Prose fields the coherence pass may rewrite, and the stage that owns each. */
export const REPAIRABLE_FIELDS = {
  ultimateGoal: "concept",
  whyNow: "concept",
  motivation: "concept",
  fatalFlaw: "concept",
  methods: "concept",
  resources: "concept",
  organisation: "organisation",
  territory: "organisation",
  escalation: "plan",
  weakness: "ending",
  moralComplication: "ending",
  finalConfrontation: "ending",
  ifDefeated: "ending",
} as const satisfies Record<string, keyof VillainDrafts>;

export type RepairableField = keyof typeof REPAIRABLE_FIELDS;

type Context = Pick<
  VillainStagedDeps,
  "contextPrefix" | "sessionContext" | "recentDomains"
>;

function settingBlock(
  resolved: ResolvedVillain,
  plan: VillainPlan,
  ctx: Context,
): string {
  const hint = villainPowerScaleHint(resolved);
  const { axes } = plan;
  return `${ctx.contextPrefix ? `${ctx.contextPrefix}\n\n` : ""}Villain Options:
- Genre / Theme: ${resolved.genre}
- Tone: ${resolved.tone}
- Threat Scale: ${resolved.threatScale}${hint ? ` — ${hint}` : ""}
- Villain Archetype: ${resolved.archetype}
- Degree of Sympathy / Redeemability: ${resolved.sympathy}
- World Relation: ${resolved.worldRelation} — this villain ${WORLD_RELATION_DEFINITIONS[resolved.worldRelation]}. This is the villain's fundamental relationship to the status quo and shapes the goal, motivation and why-now directly.
${formatCampaignContextBlock(resolved.campaignContext)}
Assigned structure (fixed before writing, do not swap it for a more familiar one):
- Organisation: ${axes.organisation.label} — ${axes.organisation.guidance}
- Fatal flaw: ${axes.flaw.label} — ${axes.flaw.guidance}
- Weak point: ${axes.vulnerability.label} — ${axes.vulnerability.guidance}
- Price of defeating them: ${axes.complication.label} — ${axes.complication.guidance}
${plan.avoid.length ? `- Already used in this campaign, do NOT reuse for the villain or anyone around them: ${plan.avoid.join(", ")}\n` : ""}${ctx.sessionContext ?? ""}`;
}

const NO_PREAMBLE =
  "Return ONLY a JSON object matching this schema, with no markdown fence.";

function established(label: string, data: JsonObject): string {
  return `${label} (established, do not change, rename or contradict any of it):
${JSON.stringify(data, null, 2)}`;
}

export function conceptMessage(
  resolved: ResolvedVillain,
  plan: VillainPlan,
  ctx: Context,
): string {
  return `STAGE 1 OF 4: Concept, goal and flaw.

${settingBlock(resolved, plan, ctx)}

Write what the villain is, wants and gets wrong. British English, system-neutral. Their working title is "${resolved.villainName}"; keep it or improve on it.
- conflictDomain: a 2-5 word label for the dominant conflict domain. ${domainVarietyGuardrail(ctx.recentDomains ?? [])}
- ultimateGoal: a concrete end state, never "gain power" or "conquer the world". Say what the world looks like when they have won.
- whyNow: what changed recently so that the campaign begins at this moment. It must give a real deadline or trigger.
- fatalFlaw: a flaw of the assigned kind that follows from this villain's worldview and history and changes what they do.
${MOTIF_VARIETY_GUARDRAIL}
${NAME_BAN_PROMPT}

Do not write the organisation, inner circle, plan, weakness or finale yet.

${NO_PREAMBLE}
{
  "title": "The villain's name and an epithet if one fits (3-8 words)",
  "conflictDomain": "...",
  "publicFace": "What the wider world believes about them",
  "signature": "A recurring motif, tactic or trace that lets players recognise their influence",
  "firstSigns": ["Two to four concrete, indirect early clues"],
  "coreConcept": "What makes this antagonist distinctive, one concise paragraph",
  "trueNature": "What the GM knows that the world does not",
  "ultimateGoal": "...",
  "whyNow": "...",
  "motivation": "An internally coherent reason, from the villain's own perspective",
  "fatalFlaw": "...",
  "methods": "How they actually advance the agenda",
  "resources": "What gives them power"
}`;
}

export function organisationMessage(
  resolved: ResolvedVillain,
  plan: VillainPlan,
  concept: JsonObject,
  ctx: Context,
): string {
  const slots = plan.axes.lieutenants
    .map(
      (l, i) =>
        `${i + 1}. function: ${l.function}; their relationship to the villain: ${l.relation}; ${l.awareness}`,
    )
    .join("\n");
  return `STAGE 2 OF 4: Organisation and inner circle.

${settingBlock(resolved, plan, ctx)}

${established("Stage 1", concept)}

Write how the villain's power is organised and who stands around them.
- organisation: how power actually works, as the assigned form: ${plan.axes.organisation.label}. Say how orders move, who answers to whom and what holds it together.
- territory: where they operate from and why it matters. Avoid an isolated fortress.
- lieutenants: exactly ${plan.axes.lieutenants.length}, one per slot below, in this order. Each has a full name, a role matching its function, a relationship that matches its slot, a personal motivation, a loyalty model and a secret or independent agenda. Write each so it can become a linked character. Different surnames unless the entries say they are related.
${slots}
${NAME_BAN_PROMPT}

Do not write the plan, weakness or finale yet.

${NO_PREAMBLE}
{
  "organisation": "...",
  "territory": "...",
  "lieutenants": [
    { "name": "...", "role": "...", "relationship": "...", "motivation": "...", "loyalty": "...", "secret": "..." }
  ]
}`;
}

export function planMessage(
  resolved: ResolvedVillain,
  plan: VillainPlan,
  drafts: Pick<VillainDrafts, "concept" | "organisation">,
  ctx: Context,
): string {
  return `STAGE 3 OF 4: The plan.

${settingBlock(resolved, plan, ctx)}

${established("Stage 1", drafts.concept)}

${established("Stage 2", drafts.organisation)}

Write the plan that carries the villain from where they are to the ultimate goal.
- stages: 5-7 escalating stages. Each stage must make the next one possible or urgent, use the organisation and inner circle above, and end where the ultimate goal begins. Every stage has a name, an objective, what the villain and their agents do, clues the players can find, what happens if it succeeds, how the players can interfere and how disruption changes later stages.
- dependencyChain: one short phrase (at most eight words) per stage, in order, naming what that stage secures, e.g. ["acquire the deeds", "erase competing claims", "connect the infrastructure"]. It must have exactly as many entries as stages.
- escalation: how things develop if the party never intervenes. Keep collateral damage within what the established methods can cause.
- discovery: what the world, the villain's servants and only the GM know.
- personalConnections: two to four optional hooks tying the villain to player characters without assuming a backstory.

Do not write the weakness, moral complication or finale yet.

${NO_PREAMBLE}
{
  "stages": [
    { "name": "...", "objective": "...", "actions": "...", "clues": "...", "consequences": "...", "interference": "...", "disruption": "..." }
  ],
  "dependencyChain": ["..."],
  "escalation": "...",
  "discovery": { "world": "...", "servants": "...", "gmOnly": "..." },
  "personalConnections": ["..."]
}`;
}

export function endingMessage(
  resolved: ResolvedVillain,
  plan: VillainPlan,
  drafts: Pick<VillainDrafts, "concept" | "organisation" | "plan">,
  ctx: Context,
): string {
  return `STAGE 4 OF 4: Weakness, price of victory and finale.

${settingBlock(resolved, plan, ctx)}

${established("Stage 1", drafts.concept)}

${established("Stage 2", drafts.organisation)}

${established("Stage 3", drafts.plan)}

Write how the villain can be beaten and what beating them costs.
- weakness: at least one weak point of the assigned kind (${plan.axes.vulnerability.label}) that follows from the villain's nature and that the players can find and use. Do not make it one master object whose loss ends everything.
- moralComplication: the assigned kind (${plan.axes.complication.label}), specific to this villain and plan. Do not default to a power vacuum or a gang war. Leave room for a hard third option where it fits.
- finalConfrontation: the circumstances and stakes, at a place and moment the plan and territory above have established. No combat statistics.
- ifDefeated: the consequences of removing them, appropriate to the threat scale.

${NO_PREAMBLE}
{
  "weakness": "...",
  "moralComplication": "...",
  "finalConfrontation": "...",
  "ifDefeated": "..."
}`;
}

/** The marker the review prompt starts with. */
export const VILLAIN_REVIEW_MARKER = "Coherence review of a finished villain.";

const FIELD_LIST = Object.keys(REPAIRABLE_FIELDS).join(", ");

export function reviewMessage(
  resolved: ResolvedVillain,
  drafts: VillainDrafts,
  findings: readonly VillainFinding[],
  contextPrefix = "",
): string {
  return `${VILLAIN_REVIEW_MARKER}
${contextPrefix ? `\n${contextPrefix}\n` : ""}
Review this ${resolved.threatScale}-scale ${resolved.archetype} villain for places where the sections disagree. Report only real problems, at most 5.
Check that:
- the ultimate goal and the plan's last stage lead to the same end state;
- whyNow explains the deadline and is relevant to the plan;
- each stage makes the next one possible or urgent;
- the escalation does not exceed what the established methods and resources can cause;
- the weakness follows from the villain's nature and organisation;
- the moral complication follows from the goal and plan;
- the final confrontation matches the place and sequence the plan sets up;
- any financial, legal, magical or technological mechanism is explained clearly enough for a GM to run.
${findings.length ? `\nAutomatic checks already flagged:\n${findings.map((f) => `- ${f.field}: ${f.problem}`).join("\n")}\n` : ""}
${JSON.stringify(drafts, null, 2)}

Return ONLY JSON: {"verdict": "clean" | "repair", "issues": [{"field": one of ${FIELD_LIST}, "problem": "one sentence"}]}`;
}

export function repairMessage(
  drafts: VillainDrafts,
  issues: readonly VillainFinding[],
  contextPrefix = "",
): string {
  const fields = [...new Set(issues.map((i) => i.field))];
  return `Repair a finished villain. Rewrite only the fields named in the problems, changing as little as possible and keeping every name, number and fact the other sections rely on.
${contextPrefix ? `\n${contextPrefix}\n` : ""}
Problems:
${issues.map((i) => `- ${i.field}: ${i.problem}`).join("\n")}

${JSON.stringify(drafts, null, 2)}

Return ONLY JSON: {"fixes": {${fields.map((f) => `"${f}": "the corrected text"`).join(", ")}}}`;
}
