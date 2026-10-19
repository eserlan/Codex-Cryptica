import type {
  DragPreview,
  SessionMode,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../../types/vtt";
import type { Point } from "schema";
import { normalizeToken, nextZIndexInLayer, type MapLayer } from "map-engine";
import { VTTTokenDefaults } from "./vtt-token-defaults";
import { noteCollapseUpdate } from "./vtt-token-notes";
export { NOTE_DEFAULT_COLOR } from "./vtt-token-notes";
import { VTTTokenGeometry, isHexShaped } from "./vtt-token-geometry";
import { updatedToken, moveLinkedTokens } from "./vtt-token-updates";
import { VTTTokenSync } from "./vtt-token-sync";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

export { normalizeToken } from "map-engine";

export interface VTTTokenManagerDependencies {
  emit: (message: VTTMessage) => void;
  getMapStore: () => any;
  getVault: () => any;
  getMode: () => SessionMode;
  persistDraft: () => void;
  getMyPeerId: () => string | null;
  queueSessionSnapshotBroadcast: () => void;
  broadcastSessionSnapshotNow: () => void;
  addTokenToInitiativeState?: (tokenId: string) => void;
  removeTokenFromInitiativeState?: (tokenId: string) => void;
  cloneInitiativeState?: (sourceId: string, cloneId: string) => void;
  isInitiativeOrdered?: (tokenId: string) => boolean;
  getActiveLayer: () => MapLayer;
  isLayerLocked: (layer: MapLayer) => boolean;
}

export class VTTTokenManager {
  tokens = $state<Record<string, Token>>({});
  selection = $state<string | null>(null);
  selectedTokens = $state<Set<string>>(new Set());
  pendingTokenCoords = $state<Point | null>(null);
  pendingNoteCoords = $state<Point | null>(null);
  /** True while the GM has armed the toolbar's note button and is choosing a
   * spot on the map for it. The next left click places the note there. */
  notePlacementArmed = $state(false);
  draggingTokenId = $state<string | null>(null);
  dragPreview = $state<DragPreview | null>(null);

  allTokens = $derived.by(() => Object.values(this.tokens));
  selectedToken = $derived.by(() => {
    if (!this.selection) return null;
    return this.tokens[this.selection] ?? null;
  });

  private geometry: VTTTokenGeometry;
  private defaults: VTTTokenDefaults;
  private sync: VTTTokenSync;

  constructor(
    private deps: VTTTokenManagerDependencies,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {
    this.defaults = new VTTTokenDefaults(
      this.deps,
      () => Object.keys(this.tokens).length,
      this.idGenerator,
    );
    this.geometry = new VTTTokenGeometry(() => this.deps.getMapStore());
    this.sync = new VTTTokenSync(this.deps, this);
  }

  reset() {
    this.tokens = {};
    this.selection = null;
    this.selectedTokens = new Set();
    this.pendingTokenCoords = null;
    this.pendingNoteCoords = null;
    this.notePlacementArmed = false;
    this.draggingTokenId = null;
    this.dragPreview = null;
    this.clearPendingMoves();
  }

  setSnapshotData(
    tokens: Record<string, Token>,
    selection: string | null,
    selectedTokens: Set<string>,
  ) {
    const vault = this.deps.getVault?.();
    const hydratedTokens: Record<string, Token> = {};
    for (const id in tokens) {
      const token = tokens[id];
      if (token.entityId && vault?.entities?.[token.entityId]) {
        const entity = vault.entities[token.entityId];
        hydratedTokens[id] = {
          ...token,
          name: entity.title || token.name,
          noteBody:
            token.kind === "note" && entity.content !== undefined
              ? entity.content
              : token.noteBody,
        };
      } else {
        hydratedTokens[id] = token;
      }
    }
    this.tokens = hydratedTokens;
    this.selection = selection;
    this.selectedTokens = selectedTokens;
  }

  setSelection(tokenId: string | null) {
    if (tokenId && !this.tokens[tokenId]) return;
    this.selection = tokenId;
    this.selectedTokens = new Set(tokenId ? [tokenId] : []);
    this.deps.emit({ type: "TOKEN_SELECT", tokenId });
  }

  setMultiSelection(tokenIds: string[]) {
    this.selectedTokens = new Set(tokenIds);
    // Also set primary selection to first token
    this.selection = tokenIds.length > 0 ? tokenIds[0] : null;
    if (this.selection) {
      this.deps.emit({ type: "TOKEN_SELECT", tokenId: this.selection });
    }
  }

  addToSelection(tokenId: string) {
    if (!this.tokens[tokenId]) return;
    const next = new Set(this.selectedTokens);
    next.add(tokenId);
    this.selectedTokens = next;
    if (!this.selection) this.selection = tokenId;
  }

  removeFromSelection(tokenId: string) {
    const next = new Set(this.selectedTokens);
    next.delete(tokenId);
    this.selectedTokens = next;
    if (this.selection === tokenId) {
      this.selection = next.values().next().value ?? null;
    }
  }

  clearSelection() {
    this.selection = null;
    this.selectedTokens = new Set();
    this.deps.emit({ type: "TOKEN_SELECT", tokenId: null });
  }

  toggleTokenVisibility(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) return;
    const next = token.visibleTo === "all" ? "gm-only" : "all";
    // Guests were sent an empty body while the note was GM-only (see
    // redactGmOnlyNote), so revealing it has to carry the text along.
    if (next === "all" && token.kind === "note") {
      return this.updateToken(tokenId, {
        visibleTo: next,
        noteBody: token.noteBody ?? "",
      });
    }
    return this.updateToken(tokenId, { visibleTo: next });
  }

  toggleNoteCollapsed(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token || token.kind !== "note") return null;
    const updates = noteCollapseUpdate(token, this.deps.getMapStore().gridSize);
    return updates ? this.updateToken(tokenId, updates) : null;
  }

  setVisionSource(tokenId: string, isVisionSource: boolean) {
    const token = this.tokens[tokenId];
    if (!token) return;
    return this.updateToken(tokenId, { isVisionSource });
  }

  isTokenVisible(
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ): boolean {
    const token = this.tokens[tokenId];
    if (!token) return false;
    if (isHost) return true;
    return token.visibleTo !== "gm-only";
  }

  getTokenDefaults(input: TokenCreationInput): Token {
    return this.defaults.getTokenDefaults(input);
  }

  snapTileToHexCell(
    ...args: Parameters<VTTTokenGeometry["snapTileToHexCell"]>
  ) {
    return this.geometry.snapTileToHexCell(...args);
  }

  hexCellKey(...args: Parameters<VTTTokenGeometry["hexCellKey"]>) {
    return this.geometry.hexCellKey(...args);
  }

  clampAndSnapPosition(
    ...args: Parameters<VTTTokenGeometry["clampAndSnapPosition"]>
  ) {
    return this.geometry.clampAndSnapPosition(...args);
  }

  viewportCenterPoint(): Point {
    return this.geometry.viewportCenterPoint();
  }

  addToken(input: TokenCreationInput, silent = false) {
    const token = this.getTokenDefaults(input);
    const snapped =
      (token.kind === "tile"
        ? this.snapTileToHexCell(
            { x: token.x, y: token.y },
            { width: token.width, height: token.height },
          )
        : null) ??
      this.clampAndSnapPosition(
        { x: token.x, y: token.y },
        { width: token.width, height: token.height },
        {
          snapToTheGrid: token.kind !== "note",
          hexShaped: isHexShaped(token.baseShape),
        },
      );
    const positioned = {
      ...token,
      x: snapped.x,
      y: snapped.y,
      width: snapped.width,
      height: snapped.height,
    };
    this.tokens = {
      ...this.tokens,
      [positioned.id]: positioned,
    };
    // Tiles are terrain/room pieces and notes are GM annotations — neither is
    // a combatant, so keep them out of the initiative tracker so the first one
    // placed doesn't inherit the "active turn" accent border from landing at
    // initiativeOrder[0].
    if (positioned.kind !== "tile" && positioned.kind !== "note") {
      this.deps.addTokenToInitiativeState?.(positioned.id);
    }
    if (!silent) {
      this.deps.emit({ type: "TOKEN_ADDED", token: positioned });
    } else {
      this.deps.persistDraft();
    }
    return positioned;
  }

  requestTokenAdd(input: TokenCreationInput) {
    const token = this.getTokenDefaults(input);
    const snapped = this.clampAndSnapPosition(
      { x: token.x, y: token.y },
      { width: token.width, height: token.height },
    );

    this.deps.emit({
      type: "TOKEN_ADD_REQUEST",
      name: token.name,
      entityId: token.entityId,
      x: snapped.x,
      y: snapped.y,
      color: token.color,
    });

    return true;
  }

  updateToken(tokenId: string, updates: TokenStateUpdateInput, silent = false) {
    const current = this.tokens[tokenId];
    if (!current) return null;

    const next = updatedToken(
      tokenId,
      current,
      updates,
      this.tokens,
      this.geometry,
    );
    this.tokens = { ...this.tokens, [tokenId]: next };
    moveLinkedTokens(this.tokens, tokenId, current, next, updates);

    this.sync.publishUpdate(tokenId, updates, silent);
    return next;
  }

  moveToken(tokenId: string, x: number, y: number, silent = false) {
    return this.updateToken(tokenId, { x, y }, silent);
  }

  rotateToken(tokenId: string, rotation: number, silent = false) {
    return this.updateToken(tokenId, { rotation }, silent);
  }

  toggleTokenLock(tokenId: string) {
    const token = this.tokens[tokenId];
    return token ? this.updateToken(tokenId, { locked: !token.locked }) : null;
  }

  bringTokenToFront(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) return null;
    // "Front" is scoped to the token's own layer. Scan directly so this hot
    // interaction does not allocate a filtered array on every invocation.
    let maxZ = -1;
    for (const item of Object.values(this.tokens)) {
      if (item.layer === token.layer && Number.isFinite(item.zIndex)) {
        maxZ = Math.max(maxZ, item.zIndex);
      }
    }
    return this.updateToken(tokenId, { zIndex: maxZ + 1 });
  }

  sendTokenToBack(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) return null;
    let minZ = 0;
    for (const item of Object.values(this.tokens)) {
      if (item.layer === token.layer && Number.isFinite(item.zIndex)) {
        minZ = Math.min(minZ, item.zIndex);
      }
    }
    return this.updateToken(tokenId, { zIndex: minZ - 1 });
  }

  requestTokenMove(tokenId: string, x: number, y: number, persistent = false) {
    return this.sync.request("move", tokenId, { x, y }, persistent);
  }

  confirmTokenMove(tokenId: string) {
    this.sync.confirm("move", tokenId);
  }

  requestTokenRotation(tokenId: string, rotation: number, persistent = false) {
    return this.sync.request("rotation", tokenId, { rotation }, persistent);
  }

  confirmTokenRotation(tokenId: string) {
    this.sync.confirm("rotation", tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    if (!this.tokens[tokenId]) return false;
    this.sync.confirm("move", tokenId);
    const nextTokens = { ...this.tokens };
    delete nextTokens[tokenId];
    for (const key in nextTokens) {
      if (nextTokens[key].parentTokenId === tokenId) {
        nextTokens[key] = {
          ...nextTokens[key],
          parentTokenId: undefined,
        };
      }
    }
    this.tokens = nextTokens;
    this.deps.removeTokenFromInitiativeState?.(tokenId);
    if (this.selection === tokenId) {
      this.selection = null;
    }

    if (!silent) {
      this.deps.emit({ type: "TOKEN_REMOVED", tokenId });
    } else {
      this.deps.persistDraft();
    }
    return true;
  }

  getChildNotes(parentTokenId: string): Token[] {
    const result: Token[] = [];
    for (const key in this.tokens) {
      if (this.tokens[key].parentTokenId === parentTokenId) {
        result.push(this.tokens[key]);
      }
    }
    return result;
  }

  linkTokens(childTokenId: string, parentTokenId: string) {
    if (!this.tokens[childTokenId] || !this.tokens[parentTokenId]) return null;
    return this.updateToken(childTokenId, { parentTokenId });
  }

  unlinkToken(childTokenId: string) {
    if (!this.tokens[childTokenId]) return null;
    return this.updateToken(childTokenId, { parentTokenId: undefined });
  }

  private getClonedTokenName(sourceName: string) {
    const trimmed = sourceName.trim() || "Token";
    const baseName = trimmed.replace(/\s+#\d+$/, "");
    const pattern = new RegExp(
      `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s+#(\\d+))?$`,
    );
    let highest = 1;

    for (const token of this.allTokens) {
      const match = token.name.trim().match(pattern);
      if (!match) continue;
      const suffix = match[1] ? Number(match[1]) : 1;
      if (suffix > highest) {
        highest = suffix;
      }
    }

    return `${baseName} #${highest + 1}`;
  }

  cloneToken(tokenId: string, silent = false) {
    const source = this.tokens[tokenId];
    if (!source) return null;

    const mapStore = this.deps.getMapStore();
    const offset = mapStore.gridSize || 50;
    const sameLayer = this.allTokens.filter(
      (token) => token.layer === source.layer,
    );

    const clone: Token = {
      ...source,
      id: this.idGenerator.uuid(),
      name: this.getClonedTokenName(source.name),
      x: source.x + offset,
      y: source.y + offset,
      zIndex: nextZIndexInLayer(sameLayer),
    };

    this.tokens = {
      ...this.tokens,
      [clone.id]: clone,
    };

    if (this.deps.isInitiativeOrdered?.(tokenId)) {
      this.deps.cloneInitiativeState?.(tokenId, clone.id);
    }
    this.selection = clone.id;

    if (!silent) {
      this.deps.emit({ type: "TOKEN_ADDED", token: clone });
    } else {
      this.deps.persistDraft();
    }

    return clone;
  }

  setTokenOwner(
    tokenId: string,
    ownerPeerId: string | null,
    ownerGuestName: string | null = null,
  ) {
    const token = this.tokens[tokenId];
    if (!token) return null;
    return this.updateToken(tokenId, {
      ownerPeerId,
      ownerGuestName,
      visibleTo: token.visibleTo === "gm-only" ? "gm-only" : "all",
    });
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    let changed = false;
    // ⚡ Bolt Optimization: Replace Object.fromEntries(Object.entries().map()) with imperative loop
    const nextTokens: Record<string, Token> = {};

    for (const tokenId in this.tokens) {
      if (!Object.hasOwn(this.tokens, tokenId)) continue;
      const token = this.tokens[tokenId];
      if (token.ownerGuestName === guestName && token.ownerPeerId !== peerId) {
        changed = true;
        nextTokens[tokenId] = {
          ...token,
          ownerPeerId: peerId,
        };
      } else {
        nextTokens[tokenId] = token;
      }
    }

    if (!changed) return false;
    this.tokens = nextTokens;
    this.deps.broadcastSessionSnapshotNow();
    return true;
  }

  clearGuestOwnership(peerId: string) {
    let changed = false;
    // ⚡ Bolt Optimization: Replace Object.fromEntries(Object.entries().map()) with imperative loop
    const nextTokens: Record<string, Token> = {};

    for (const tokenId in this.tokens) {
      if (!Object.hasOwn(this.tokens, tokenId)) continue;
      const token = this.tokens[tokenId];
      if (token.ownerPeerId === peerId) {
        changed = true;
        nextTokens[tokenId] = {
          ...token,
          ownerPeerId: null,
        };
      } else {
        nextTokens[tokenId] = token;
      }
    }

    if (!changed) return false;
    this.tokens = nextTokens;
    this.deps.broadcastSessionSnapshotNow();
    return true;
  }

  canMoveToken(tokenId: string, peerId: string | null, isHost = false) {
    const token = this.tokens[tokenId];
    if (!token) return false;
    if (token.locked) return false;
    if (token.layer && this.deps.isLayerLocked(token.layer)) return false;
    if (isHost) return true;
    return token.ownerPeerId !== null && token.ownerPeerId === peerId;
  }

  canViewToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.isTokenVisible(tokenId, peerId, isHost);
  }

  handleRemoteTokenAdded(token: Token) {
    this.tokens = { ...this.tokens, [token.id]: normalizeToken(token) };
    this.deps.addTokenToInitiativeState?.(token.id);
    this.deps.persistDraft();
  }

  handleRemoteTokenUpdate(tokenId: string, delta: TokenStateUpdateInput) {
    // Skip position updates for the token currently being dragged locally
    // to prevent stale network echoes from snapping the token backward
    if (
      this.draggingTokenId === tokenId &&
      (delta.x !== undefined || delta.y !== undefined)
    ) {
      return;
    }

    this.sync.confirm("move", tokenId);
    if (delta.rotation !== undefined) {
      this.sync.confirm("rotation", tokenId);
    }
    this.updateToken(tokenId, delta, true);
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.sync.confirm("move", tokenId);
    this.removeToken(tokenId, true);
  }

  clearPendingMoves() {
    this.sync.clear();
  }
}
