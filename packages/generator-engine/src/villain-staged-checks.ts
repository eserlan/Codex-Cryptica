/**
 * Stage checks and assembly for the staged villain route (#2379). Every
 * validator is pure and returns `{ hard, soft }`: hard means the stage cannot
 * be used, soft means usable but doubtful. The prose heuristics are soft and
 * documented in villain-diversity.ts with their limits.
 */

import { OVERUSED_DOMAINS } from "./public-villain";
import {
  addBannedNameFindings,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import {
  dependencyChainProblems,
  genericFlawProblem,
  lieutenantTemplateProblem,
  masterObjectProblem,
  overusedNameProblems,
  powerVacuumProblem,
  sharedSurnameFindings,
  sharesTerm,
  type VillainAxes,
  type VillainFinding,
} from "./villain-diversity";
import {
  REPAIRABLE_FIELDS,
  type RepairableField,
} from "./villain-staged-prompts";
import type { VillainDrafts } from "./villain-staged-contracts";

/** Most items a model-written list may have before the stage is rejected. */
const MAX_LISTED = 6;

export const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const rec = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

function missing(data: JsonObject, fields: readonly string[]): string[] {
  return fields
    .filter((f) => !str(data[f]))
    .map((f) => `"${f}" is missing or empty`);
}

const CONCEPT_FIELDS = [
  "title",
  "conflictDomain",
  "publicFace",
  "signature",
  "coreConcept",
  "trueNature",
  "ultimateGoal",
  "whyNow",
  "motivation",
  "fatalFlaw",
  "methods",
  "resources",
] as const;

/** Stage 1: concept, goal and flaw. */
export function checkVillainConcept(
  data: JsonObject,
  avoid: string[],
  campaignContext?: string,
): DraftCheck {
  const hard = missing(data, CONCEPT_FIELDS);
  const signs = list(data.firstSigns).filter((s) => str(s)).length;
  if (signs < 2 || signs > MAX_LISTED) {
    hard.push(`"firstSigns" needs 2 to ${MAX_LISTED} concrete clues`);
  }
  addBannedNameFindings([str(data.title)], avoid, hard);
  const soft: string[] = [];
  const flaw = genericFlawProblem(str(data.fatalFlaw));
  if (flaw) soft.push(flaw);
  soft.push(...overusedNameProblems([str(data.title)]));
  const domain = str(data.conflictDomain).toLowerCase();
  const repeated = OVERUSED_DOMAINS.find((d) => domain.includes(d));
  if (repeated && !campaignContext?.toLowerCase().includes(repeated)) {
    soft.push(
      `conflictDomain "${str(data.conflictDomain)}" is one of the domains villains keep landing in. Choose a different dominant domain.`,
    );
  }
  return { hard, soft };
}

const LIEUTENANT_FIELDS = [
  "name",
  "role",
  "relationship",
  "motivation",
  "loyalty",
  "secret",
] as const;

/** Stage 2: organisation and inner circle. */
export function checkVillainOrganisation(
  data: JsonObject,
  axes: VillainAxes,
  avoid: string[],
): DraftCheck {
  const hard = missing(data, ["organisation", "territory"]);
  const lieutenants = list(data.lieutenants).map(rec);
  const expected = axes.lieutenants.length;
  if (lieutenants.length !== expected) {
    hard.push(
      `give exactly ${expected} lieutenants, one per assigned slot (you gave ${lieutenants.length})`,
    );
  }
  lieutenants.forEach((l, i) => {
    for (const f of LIEUTENANT_FIELDS) {
      if (!str(l[f])) hard.push(`lieutenant ${i + 1} has no "${f}"`);
    }
  });
  const names = lieutenants.map((l) => str(l.name));
  if (new Set(names.map((n) => n.toLowerCase())).size < names.length) {
    hard.push("two lieutenants share a name");
  }
  addBannedNameFindings(names, avoid, hard);
  const soft = [
    ...overusedNameProblems(names),
    ...sharedSurnameFindings(
      lieutenants.map((l) => ({
        name: str(l.name),
        relationship: `${str(l.relationship)} ${str(l.role)}`,
      })),
    ),
  ];
  const template = lieutenantTemplateProblem(
    lieutenants.map((l) => str(l.role)),
  );
  if (template) soft.push(template);
  return { hard, soft };
}

const STAGE_FIELDS = [
  "name",
  "objective",
  "actions",
  "clues",
  "consequences",
  "interference",
  "disruption",
] as const;

/** Stage 3: the plan and its dependency chain. */
export function checkVillainPlan(data: JsonObject): DraftCheck {
  const hard: string[] = [];
  const stages = list(data.stages).map(rec);
  if (stages.length < 5 || stages.length > 7) {
    hard.push(`give 5 to 7 plan stages (you gave ${stages.length})`);
  }
  stages.forEach((s, i) => {
    for (const f of STAGE_FIELDS) {
      if (!str(s[f])) hard.push(`stage ${i + 1} has no "${f}"`);
    }
  });
  hard.push(...missing(data, ["escalation"]));
  const discovery = rec(data.discovery);
  for (const f of ["world", "servants", "gmOnly"]) {
    if (!str(discovery[f])) hard.push(`discovery "${f}" is missing or empty`);
  }
  const hooks = list(data.personalConnections).filter((c) => str(c)).length;
  if (hooks < 2 || hooks > MAX_LISTED) {
    hard.push(`"personalConnections" needs 2 to ${MAX_LISTED} hooks`);
  }
  const chain = list(data.dependencyChain).map(str).filter(Boolean);
  return { hard, soft: dependencyChainProblems(chain, stages.length) };
}

/** Stage 4: weakness, moral complication and finale. */
export function checkVillainEnding(data: JsonObject): DraftCheck {
  const hard = missing(data, [
    "weakness",
    "moralComplication",
    "finalConfrontation",
    "ifDefeated",
  ]);
  const soft = [
    masterObjectProblem(str(data.weakness)),
    powerVacuumProblem(str(data.moralComplication)),
  ].filter((p): p is string => p !== null);
  return { hard, soft };
}

const stageText = (stage: JsonObject): string =>
  STAGE_FIELDS.map((f) => str(stage[f])).join(" ");

/**
 * Whether sections that should talk about the same thing do. This tests for a
 * shared distinctive word, so it can only say two passages look unrelated, not
 * that they agree. Findings go to the review and repair, never block a result.
 */
export function villainCoherenceFindings(
  drafts: VillainDrafts,
): VillainFinding[] {
  const { concept, organisation, plan, ending } = drafts;
  const stages = list(plan.stages).map(rec);
  const last = stages[stages.length - 1] ?? {};
  const allStages = stages.map(stageText).join(" ");
  const found: VillainFinding[] = [];
  const unrelated = (
    field: RepairableField,
    a: string,
    b: string,
    what: string,
  ) => {
    if (a && b && !sharesTerm(a, b)) found.push({ field, problem: what });
  };
  unrelated(
    "ultimateGoal",
    str(concept.ultimateGoal),
    stageText(last),
    "The ultimate goal and the final plan stage do not describe the same end state.",
  );
  unrelated(
    "whyNow",
    str(concept.whyNow),
    `${allStages} ${str(concept.ultimateGoal)}`,
    "Why Now does not connect to the plan or the goal.",
  );
  unrelated(
    "finalConfrontation",
    str(ending.finalConfrontation),
    `${str(organisation.territory)} ${stageText(last)} ${str(plan.escalation)}`,
    "The final confrontation does not match the place or sequence the plan sets up.",
  );
  unrelated(
    "weakness",
    str(ending.weakness),
    `${str(concept.fatalFlaw)} ${str(organisation.organisation)} ${str(concept.methods)}`,
    "The weakness does not follow from the flaw, the organisation or the methods.",
  );
  unrelated(
    "moralComplication",
    str(ending.moralComplication),
    `${str(concept.ultimateGoal)} ${str(concept.motivation)} ${str(organisation.organisation)}`,
    "The moral complication does not follow from the villain's goal or organisation.",
  );
  const flaw = genericFlawProblem(str(concept.fatalFlaw));
  if (flaw) found.push({ field: "fatalFlaw", problem: flaw });
  const vacuum = powerVacuumProblem(str(ending.moralComplication));
  if (vacuum) found.push({ field: "moralComplication", problem: vacuum });
  const master = masterObjectProblem(str(ending.weakness));
  if (master) found.push({ field: "weakness", problem: master });
  return found;
}

/** The fields a repair may rewrite and where each lives. */
export function isRepairableField(field: string): field is RepairableField {
  return Object.hasOwn(REPAIRABLE_FIELDS, field);
}

const tag = (label: string, text: string): string => `**${label}.** ${text}`;

function lieutenantLine(
  l: JsonObject,
  slot: VillainAxes["lieutenants"][number],
): string {
  return `- **${str(l.name)}** — ${str(l.role)}. Relationship: ${str(l.relationship)} Motivation: ${str(l.motivation)} Loyalty: ${str(l.loyalty)} Secret or agenda: ${str(l.secret)} Awareness: ${slot.awareness}.`;
}

function planBlock(plan: JsonObject): string {
  const stages = list(plan.stages)
    .map(rec)
    .map(
      (s, i) =>
        `**Stage ${i + 1}: ${str(s.name)}**\nObjective: ${str(s.objective)}\nActions: ${str(s.actions)}\nClues: ${str(s.clues)}\nIf it succeeds: ${str(s.consequences)}\nPlayer interference: ${str(s.interference)}\nIf disrupted: ${str(s.disruption)}`,
    );
  const chain = list(plan.dependencyChain).map(str).filter(Boolean);
  return [
    chain.length ? `Dependency chain: ${chain.join(" → ")}` : "",
    ...stages,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Assemble the stages into the same JSON shape the one-pass route returns, so
 * `parseVillainResponse` renders both identically. The assigned choices are
 * stated from the plan, not from what the model wrote, so a label can never
 * disagree with the structure the stages were held to.
 */
export function assembleVillain(
  drafts: VillainDrafts,
  axes: VillainAxes,
): JsonObject {
  const { concept, organisation, plan, ending } = drafts;
  const lieutenants = list(organisation.lieutenants).map(rec);
  const discovery = rec(plan.discovery);
  const signs = list(concept.firstSigns).map(str).filter(Boolean);
  const connections = list(plan.personalConnections).map(str).filter(Boolean);
  const content = [
    `### Public Face\n${str(concept.publicFace)}`,
    `### Signature / Calling Card\n${str(concept.signature)}`,
    `### First Signs\n${signs.map((s) => `- ${s}`).join("\n")}`,
  ].join("\n\n");
  const lore = [
    `### Core Concept\n${str(concept.coreConcept)}`,
    `### True Nature\n${str(concept.trueNature)}`,
    `### Ultimate Goal\n${str(concept.ultimateGoal)}`,
    `### Why Now\n${str(concept.whyNow)}`,
    `### Motivation\n${str(concept.motivation)}`,
    `### Fatal Flaw\n${tag(axes.flaw.label, str(concept.fatalFlaw))}`,
    `### Methods\n${str(concept.methods)}`,
    `### Resources\n${str(concept.resources)}`,
    `### Lieutenants & Inner Circle\n${lieutenants.map((l, i) => lieutenantLine(l, axes.lieutenants[i] ?? axes.lieutenants[0])).join("\n")}`,
    `### Organisation & Power Structure\n${tag(axes.organisation.label, str(organisation.organisation))}`,
    `### Territory / Lair\n${str(organisation.territory)}`,
    `### The Villain's Plan\n${planBlock(plan)}`,
    `### Escalation If Ignored\n${str(plan.escalation)}`,
    `### Discovery Layers\n**What the World Knows**: ${str(discovery.world)}\n**What Their Servants Know**: ${str(discovery.servants)}\n**GM-Only Truth**: ${str(discovery.gmOnly)}`,
    `### Personal Connections\n${connections.map((c) => `- ${c}`).join("\n")}`,
    `### Weakness / Vulnerability\n${tag(axes.vulnerability.label, str(ending.weakness))}`,
    `### Moral Complication\n${tag(axes.complication.label, str(ending.moralComplication))}`,
    `### Final Confrontation\n${str(ending.finalConfrontation)}`,
    `### If Defeated\n${str(ending.ifDefeated)}`,
  ].join("\n\n");
  return {
    title: str(concept.title),
    conflictDomain: str(concept.conflictDomain),
    content,
    lore,
    labels: ["villain", "bbeg-generator", "imported-draft"],
  };
}
