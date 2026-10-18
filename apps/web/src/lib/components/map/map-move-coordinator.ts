import type { Token } from "../../../types/vtt";

export interface MapMoveCoordinatorDeps {
  completeObservedMove: (tokens: readonly Token[]) => Promise<void>;
  getScope?: () => string | null;
}

export interface JourneyMoveCompletion {
  complete: (before: Token, after: Token) => Promise<void>;
  move: () => Promise<Token | null>;
}

export type JourneyMoveResult =
  | { ok: true; before: Token; after: Token }
  | { ok: false; reason: "busy" | "move-refused" | "position-unchanged" };

/** Serializes observed map movement and owns exactly one journey completion. */
export class MapMoveCoordinator {
  private readonly lastSettled = new Map<string, string>();
  private readonly journeyTokens = new Set<string>();
  private completionQueue: Promise<void> = Promise.resolve();
  private lastScope: string | null | undefined;

  constructor(private readonly deps: MapMoveCoordinatorDeps) {}

  /** Collapse duplicate drag/effect notifications for the same settled pose. */
  settleObserved(tokens: readonly Token[]): Promise<void> {
    this.syncScope();
    const scope = this.deps.getScope?.();
    const settled: Token[] = [];
    for (const token of tokens) {
      if (token.isVisionSource !== true || this.journeyTokens.has(token.id))
        continue;
      const pose = poseOf(token);
      if (this.lastSettled.get(token.id) === pose) continue;
      this.lastSettled.set(token.id, pose);
      // Snapshot at the event boundary: token managers commonly mutate the
      // same reactive object before queued completion work is drained.
      settled.push({ ...token });
    }
    if (settled.length === 0) return Promise.resolve();
    return this.enqueue(async () => {
      if (this.deps.getScope && this.deps.getScope() !== scope) return;
      await this.deps.completeObservedMove(settled);
    });
  }

  /**
   * Own completion before movement starts. Reactive notifications for this
   * token are ignored until the explicit before/after completion has finished.
   */
  async moveJourneyStep(
    tokenId: string,
    before: Token,
    { move, complete }: JourneyMoveCompletion,
  ): Promise<JourneyMoveResult> {
    this.syncScope();
    if (this.journeyTokens.has(tokenId)) return { ok: false, reason: "busy" };
    const scope = this.deps.getScope?.();
    const beforeSnapshot = { ...before };
    this.journeyTokens.add(tokenId);
    try {
      const after = await move();
      if (!after) return { ok: false, reason: "move-refused" };
      if (poseOf(beforeSnapshot) === poseOf(after))
        return { ok: false, reason: "position-unchanged" };

      const afterSnapshot = { ...after };
      this.lastSettled.set(tokenId, poseOf(afterSnapshot));
      await this.enqueue(async () => {
        if (this.deps.getScope && this.deps.getScope() !== scope) return;
        await complete(beforeSnapshot, afterSnapshot);
      });
      return { ok: true, before: beforeSnapshot, after: afterSnapshot };
    } finally {
      this.journeyTokens.delete(tokenId);
    }
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const queued = this.completionQueue.then(task);
    this.completionQueue = queued.catch(() => {});
    return queued;
  }

  private syncScope(): void {
    if (!this.deps.getScope) return;
    const scope = this.deps.getScope();
    if (scope === this.lastScope) return;
    this.lastSettled.clear();
    this.lastScope = scope;
  }
}

function poseOf(token: Token): string {
  return `${token.x},${token.y},${token.width},${token.height}`;
}
