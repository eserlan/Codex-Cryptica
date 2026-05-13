import type {
  InitiativeEntry,
  SessionMode,
  Token,
  VTTMessage,
} from "../../../types/vtt";

export interface VTTInitiativeManagerDependencies {
  emit: (message: VTTMessage) => void;
  getTokens: () => Record<string, Token>;
  getMode: () => SessionMode;
  persistDraft: () => void;
  queueSessionSnapshotBroadcast: () => void;
}

export class VTTInitiativeManager {
  initiativeOrder = $state<string[]>([]);
  initiativeValues = $state<Record<string, number>>({});
  round = $state(1);
  turnIndex = $state(0);

  activeTokenId = $derived(this.initiativeOrder[this.turnIndex] ?? null);

  initiativeEntries = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace chained .map().filter() with an imperative loop.
    // Also, eliminate the O(N^2) this.initiativeOrder.indexOf(tokenId) by using the loop index `i` directly.
    const entries: InitiativeEntry[] = [];
    const len = this.initiativeOrder.length;
    const tokens = this.deps.getTokens();
    const mode = this.deps.getMode();
    for (let i = 0; i < len; i++) {
      const tokenId = this.initiativeOrder[i];
      const token = tokens[tokenId];
      if (!token) continue;
      entries.push({
        tokenId,
        initiativeValue: this.initiativeValues[tokenId] ?? 0,
        hasActed:
          mode === "combat" &&
          this.activeTokenId !== null &&
          this.activeTokenId !== tokenId &&
          this.turnIndex > i,
      });
    }
    return entries;
  });

  constructor(private deps: VTTInitiativeManagerDependencies) {}

  reset() {
    this.initiativeOrder = [];
    this.initiativeValues = {};
    this.round = 1;
    this.turnIndex = 0;
  }

  setSnapshotData(
    initiativeOrder: string[],
    initiativeValues: Record<string, number>,
    round: number,
    turnIndex: number,
  ) {
    this.initiativeOrder = [...initiativeOrder];
    this.initiativeValues = { ...initiativeValues };
    this.round = round;
    this.turnIndex = turnIndex;
  }

  addTokenToInitiativeState(tokenId: string) {
    if (!this.initiativeOrder.includes(tokenId)) {
      this.initiativeOrder = [...this.initiativeOrder, tokenId];
    }
    this.initiativeValues = {
      ...this.initiativeValues,
      [tokenId]: this.initiativeValues[tokenId] ?? 0,
    };
  }

  removeTokenFromInitiativeState(tokenId: string) {
    this.initiativeOrder = this.initiativeOrder.filter((id) => id !== tokenId);
    const nextInitiative = { ...this.initiativeValues };
    delete nextInitiative[tokenId];
    this.initiativeValues = nextInitiative;

    if (this.turnIndex >= this.initiativeOrder.length) {
      this.turnIndex = Math.max(0, this.initiativeOrder.length - 1);
    }
  }

  cloneInitiativeState(sourceTokenId: string, cloneTokenId: string) {
    this.initiativeValues = {
      ...this.initiativeValues,
      [cloneTokenId]: this.initiativeValues[sourceTokenId] ?? 0,
    };
    this.initiativeOrder = [...this.initiativeOrder, cloneTokenId];
    this.initiativeOrder = this.sortInitiativeOrder();
  }

  setInitiativeValue(tokenId: string, initiativeValue: number) {
    if (!this.deps.getTokens()[tokenId]) return;
    const activeTokenId = this.activeTokenId ?? tokenId;
    this.initiativeValues = {
      ...this.initiativeValues,
      [tokenId]: initiativeValue,
    };
    const sorted = this.sortInitiativeOrder();
    this.initiativeOrder = sorted;
    const nextIndex = sorted.indexOf(activeTokenId);
    this.turnIndex = nextIndex >= 0 ? nextIndex : 0;
    this.deps.queueSessionSnapshotBroadcast();
  }

  addToInitiative(tokenId: string) {
    if (
      !this.deps.getTokens()[tokenId] ||
      this.initiativeOrder.includes(tokenId)
    ) {
      return;
    }
    this.initiativeOrder = [...this.initiativeOrder, tokenId];
    this.initiativeValues = {
      ...this.initiativeValues,
      [tokenId]: this.initiativeValues[tokenId] ?? 0,
    };
    this.deps.queueSessionSnapshotBroadcast();
  }

  removeFromInitiative(tokenId: string) {
    this.initiativeOrder = this.initiativeOrder.filter((id) => id !== tokenId);
    if (this.turnIndex >= this.initiativeOrder.length) {
      this.turnIndex = Math.max(0, this.initiativeOrder.length - 1);
    }
    this.deps.queueSessionSnapshotBroadcast();
  }

  reorderInitiative(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.initiativeOrder.length ||
      toIndex >= this.initiativeOrder.length
    ) {
      return;
    }

    const order = [...this.initiativeOrder];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    this.initiativeOrder = order;
    this.turnIndex = Math.min(this.turnIndex, order.length - 1);
    this.deps.queueSessionSnapshotBroadcast();
  }

  sortInitiativeOrder() {
    const tokens = this.deps.getTokens();
    return [...this.initiativeOrder].sort((a, b) => {
      const left = this.initiativeValues[a] ?? 0;
      const right = this.initiativeValues[b] ?? 0;
      if (left !== right) return right - left;
      return (tokens[b]?.zIndex ?? 0) - (tokens[a]?.zIndex ?? 0);
    });
  }

  sortAndPersist() {
    this.initiativeOrder = this.sortInitiativeOrder();
    this.deps.persistDraft();
  }

  advanceTurn() {
    if (this.initiativeOrder.length === 0) return null;
    const nextIndex = this.turnIndex + 1;
    if (nextIndex >= this.initiativeOrder.length) {
      this.turnIndex = 0;
      this.round += 1;
    } else {
      this.turnIndex = nextIndex;
    }

    const activeTokenId = this.activeTokenId;
    this.deps.emit({
      type: "TURN_ADVANCE",
      turnIndex: this.turnIndex,
      round: this.round,
      activeTokenId,
    });
    return activeTokenId;
  }

  canAdvanceTurn(peerId: string | null, isHost = false) {
    if (this.initiativeOrder.length === 0) return false;
    if (isHost) return true;

    const activeTokenId = this.activeTokenId;
    if (!activeTokenId) return false;

    const activeToken = this.deps.getTokens()[activeTokenId];
    if (!activeToken) return false;

    return (
      activeToken.ownerPeerId !== null && activeToken.ownerPeerId === peerId
    );
  }

  handleRemoteTurn(turnIndex: number, round: number) {
    this.turnIndex = turnIndex;
    this.round = round;
    this.deps.persistDraft();
  }
}
