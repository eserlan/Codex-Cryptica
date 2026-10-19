/**
 * Final consistency check for staged Adventure Ideas. After the three stages
 * are written, the model reads the whole adventure back and tests five
 * things: antagonist logic, causality, resolution, timeline and player
 * agency. It may revise only the text of fields that break a check it
 * failed; every revision is validated here before it is applied:
 *
 * - it must name a failed check, so passing material is never rewritten;
 * - it targets an existing text field: titles, names, `involves` and the
 *   list lengths stay locked, so nothing new is added;
 * - it may not introduce a proper noun the adventure has not already used,
 *   so the fix cannot invent lore;
 * - only a few revisions are kept, each of bounded length.
 *
 * Invalid revisions are dropped one by one, not the whole reply. The check is
 * a refinement: when it is unusable the adventure is kept as written.
 */

import { extractProperNouns } from "./campaign-context";
import { asArray, asRecord, asString } from "./llm-response-utils";
import { sameName } from "./adventure-name";

type Json = Record<string, unknown>;

export const CONSISTENCY_CHECKS = [
  "antagonist",
  "causality",
  "resolution",
  "timeline",
  "agency",
] as const;

export type ConsistencyCheckId = (typeof CONSISTENCY_CHECKS)[number];

/** Most revisions kept from one check, so it cannot rewrite the adventure. */
export const MAX_REVISIONS = 6;
/** Longest revised text kept. */
export const MAX_REVISION_LENGTH = 700;

const SITUATION_TARGETS = [
  "summary",
  "throughline",
  "initialSituation",
  "primaryObjective",
] as const;

const CONSEQUENCE_TARGETS = [
  "threats",
  "discoveries",
  "complications",
  "rewards",
  "outcomes",
  "hooks",
] as const;

const CAST_TARGETS: Record<"keyLocations" | "npcs", readonly string[]> = {
  keyLocations: ["description", "role", "relation", "leverage", "dilemma"],
  npcs: ["role", "relation", "goal", "secret", "leverage", "dilemma"],
};

/** The three stage outputs the check reads and may revise. */
export interface AdventureParts {
  situation: Json;
  cast: Json;
  consequences: Json;
}

export interface ConsistencyRevision {
  fixes: ConsistencyCheckId;
  target: string;
  text: string;
}

export interface ConsistencyReview {
  /** Checks the model reported as failing. */
  flagged: ConsistencyCheckId[];
  /** Revisions that passed validation, in reply order. */
  revisions: ConsistencyRevision[];
  /** Why each rejected revision was dropped. */
  dropped: string[];
}

const text = (v: unknown): string => asString(v).trim();

/** Where a target string points, or `null` when it is not revisable. */
type Slot =
  | { part: "situation"; field: string }
  | { part: "consequences"; list: string; index: number }
  | {
      part: "cast";
      list: "keyLocations" | "npcs";
      index: number;
      field: string;
    };

function parseTarget(target: string): Slot | null {
  if ((SITUATION_TARGETS as readonly string[]).includes(target)) {
    return { part: "situation", field: target };
  }
  const item = target.match(/^([a-zA-Z]+)\[(\d+)\](?:\.([a-zA-Z]+))?$/);
  if (!item) return null;
  const [, list, rawIndex, field] = item;
  const index = Number(rawIndex);
  if ((CONSEQUENCE_TARGETS as readonly string[]).includes(list) && !field) {
    return { part: "consequences", list, index };
  }
  if (
    (list === "keyLocations" || list === "npcs") &&
    field &&
    CAST_TARGETS[list].includes(field)
  ) {
    return { part: "cast", list, index, field };
  }
  return null;
}

/** The current text at a slot, or `null` when the slot does not exist. */
function readSlot(parts: AdventureParts, slot: Slot): string | null {
  if (slot.part === "situation") return text(parts.situation[slot.field]);
  const source = slot.part === "cast" ? parts.cast : parts.consequences;
  const entries = asArray(source[slot.list]);
  if (slot.index >= entries.length) return null;
  const entry = asRecord(entries[slot.index]);
  return text(slot.part === "cast" ? entry[slot.field] : entry.text);
}

/** Proper nouns the adventure already uses; a revision may only use these. */
export function adventureVocabulary(
  parts: AdventureParts,
  extra: readonly string[] = [],
): string[] {
  return [
    ...extractProperNouns(
      [parts.situation, parts.cast, parts.consequences]
        .map((p) => JSON.stringify(p))
        .join("\n"),
    ),
    ...extra,
  ];
}

function inventedNames(revised: string, vocabulary: readonly string[]) {
  return extractProperNouns(revised).filter(
    (name) => !vocabulary.some((known) => sameName(name, known)),
  );
}

/**
 * Validate the model's reply. Revisions are kept only when they fix a failed
 * check, target an existing text field once, stay within the length limit
 * and introduce no new proper nouns.
 */
export function readConsistencyReview(
  reply: Json,
  parts: AdventureParts,
  vocabulary: readonly string[],
): ConsistencyReview {
  const checks = asRecord(reply.checks);
  const flagged = CONSISTENCY_CHECKS.filter(
    (id) => asRecord(checks[id]).ok === false,
  );
  const revisions: ConsistencyRevision[] = [];
  const dropped: string[] = [];

  for (const raw of asArray(reply.revisions)) {
    const r = asRecord(raw);
    const revision: ConsistencyRevision = {
      fixes: text(r.fixes) as ConsistencyCheckId,
      target: text(r.target),
      text: text(r.text),
    };
    const why = rejection(revision, { parts, vocabulary, flagged, revisions });
    if (why) dropped.push(`${revision.target || "?"}: ${why}`);
    else revisions.push(revision);
  }
  return { flagged, revisions, dropped };
}

interface ReviewContext {
  parts: AdventureParts;
  vocabulary: readonly string[];
  flagged: readonly ConsistencyCheckId[];
  /** Revisions accepted so far. */
  revisions: readonly ConsistencyRevision[];
}

type Rule = (
  revision: ConsistencyRevision,
  ctx: ReviewContext,
) => string | null;

const currentText = (
  { target }: ConsistencyRevision,
  { parts }: ReviewContext,
) => {
  const slot = parseTarget(target);
  return slot ? readSlot(parts, slot) : null;
};

/** Every reason a revision can be dropped, checked in order. */
const RULES: readonly Rule[] = [
  ({ fixes }, { flagged }) =>
    flagged.includes(fixes) ? null : `does not fix a failed check ("${fixes}")`,
  (r, ctx) =>
    currentText(r, ctx) === null ? "is not a revisable field" : null,
  ({ target }, { revisions }) =>
    revisions.some((r) => r.target === target)
      ? "is revised more than once"
      : null,
  (r, ctx) =>
    !r.text || r.text === currentText(r, ctx) ? "is empty or unchanged" : null,
  ({ text: revised }) =>
    revised.length > MAX_REVISION_LENGTH
      ? `is longer than ${MAX_REVISION_LENGTH} characters`
      : null,
  ({ text: revised }, { vocabulary }) => {
    const invented = inventedNames(revised, vocabulary);
    return invented.length > 0
      ? `introduces new names: ${invented.join(", ")}`
      : null;
  },
  (_, { revisions }) =>
    revisions.length >= MAX_REVISIONS
      ? `exceeds the ${MAX_REVISIONS}-revision limit`
      : null,
];

/** Why a revision cannot be applied, or `null` when it can. */
function rejection(
  revision: ConsistencyRevision,
  ctx: ReviewContext,
): string | null {
  for (const rule of RULES) {
    const why = rule(revision, ctx);
    if (why) return why;
  }
  return null;
}

/** A copy of the parts with each validated revision applied in place. */
export function applyConsistencyRevisions(
  parts: AdventureParts,
  revisions: readonly ConsistencyRevision[],
): AdventureParts {
  const next: AdventureParts = structuredClone(parts);
  for (const { target, text: revised } of revisions) {
    const slot = parseTarget(target);
    if (!slot || readSlot(next, slot) === null) continue;
    if (slot.part === "situation") {
      next.situation[slot.field] = revised;
      continue;
    }
    const source = slot.part === "cast" ? next.cast : next.consequences;
    const entries = asArray(source[slot.list]);
    const entry = { ...asRecord(entries[slot.index]) };
    entry[slot.part === "cast" ? slot.field : "text"] = revised;
    entries[slot.index] = entry;
    source[slot.list] = entries;
  }
  return next;
}

/** The user message for the check; the caller adds context and briefing. */
export function consistencyTask(parts: AdventureParts): string {
  return `FINAL CHECK: adventure consistency.

Here is the finished adventure as JSON, in three parts:
${JSON.stringify(parts, null, 2)}

Read it as the GM who has to run it, and test five things:
1. antagonist: Are the antagonist's goals, methods and victory conditions compatible with each other? The antagonist is the main opposing person or faction in the threats and npcs.
2. causality: Does the history explain how the important people and objects (the assets) reached where they are now?
3. resolution: Can every outcome be reached through what the adventure establishes: its places, people, assets, discoveries and leverage?
4. timeline: Can the primary objective plausibly be achieved within its deadline or pressure?
5. agency: Do the discoveries, leverage and dilemmas give the players enough information to make the crucial choices and to find more than one solution?

Only revise material with an identifiable contradiction. Do not rewrite sections that work, do not add new places, people, objects or history, and do not rename anything. Each revision replaces the whole text of one field and must fix a check you marked as failing.

Revisable targets:
- ${SITUATION_TARGETS.join(", ")}
- ${CONSEQUENCE_TARGETS.map((l) => `${l}[i]`).join(", ")} (the entry's text)
- keyLocations[i].${CAST_TARGETS.keyLocations.join("|")}
- npcs[i].${CAST_TARGETS.npcs.join("|")}

Return ONLY a JSON object with exactly these fields:
{
  "checks": {
${CONSISTENCY_CHECKS.map((id) => `    "${id}": { "ok": true, "problem": "the specific contradiction, or empty" }`).join(",\n")}
  },
  "revisions": [
    { "fixes": "one of: ${CONSISTENCY_CHECKS.join(", ")}", "target": "e.g. outcomes[1] or npcs[0].goal", "text": "the full replacement text" }
  ]
}
If every check passes, return an empty "revisions" list.`;
}
