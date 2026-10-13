import { HELP_AREAS, type HelpArea } from "help-engine";
import { z } from "zod";
import { journeyForGoal } from "./journeys";
import type { Goal } from "./types";

/** A fixed, reviewed "Cif has a tip" suggestion (spec 176, FR-016, FR-020). */
export interface Tip {
  id: string;
  goal: Goal;
  area: HelpArea;
  featureId: string;
  /** Chip text: plain language, at most 60 characters, never built from the vault. */
  label: string;
  /** Sent to Cif only when the person taps the chip. Must be a verified quick prompt. */
  prompt: string;
}

export const TIP_LABEL_MAX = 60;

/**
 * Three tips per goal. Every prompt is a verified quick prompt for its area and
 * every feature id is in FEATURE_REGISTRY; the catalogue test enforces both.
 */
export const TIP_CATALOGUE: readonly Tip[] = [
  {
    id: "world-generate-faction",
    goal: "world",
    area: "generators",
    featureId: "campaign-generator",
    label: "Generate a faction for your world",
    prompt: "How do I generate a faction?",
  },
  {
    id: "world-pin-map",
    goal: "world",
    area: "map",
    featureId: "vtt-map",
    label: "Drop a pin on a map",
    prompt: "How do I drop a pin on the map?",
  },
  {
    id: "world-explore-graph",
    goal: "world",
    area: "graph",
    featureId: "graph-view",
    label: "See how your entries relate",
    prompt: "How do I explore how my entries relate on the graph?",
  },
  {
    id: "story-character-canvas",
    goal: "story",
    area: "canvas",
    featureId: "canvas",
    label: "Put a character on a canvas",
    prompt: "How do I put a character on the canvas?",
  },
  {
    id: "story-graph-purpose",
    goal: "story",
    area: "graph",
    featureId: "graph-view",
    label: "What is the graph for?",
    prompt: "What is the graph for?",
  },
  {
    id: "story-roll-table",
    goal: "story",
    area: "tables",
    featureId: "tables",
    label: "Roll on a random table",
    prompt: "How do I roll on a random table?",
  },
  {
    id: "campaign-hide-map",
    goal: "campaign",
    area: "map",
    featureId: "vtt-map",
    label: "Hide parts of a map from players",
    prompt: "How do I hide parts of the map from my players?",
  },
  {
    id: "campaign-roll-table",
    goal: "campaign",
    area: "tables",
    featureId: "tables",
    label: "Roll on a random table",
    prompt: "How do I roll on a random table?",
  },
  {
    id: "campaign-generator-or-oracle",
    goal: "campaign",
    area: "generators",
    featureId: "campaign-generator",
    label: "Generator or Oracle for an NPC?",
    prompt: "Should I use a generator or the Oracle to make a new NPC?",
  },
];

/** Blockers that stop a tip from showing (FR-014). */
export interface TipBlockers {
  typing: boolean;
  dialogOpen: boolean;
  tourActive: boolean;
  journeyOrInvitationActive: boolean;
  cifOpen: boolean;
}

export type GoalInvitationAnswer = "goal" | "explore" | "dismissed";

export interface TipDecisionInput {
  record: TipsRecord;
  aiAvailable: boolean;
  goal: Goal | null;
  goalInvitation: GoalInvitationAnswer | null;
  setupEnded: boolean;
  area: HelpArea;
  /** The session marker is present: a tip already showed in this session (FR-008). */
  shownThisSession: boolean;
  blockers: TipBlockers;
  /** Areas whose feature is not offered in the current context (FR-013). */
  unavailableAreas: readonly HelpArea[];
}

export type NoTipReason =
  | "disabled"
  | "ai-unavailable"
  | "no-goal"
  | "setup-not-ended"
  | "session-limit"
  | "blocked"
  | "area-silenced"
  | "feature-unavailable"
  | "no-eligible-tip";

export type TipDecision =
  { kind: "show"; tip: Tip } | { kind: "none"; reason: NoTipReason };

/** Threshold of dismissals on one screen before it is silenced (FR-023). */
export const SILENCE_AFTER_DISMISSALS = 2;

const TipsRecordSchema = z.object({
  schema: z.literal(1),
  enabled: z.boolean(),
  optInAsked: z.boolean(),
  dismissed: z.array(z.string()),
  acted: z.array(z.string()),
  dismissCounts: z.record(z.string(), z.number().int().nonnegative()),
  silencedAreas: z.array(z.string()),
});

export type TipsRecord = z.infer<typeof TipsRecordSchema>;

export function emptyTipsRecord(): TipsRecord {
  return {
    schema: 1,
    enabled: false,
    optInAsked: false,
    dismissed: [],
    acted: [],
    dismissCounts: {},
    silencedAreas: [],
  };
}

const KNOWN_TIP_IDS = new Set(TIP_CATALOGUE.map((t) => t.id));
const KNOWN_AREAS = new Set<string>(HELP_AREAS);

/** Keeps only what this build understands; never throws (FR-031). */
export function parseTipsRecord(raw: string | null): TipsRecord {
  if (raw === null) return emptyTipsRecord();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyTipsRecord();
  }
  const parsed = TipsRecordSchema.safeParse(json);
  if (!parsed.success) return emptyTipsRecord();
  const r = parsed.data;
  const counts: Record<string, number> = {};
  for (const [area, n] of Object.entries(r.dismissCounts)) {
    if (KNOWN_AREAS.has(area) && n > 0) counts[area] = n;
  }
  return {
    schema: 1,
    enabled: r.enabled,
    optInAsked: r.optInAsked,
    dismissed: unique(r.dismissed.filter((id) => KNOWN_TIP_IDS.has(id))),
    acted: unique(r.acted.filter((id) => KNOWN_TIP_IDS.has(id))),
    dismissCounts: counts as TipsRecord["dismissCounts"],
    silencedAreas: unique(
      r.silencedAreas.filter((a) => KNOWN_AREAS.has(a)),
    ) as TipsRecord["silencedAreas"],
  };
}

export function serializeTipsRecord(record: TipsRecord): string {
  return JSON.stringify(record);
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** Turning tips on again starts silence and dismissal counts afresh (FR-023). */
export function setTipsEnabled(record: TipsRecord, on: boolean): TipsRecord {
  if (on === record.enabled) return record;
  if (!on) return { ...record, enabled: false };
  return { ...record, enabled: true, dismissCounts: {}, silencedAreas: [] };
}

export function markOptInAsked(record: TipsRecord): TipsRecord {
  return record.optInAsked ? record : { ...record, optInAsked: true };
}

/**
 * Turns the chosen tip off for good on this device. A dismissed tip never
 * returns (FR-022); a screen dismissed twice goes silent (FR-023).
 */
export function dismissTip(record: TipsRecord, tip: Tip): TipsRecord {
  if (record.dismissed.includes(tip.id)) return record;
  const count = (record.dismissCounts[tip.area] ?? 0) + 1;
  const silenced = count >= SILENCE_AFTER_DISMISSALS;
  return {
    ...record,
    dismissed: [...record.dismissed, tip.id],
    dismissCounts: { ...record.dismissCounts, [tip.area]: count },
    silencedAreas: silenced
      ? unique([...record.silencedAreas, tip.area])
      : record.silencedAreas,
  };
}

export function actOnTip(record: TipsRecord, tip: Tip): TipsRecord {
  if (record.acted.includes(tip.id)) return record;
  return { ...record, acted: [...record.acted, tip.id] };
}

function isBlocked(blockers: TipBlockers): boolean {
  return Object.values(blockers).some(Boolean);
}

/**
 * The one decision: whether a tip may show now, and which. Pure: it reads
 * nothing but its input (research D2). Reasons are checked in this order.
 */
export function decideTip(input: TipDecisionInput): TipDecision {
  const { record } = input;
  if (!record.enabled) return none("disabled");
  if (!input.aiAvailable) return none("ai-unavailable");
  if (input.goal === null || input.goalInvitation !== "goal") {
    return none("no-goal");
  }
  if (!input.setupEnded) return none("setup-not-ended");
  if (input.shownThisSession) return none("session-limit");
  if (isBlocked(input.blockers)) return none("blocked");
  if (record.silencedAreas.includes(input.area)) return none("area-silenced");
  if (input.unavailableAreas.includes(input.area)) {
    return none("feature-unavailable");
  }

  // A tip never suggests the screen the journey already ends on (research D8).
  const finish = finishArea(input.goal);
  const tip = TIP_CATALOGUE.find(
    (t) =>
      t.goal === input.goal &&
      t.area === input.area &&
      t.area !== finish &&
      !record.dismissed.includes(t.id) &&
      !record.acted.includes(t.id),
  );
  return tip ? { kind: "show", tip } : none("no-eligible-tip");
}

/**
 * The screen a goal's guided setup ends on, from its journey definition: a
 * navigate step names the destination, and the canvas help topic is the canvas.
 */
export function finishArea(goal: Goal): HelpArea | null {
  const next = journeyForGoal(goal).finish.next;
  if (!next) return null;
  if (next.type === "navigate") {
    return (HELP_AREAS as readonly string[]).includes(next.to)
      ? (next.to as HelpArea)
      : null;
  }
  if (next.type === "openHelp" && next.helpId === "spatial-canvas") {
    return "canvas";
  }
  return null;
}

function none(reason: NoTipReason): TipDecision {
  return { kind: "none", reason };
}
