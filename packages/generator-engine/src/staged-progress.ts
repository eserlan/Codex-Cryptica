import type { OneShotProgressStep, OneShotStepStatus } from "./one-shot-staged";

/**
 * The live step list a staged generator reports to the page. Emits a copy of
 * every step on each change, starting with all of them pending.
 */
export class StagedProgress<Id extends OneShotProgressStep["id"]> {
  private steps: OneShotProgressStep[];

  constructor(
    steps: ReadonlyArray<{ id: Id; label: string }>,
    private emit?: (steps: OneShotProgressStep[]) => void,
  ) {
    this.steps = steps.map(({ id, label }) => ({
      id,
      label,
      status: "pending",
    }));
    this.publish();
  }

  set(id: Id, status: OneShotStepStatus, detail?: string): void {
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
