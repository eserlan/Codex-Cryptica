export type StagedStepStatus =
  "pending" | "active" | "done" | "fallback" | "skipped";

/** Every step id a staged generator can report to the page. */
export type StagedStepId =
  // One-shot stages (one-shot-staged.ts); point crawl reuses three of them.
  | "core"
  | "structure"
  | "finale"
  | "scenes"
  | "npcs"
  | "review"
  // Dungeon & Delve stages (dungeon-staged.ts).
  | "foundation"
  | "sectors"
  | "factions"
  | "coherence"
  // Adventure Idea stages (adventure-staged.ts).
  | "situation"
  | "cast"
  | "consequences"
  // Council Vote stages (public-council-vote.ts); reuses "foundation".
  | "paths"
  // Heist stages (heist-staged.ts); reuses "coherence".
  | "objective"
  | "security"
  | "response"
  // Business stages (business-staged.ts).
  | "identity"
  | "connections"
  | "trouble";

export interface StagedProgressStep {
  id: StagedStepId;
  label: string;
  status: StagedStepStatus;
  /** e.g. "3 of 5" while scenes are being written. */
  detail?: string;
}

/** Detail shown while a step retries with its problems named. */
export const FIXING_DETAIL = "fixing problems";
/** Detail shown when a step gives up and the caller writes it in one pass. */
export const ONE_PASS_DETAIL = "writing it in one pass instead";

/**
 * The live step list a staged generator reports to the page. Emits a copy of
 * every step on each change, starting with all of them pending.
 */
export class StagedProgress<Id extends StagedStepId> {
  private steps: StagedProgressStep[];

  constructor(
    steps: ReadonlyArray<{ id: Id; label: string }>,
    private emit?: (steps: StagedProgressStep[]) => void,
  ) {
    this.steps = steps.map(({ id, label }) => ({
      id,
      label,
      status: "pending",
    }));
    this.publish();
  }

  set(id: Id, status: StagedStepStatus, detail?: string): void {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status, detail } : s,
    );
    this.publish();
  }

  /** `id` gave up: mark it as fallen back and every pending step as skipped. */
  abandon(id: Id, detail: string): void {
    this.steps = this.steps.map((s) => {
      if (s.id === id) return { ...s, status: "fallback", detail };
      if (s.status === "pending") {
        return { ...s, status: "skipped", detail: undefined };
      }
      return s;
    });
    this.publish();
  }

  private publish(): void {
    this.emit?.(this.steps.map((s) => ({ ...s })));
  }
}
