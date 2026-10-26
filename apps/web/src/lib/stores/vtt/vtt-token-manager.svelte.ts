import type {
  DragPreview,
  SessionMode,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../../types/vtt";
import type { Point } from "schema";
import { normalizeToken, type MapLayer } from "map-engine";
import { VTTTokenDefaults } from "./vtt-token-defaults";
import { noteCollapseUpdate } from "./vtt-token-notes";
export { NOTE_DEFAULT_COLOR } from "./vtt-token-notes";
import { VTTTokenGeometry } from "./vtt-token-geometry";
import {
  hydrateTokenRecords,
  cloneTokenRecord,
  removeTokenRecord,
  childTokenNotes,
  layerEdgeZIndex,
} from "./vtt-token-records";
import { updatedToken, moveLinkedTokens } from "./vtt-token-updates";
import { VTTTokenOwnership } from "./vtt-token-ownership";
import { VTTTokenSelection } from "./vtt-token-selection";
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
  private ownership: VTTTokenOwnership;
  private tokenSelection: VTTTokenSelection;

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
    this.ownership = new VTTTokenOwnership(this.deps, this);
    this.tokenSelection = new VTTTokenSelection(this, (message) =>
      this.deps.emit(message),
    );
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
    this.tokens = hydrateTokenRecords(tokens, this.deps.getVault?.());
    this.selection = selection;
    this.selectedTokens = selectedTokens;
  }

  setSelection(tokenId: string | null) {
    this.tokenSelection.setSelection(tokenId);
  }

  setMultiSelection(tokenIds: string[]) {
    this.tokenSelection.setMultiSelection(tokenIds);
  }

  addToSelection(tokenId: string) {
    this.tokenSelection.addToSelection(tokenId);
  }

  removeFromSelection(tokenId: string) {
    this.tokenSelection.removeFromSelection(tokenId);
  }

  clearSelection() {
    this.tokenSelection.clearSelection();
  }

  toggleTokenVisibility(tokenId: string) {
    return this.ownership.toggleTokenVisibility(tokenId);
  }

  toggleNoteCollapsed(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token || token.kind !== "note") return null;
    const updates = noteCollapseUpdate(
      token,
      () => this.deps.getMapStore().gridSize,
    );
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
    return this.ownership.isTokenVisible(tokenId, peerId, isHost);
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
    const positioned = this.geometry.positionToken(
      this.getTokenDefaults(input),
    );
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
    this.sync.publish({ type: "TOKEN_ADDED", token: positioned }, silent);
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
    return this.updateToken(tokenId, {
      zIndex: layerEdgeZIndex(this.allTokens, token.layer, true),
    });
  }

  sendTokenToBack(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) return null;
    return this.updateToken(tokenId, {
      zIndex: layerEdgeZIndex(this.allTokens, token.layer, false),
    });
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
    this.tokens = removeTokenRecord(this.tokens, tokenId);
    this.deps.removeTokenFromInitiativeState?.(tokenId);
    if (this.selection === tokenId) {
      this.selection = null;
    }

    this.sync.publish({ type: "TOKEN_REMOVED", tokenId }, silent);
    return true;
  }

  getChildNotes(parentTokenId: string): Token[] {
    return childTokenNotes(this.tokens, parentTokenId);
  }

  linkTokens(childTokenId: string, parentTokenId: string) {
    if (!this.tokens[childTokenId] || !this.tokens[parentTokenId]) return null;
    return this.updateToken(childTokenId, { parentTokenId });
  }

  unlinkToken(childTokenId: string) {
    if (!this.tokens[childTokenId]) return null;
    return this.updateToken(childTokenId, { parentTokenId: undefined });
  }

  cloneToken(tokenId: string, silent = false) {
    const source = this.tokens[tokenId];
    if (!source) return null;

    const clone = cloneTokenRecord(
      source,
      this.allTokens,
      this.deps.getMapStore().gridSize,
      this.idGenerator,
    );

    this.tokens = {
      ...this.tokens,
      [clone.id]: clone,
    };

    if (this.deps.isInitiativeOrdered?.(tokenId)) {
      this.deps.cloneInitiativeState?.(tokenId, clone.id);
    }
    this.selection = clone.id;

    this.sync.publish({ type: "TOKEN_ADDED", token: clone }, silent);

    return clone;
  }

  setTokenOwner(
    tokenId: string,
    ownerPeerId: string | null,
    ownerGuestName: string | null = null,
  ) {
    return this.ownership.setTokenOwner(tokenId, ownerPeerId, ownerGuestName);
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    return this.ownership.rebindGuestOwnership(peerId, guestName);
  }

  clearGuestOwnership(peerId: string) {
    return this.ownership.clearGuestOwnership(peerId);
  }

  canMoveToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.ownership.canMoveToken(tokenId, peerId, isHost);
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
