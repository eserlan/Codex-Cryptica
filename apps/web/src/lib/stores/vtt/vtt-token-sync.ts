import type {
  Token,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../../types/vtt";
import { tokenGeometryChanged } from "./vtt-token-updates";

interface TokenSyncDependencies {
  emit: (message: VTTMessage) => void;
  persistDraft: () => void;
  queueSessionSnapshotBroadcast: () => void;
  broadcastSessionSnapshotNow: () => void;
}

interface TokenSyncSession {
  tokens: Record<string, Token>;
  updateToken: (
    id: string,
    updates: TokenStateUpdateInput,
    silent: boolean,
  ) => Token | null;
}

type PendingKind = "move" | "rotation";

function needsCanonicalSnapshot(updates: TokenStateUpdateInput) {
  return (
    updates.ownerPeerId !== undefined ||
    updates.ownerGuestName !== undefined ||
    updates.visibleTo !== undefined ||
    updates.statusEffects !== undefined ||
    updates.isVisionSource !== undefined
  );
}

/** Session publication and acknowledgement timeouts for optimistic token changes. */
export class VTTTokenSync {
  private pending: Record<PendingKind, Map<string, number>> = {
    move: new Map(),
    rotation: new Map(),
  };

  constructor(
    private deps: TokenSyncDependencies,
    private session: TokenSyncSession,
  ) {}

  publish(message: VTTMessage, silent: boolean) {
    if (silent) this.deps.persistDraft();
    else this.deps.emit(message);
  }

  publishUpdate(
    tokenId: string,
    updates: TokenStateUpdateInput,
    silent: boolean,
  ) {
    if (silent) {
      this.deps.persistDraft();
      return;
    }
    // Geometry changes always take the snapshot path, including guest changes.
    if (tokenGeometryChanged(updates)) {
      this.deps.queueSessionSnapshotBroadcast();
      return;
    }
    this.deps.emit({
      type: "TOKEN_STATE_UPDATE",
      tokenId,
      delta: { ...updates, x: undefined, y: undefined },
    });
    // Sensitive deltas are followed by a canonical snapshot to heal drift.
    if (needsCanonicalSnapshot(updates))
      this.deps.broadcastSessionSnapshotNow();
  }

  request(
    kind: PendingKind,
    tokenId: string,
    updates: TokenStateUpdateInput,
    persistent: boolean,
  ) {
    const previous = this.session.tokens[tokenId];
    if (!previous) return null;
    const updated = this.session.updateToken(tokenId, updates, true);
    if (updated && !persistent) this.scheduleRevert(kind, tokenId, previous);
    return updated;
  }

  confirm(kind: PendingKind, tokenId: string) {
    const timeoutId = this.pending[kind].get(tokenId);
    if (timeoutId === undefined) return;
    clearTimeout(timeoutId);
    this.pending[kind].delete(tokenId);
  }

  private scheduleRevert(kind: PendingKind, tokenId: string, previous: Token) {
    this.confirm(kind, tokenId);
    const timeoutId = window.setTimeout(() => {
      if (this.session.tokens[tokenId]) {
        this.session.tokens = {
          ...this.session.tokens,
          [tokenId]: { ...previous },
        };
        this.deps.persistDraft();
      }
      this.pending[kind].delete(tokenId);
    }, 500);
    this.pending[kind].set(tokenId, timeoutId);
  }

  clear() {
    for (const pending of Object.values(this.pending)) {
      for (const timeoutId of pending.values()) clearTimeout(timeoutId);
      pending.clear();
    }
  }
}
