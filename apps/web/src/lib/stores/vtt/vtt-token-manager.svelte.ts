import type {
  DragPreview,
  SessionMode,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
  LegacyTokenVisibility,
} from "../../../types/vtt";
import type { Point } from "schema";
import {
  snapToGrid,
  clampPointToBounds,
  hashToColor,
} from "$lib/utils/vtt-helpers";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

const TOKEN_COORD_PRECISION = 2;

function roundTokenCoordinate(value: number) {
  const factor = 10 ** TOKEN_COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function normalizeTokenVisibility(
  visibility: LegacyTokenVisibility | undefined | null,
): Token["visibleTo"] {
  return visibility === "gm-only" ? "gm-only" : "all";
}

export function normalizeToken(
  token:
    | Token
    | (Omit<Token, "visibleTo"> & { visibleTo?: LegacyTokenVisibility }),
): Token {
  return {
    ...token,
    ownerGuestName: token.ownerGuestName ?? null,
    visibleTo: normalizeTokenVisibility(token.visibleTo),
  };
}

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
}

export class VTTTokenManager {
  tokens = $state<Record<string, Token>>({});
  selection = $state<string | null>(null);
  selectedTokens = $state<Set<string>>(new Set());
  pendingTokenCoords = $state<Point | null>(null);
  draggingTokenId = $state<string | null>(null);
  dragPreview = $state<DragPreview | null>(null);

  private pendingTokenMoves = new Map<
    string,
    { previous: Token; timeoutId: number }
  >();

  allTokens = $derived.by(() => Object.values(this.tokens));
  selectedToken = $derived.by(() => {
    if (!this.selection) return null;
    return this.tokens[this.selection] ?? null;
  });

  constructor(private deps: VTTTokenManagerDependencies) {}

  reset() {
    this.tokens = {};
    this.selection = null;
    this.selectedTokens = new Set();
    this.pendingTokenCoords = null;
    this.draggingTokenId = null;
    this.dragPreview = null;
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
  }

  setSnapshotData(
    tokens: Record<string, Token>,
    selection: string | null,
    selectedTokens: Set<string>,
  ) {
    this.tokens = tokens;
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
    return this.updateToken(tokenId, { visibleTo: next });
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
    const mapStore = this.deps.getMapStore();
    const mapGrid = mapStore.gridSize || 50;
    return {
      id: crypto.randomUUID(),
      entityId: input.entityId ?? null,
      name: input.name.trim(),
      x: input.x,
      y: input.y,
      width: input.width ?? mapGrid,
      height: input.height ?? mapGrid,
      rotation: input.rotation ?? 0,
      zIndex: input.zIndex ?? Object.keys(this.tokens).length,
      ownerPeerId: input.ownerPeerId ?? null,
      ownerGuestName: input.ownerGuestName ?? null,
      visibleTo: normalizeTokenVisibility(input.visibleTo),
      color: input.color || hashToColor(input.name),
      imageUrl: input.imageUrl ?? null,
      statusEffects: [],
    };
  }

  clampAndSnapPosition(
    point: Point,
    tokenSize: { width: number; height: number },
  ) {
    const mapStore = this.deps.getMapStore();
    const activeMap = mapStore.activeMap;
    if (!activeMap)
      return {
        x: point.x,
        y: point.y,
        width: tokenSize.width,
        height: tokenSize.height,
      };

    let targetX = point.x;
    let targetY = point.y;
    let targetWidth = tokenSize.width;
    let targetHeight = tokenSize.height;

    if (mapStore.showGrid) {
      const gridSize = mapStore.gridSize;
      const offsetX = mapStore.gridOffsetX;
      const offsetY = mapStore.gridOffsetY;

      // Snap position to grid lines
      const snapped = snapToGrid(point, gridSize, offsetX, offsetY);
      targetX = snapped.x;
      targetY = snapped.y;

      // Snap size to nearest grid cell multiple
      targetWidth = gridSize
        ? Math.max(gridSize, Math.round(tokenSize.width / gridSize) * gridSize)
        : tokenSize.width;
      targetHeight = gridSize
        ? Math.max(gridSize, Math.round(tokenSize.height / gridSize) * gridSize)
        : tokenSize.height;
    }

    // Always clamp to map bounds to prevent invisible placements
    const clamped = clampPointToBounds(
      { x: targetX, y: targetY },
      activeMap.dimensions,
      { width: targetWidth, height: targetHeight },
    );

    return {
      x: clamped.x,
      y: clamped.y,
      width: targetWidth,
      height: targetHeight,
    };
  }

  addToken(input: TokenCreationInput, silent = false) {
    const token = this.getTokenDefaults(input);
    const snapped = this.clampAndSnapPosition(
      { x: token.x, y: token.y },
      { width: token.width, height: token.height },
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
    this.deps.addTokenToInitiativeState?.(positioned.id);
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

    const sizeChanged =
      updates.width !== undefined || updates.height !== undefined;
    const posChanged = updates.x !== undefined || updates.y !== undefined;
    const permissionChanged =
      updates.ownerPeerId !== undefined ||
      updates.ownerGuestName !== undefined ||
      updates.visibleTo !== undefined;
    const statusChanged = updates.statusEffects !== undefined;
    const shouldDebounceBroadcast = posChanged || sizeChanged;

    const snapped =
      posChanged || sizeChanged
        ? this.clampAndSnapPosition(
            {
              x:
                updates.x !== undefined
                  ? roundTokenCoordinate(updates.x)
                  : current.x,
              y:
                updates.y !== undefined
                  ? roundTokenCoordinate(updates.y)
                  : current.y,
            },
            {
              width: updates.width ?? current.width,
              height: updates.height ?? current.height,
            },
          )
        : {
            x: current.x,
            y: current.y,
            width: current.width,
            height: current.height,
          };

    const next = {
      ...current,
      ...updates,
      visibleTo:
        updates.visibleTo !== undefined
          ? normalizeTokenVisibility(updates.visibleTo)
          : current.visibleTo,
      x: snapped.x,
      y: snapped.y,
    };

    // Apply snapped size (always, not just when sizeChanged)
    next.width = snapped.width;
    next.height = snapped.height;

    this.tokens = {
      ...this.tokens,
      [tokenId]: next,
    };

    if (!silent) {
      if (shouldDebounceBroadcast) {
        this.deps.queueSessionSnapshotBroadcast();
        return next;
      }

      if (sessionModeStore.isGuestMode && (posChanged || sizeChanged)) {
        this.deps.emit({
          type: "TOKEN_MOVE",
          tokenId,
          x: snapped.x,
          y: snapped.y,
        });
      } else {
        this.deps.emit({
          type: "TOKEN_STATE_UPDATE",
          tokenId,
          delta: {
            ...updates,
            x: posChanged || sizeChanged ? snapped.x : undefined,
            y: posChanged || sizeChanged ? snapped.y : undefined,
          },
        });
      }

      // Ownership/visibility and status changes are sensitive to client-side
      // drift. Follow the delta with a canonical snapshot so guests heal from
      // any stale local state immediately.
      if (permissionChanged || statusChanged) {
        this.deps.broadcastSessionSnapshotNow();
      }
    } else {
      this.deps.persistDraft();
    }

    return next;
  }

  moveToken(tokenId: string, x: number, y: number, silent = false) {
    return this.updateToken(tokenId, { x, y }, silent);
  }

  requestTokenMove(tokenId: string, x: number, y: number, persistent = false) {
    const previous = this.tokens[tokenId];
    if (!previous) return null;
    const updated = this.updateToken(tokenId, { x, y }, true);
    if (updated && !persistent) {
      this.scheduleMoveRevert(tokenId, previous);
    }
    return updated;
  }

  private clearPendingMove(tokenId: string) {
    const pending = this.pendingTokenMoves.get(tokenId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    this.pendingTokenMoves.delete(tokenId);
  }

  private scheduleMoveRevert(tokenId: string, previous: Token) {
    this.clearPendingMove(tokenId);
    const timeoutId = window.setTimeout(() => {
      const current = this.tokens[tokenId];
      if (current) {
        this.tokens = {
          ...this.tokens,
          [tokenId]: { ...previous },
        };
        this.deps.persistDraft();
      }
      this.pendingTokenMoves.delete(tokenId);
    }, 500);

    this.pendingTokenMoves.set(tokenId, {
      previous: { ...previous },
      timeoutId,
    });
  }

  confirmTokenMove(tokenId: string) {
    this.clearPendingMove(tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    if (!this.tokens[tokenId]) return false;
    this.clearPendingMove(tokenId);
    const nextTokens = { ...this.tokens };
    delete nextTokens[tokenId];
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
    // ⚡ Bolt Optimization: Use imperative loop instead of ...allTokens.map to find max zIndex
    // to avoid intermediate array allocation and spread operator overhead.
    let maxZ = source.zIndex;
    for (const token of this.allTokens) {
      if (token.zIndex > maxZ) {
        maxZ = token.zIndex;
      }
    }

    const clone: Token = {
      ...source,
      id: crypto.randomUUID(),
      name: this.getClonedTokenName(source.name),
      x: source.x + offset,
      y: source.y + offset,
      zIndex: maxZ + 1,
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

    this.clearPendingMove(tokenId);
    this.updateToken(tokenId, delta, true);
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.clearPendingMove(tokenId);
    this.removeToken(tokenId, true);
  }

  clearPendingMoves() {
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
  }
}
