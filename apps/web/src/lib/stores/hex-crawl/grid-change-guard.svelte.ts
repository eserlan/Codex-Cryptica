export interface GridChangeConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface GridChangeGuardDeps {
  confirm: (options: GridChangeConfirmOptions) => Promise<boolean>;
  getRecordCount: (mapId: string) => number;
}

interface GuardSession {
  mapId: string;
  answer: Promise<boolean> | null;
}

/**
 * Asks before a grid change would leave hex records on different hexes
 * (FR-039). The question is asked at most once per session, and its answer is
 * kept for the rest of that session. Without hex records nothing is asked.
 */
export class GridChangeGuard {
  private session: GuardSession | null = null;

  constructor(private readonly deps: GridChangeGuardDeps) {}

  /** Call when the grid settings or fit mode opens. */
  beginSession(mapId: string): void {
    this.session = { mapId, answer: null };
  }

  /** Call when the grid settings or fit mode closes. */
  endSession(): void {
    this.session = null;
  }

  /** True when the map has hex records, so a grid change would need asking about. */
  hasRecords(mapId: string): boolean {
    return this.deps.getRecordCount(mapId) > 0;
  }

  /** Resolves true when the change may be applied, false when it was cancelled. */
  requestChange(mapId: string): Promise<boolean> {
    const count = this.deps.getRecordCount(mapId);
    if (count <= 0) return Promise.resolve(true);

    const session =
      this.session && this.session.mapId === mapId
        ? this.session
        : { mapId, answer: null };
    if (!session.answer) {
      session.answer = this.deps.confirm({
        title: "Change the grid?",
        message: `This map has ${count} hex records. Changing the grid will leave them on different hexes. Continue?`,
        confirmLabel: "Change grid",
        cancelLabel: "Cancel",
      });
    }
    return session.answer;
  }
}
