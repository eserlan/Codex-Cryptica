import { milestoneMatches } from "./categories";
import type {
  JourneyDefinition,
  JourneyProgress,
  Milestone,
  MilestoneContext,
  StepDefinition,
  StepId,
} from "./types";

/**
 * The pure journey reducer. Every function returns the same reference when
 * nothing changes, and none of them touches the vault: Back, Skip and Exit
 * only move what the card shows.
 */

export function startJourney(
  def: JourneyDefinition,
  now: number,
): JourneyProgress {
  return {
    schema: 1,
    journeyId: def.id,
    journeyVersion: def.version,
    startedAt: now,
    completed: [],
    skipped: [],
    viewing: null,
    outcome: "running",
  };
}

export function stepState(
  p: JourneyProgress,
  id: StepId,
): "done" | "skipped" | "open" {
  if (p.completed.includes(id)) return "done";
  if (p.skipped.includes(id)) return "skipped";
  return "open";
}

function firstOpenIndex(p: JourneyProgress, def: JourneyDefinition): number {
  return def.steps.findIndex((s) => stepState(p, s.id) === "open");
}

/** Marks the journey finished when no open step is left. */
function settle(p: JourneyProgress, def: JourneyDefinition): JourneyProgress {
  if (p.outcome === "running" && firstOpenIndex(p, def) === -1) {
    return { ...p, outcome: "finished", viewing: null };
  }
  return p;
}

function displayedIndex(p: JourneyProgress, def: JourneyDefinition): number {
  if (p.viewing !== null) {
    const i = def.steps.findIndex((s) => s.id === p.viewing);
    if (i !== -1) return i;
  }
  return firstOpenIndex(p, def);
}

/** The step on the card: the one Back moved to, else the first not done. */
export function currentStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): StepDefinition | null {
  if (p.outcome === "finished") return null;
  return def.steps[displayedIndex(p, def)] ?? null;
}

/** Zero-based index of the step on the card; `total` once finished. */
export function stepPosition(
  p: JourneyProgress,
  def: JourneyDefinition,
): { index: number; total: number } {
  const total = def.steps.length;
  const i = p.outcome === "finished" ? -1 : displayedIndex(p, def);
  return { index: i === -1 ? total : i, total };
}

/**
 * Completes every open step whose milestone this is. Eligibility (`after`) is
 * judged on the state before the milestone, so one milestone never completes
 * a step and a step that depends on it.
 */
export function applyMilestone(
  p: JourneyProgress,
  def: JourneyDefinition,
  m: Milestone,
  ctx: MilestoneContext,
): JourneyProgress {
  if (p.outcome !== "running" || m.at < p.startedAt) return p;
  const done = new Set(p.completed);
  const newly = def.steps.filter(
    (s) =>
      !done.has(s.id) &&
      (s.after ?? []).every((id) => done.has(id)) &&
      milestoneMatches(s.completeOn, m, ctx),
  );
  if (!newly.length) return p;
  const ids = new Set(newly.map((s) => s.id));
  return settle(
    {
      ...p,
      completed: [...p.completed, ...ids],
      skipped: p.skipped.filter((id) => !ids.has(id)),
      viewing: null,
    },
    def,
  );
}

/** Skips the step on the card. Does nothing on a step already done or skipped. */
export function skipStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): JourneyProgress {
  if (p.outcome !== "running") return p;
  const step = currentStep(p, def);
  if (!step || stepState(p, step.id) !== "open") return p;
  return settle({ ...p, skipped: [...p.skipped, step.id], viewing: null }, def);
}

/** Shows the step before the one on the card, in journey order. */
export function backStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): JourneyProgress {
  if (p.outcome !== "running") return p;
  const i = displayedIndex(p, def);
  if (i <= 0) return p;
  return { ...p, viewing: def.steps[i - 1]!.id };
}

/** Back to the first step not yet done. */
export function returnToCurrent(p: JourneyProgress): JourneyProgress {
  return p.viewing === null ? p : { ...p, viewing: null };
}

export function exitJourney(p: JourneyProgress): JourneyProgress {
  if (p.outcome !== "running") return p;
  return { ...p, outcome: "exited", viewing: null };
}

/** Exited → running again, keeping what was done or skipped. */
export function resumeJourney(p: JourneyProgress): JourneyProgress {
  if (p.outcome !== "exited") return p;
  return { ...p, outcome: "running", viewing: null };
}
