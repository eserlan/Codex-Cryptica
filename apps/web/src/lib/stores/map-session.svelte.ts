import { vault } from "./vault.svelte";
import { mapStore } from "./map.svelte";
import {
  VTTSessionService,
  createEncounterSession,
  summarizeEncounterSession,
} from "$lib/services/vtt-session";
import type {
  ChatMessagePayload,
  EncounterSession,
  EncounterSnapshotSummary,
  InitiativeEntry,
  LegacyTokenVisibility,
  MeasurementState,
  PingState,
  SessionMode,
  SharedTokenImageState,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "$types/vtt";
import type { Point } from "schema";
import { snapToGrid } from "$lib/utils/vtt-helpers";
import { uiStore } from "./ui.svelte";
import { diceEngine, type RollResult } from "dice-engine";

const STORAGE_PREFIX = "codex.vtt.session";
const POPOUT_STORAGE_PREFIX = "codex.vtt.popout";
const SESSION_SNAPSHOT_BROADCAST_DELAY_MS = 250;
const TOKEN_COORD_PRECISION = 2;

function roundTokenCoordinate(value: number) {
  const factor = 10 ** TOKEN_COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function hashToColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 55%)`;
}

function cloneMeasurement(measurement: MeasurementState): MeasurementState {
  return {
    active: measurement.active,
    start: measurement.start ? { ...measurement.start } : null,
    end: measurement.end ? { ...measurement.end } : null,
    locked: measurement.locked,
  };
}

function normalizeTokenVisibility(
  visibility: LegacyTokenVisibility | undefined | null,
): Token["visibleTo"] {
  return visibility === "gm-only" ? "gm-only" : "all";
}

function normalizeToken(
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

export interface MapSessionDependencies {
  mapStore: typeof mapStore;
  vault: typeof vault;
  service?: VTTSessionService;
}

export class MapSessionStore {
  vttEnabled = $state(false);
  sessionId = $state<string | null>(null);
  mapId = $state<string | null>(null);
  mode = $state<SessionMode>("exploration");
  name = $state("Encounter");
  tokens = $state<Record<string, Token>>({});
  initiativeOrder = $state<string[]>([]);
  initiativeValues = $state<Record<string, number>>({});
  round = $state(1);
  turnIndex = $state(0);
  selection = $state<string | null>(null);
  selectedTokens = $state<Set<string>>(new Set());
  pendingTokenCoords = $state<Point | null>(null);
  sessionFogMask = $state<string | null>(null);
  lastPing = $state<PingState | null>(null);
  pings = $state<Record<string, PingState>>({});
  measurement = $state<MeasurementState>({
    active: false,
    start: null,
    end: null,
  });
  activeMeasurement = $state<(MeasurementState & { peerId: string }) | null>(
    null,
  );
  sharedTokenImage = $state<SharedTokenImageState | null>(null);
  createdAt = $state(Date.now());
  savedAt = $state<number | null>(null);
  snapshots = $state<EncounterSnapshotSummary[]>([]);
  chatMessages = $state<ChatMessagePayload[]>([]);
  myPeerId = $state<string | null>(null);
  draggingTokenId = $state<string | null>(null);

  // Grid settings — derived from mapStore so they survive page reload
  get gridUnit(): string {
    return this.deps.mapStore.gridUnit;
  }
  set gridUnit(value: string) {
    this.deps.mapStore.gridUnit = value;
  }
  get gridDistance(): number {
    return this.deps.mapStore.gridDistance;
  }
  set gridDistance(value: number) {
    this.deps.mapStore.gridDistance = value;
  }
  showGridSettings = $state(false);
  gridFitMode = $state(false);
  gridMoveMode = $state(false);

  private broadcaster: ((message: VTTMessage) => void) | null = null;
  private readonly service: VTTSessionService;
  private restoring = false;
  private restoredMapId: string | null = null;
  private hasHydratedSession = false;
  private sessionSnapshotBroadcastTimeout: number | null = null;
  private draftPersistTimeout: number | null = null;
  private pingTimeouts = new Map<string, number>();
  private pendingTokenMoves = new Map<
    string,
    { previous: Token; timeoutId: number }
  >();

  activeTokenId = $derived(this.initiativeOrder[this.turnIndex] ?? null);
  selectedToken = $derived.by(() => {
    if (!this.selection) return null;
    return this.tokens[this.selection] ?? null;
  });
  initiativeEntries = $derived.by(() => {
    return this.initiativeOrder
      .map((tokenId): InitiativeEntry | null => {
        const token = this.tokens[tokenId];
        if (!token) return null;
        return {
          tokenId,
          initiativeValue: this.initiativeValues[tokenId] ?? 0,
          hasActed:
            this.mode === "combat" &&
            this.activeTokenId !== null &&
            this.activeTokenId !== tokenId &&
            this.turnIndex > this.initiativeOrder.indexOf(tokenId),
        };
      })
      .filter((entry): entry is InitiativeEntry => entry !== null);
  });
  activeSession = $derived.by(() => {
    if (!this.mapId) return null;
    return this.createSnapshot();
  });

  constructor(private deps: MapSessionDependencies) {
    this.service =
      deps.service ??
      new VTTSessionService({
        getActiveVaultHandle: () => this.deps.vault.getActiveVaultHandle(),
      });

    if (typeof window !== "undefined") {
      $effect.root(() => {
        const handleStorage = (event: StorageEvent) => {
          if (
            !event.key ||
            !event.key.startsWith(`${POPOUT_STORAGE_PREFIX}:`) ||
            !event.newValue
          ) {
            return;
          }

          try {
            const parsed = JSON.parse(event.newValue) as {
              vttEnabled?: boolean;
              myPeerId?: string | null;
              snapshot?: EncounterSession;
            };
            if (!parsed.snapshot) return;
            this.syncFromRemoteSession(
              parsed.snapshot,
              !this.isInitiativePopoutWindow(),
            );
            this.vttEnabled = !!parsed.vttEnabled;
            if (parsed.myPeerId !== undefined) {
              this.myPeerId = parsed.myPeerId;
            }
          } catch {
            // Ignore malformed popout payloads.
          }
        };

        window.addEventListener("storage", handleStorage);

        $effect(() => {
          this.handleActiveMapChange(this.deps.mapStore.activeMapId);
        });

        return () => window.removeEventListener("storage", handleStorage);
      });
    }
  }

  setBroadcaster(handler: ((message: VTTMessage) => void) | null) {
    this.broadcaster = handler;
  }

  private emit(message: VTTMessage) {
    this.persistDraft();
    this.broadcaster?.(message);
  }

  private clearPendingSessionSnapshotBroadcast() {
    if (this.sessionSnapshotBroadcastTimeout === null) return;
    clearTimeout(this.sessionSnapshotBroadcastTimeout);
    this.sessionSnapshotBroadcastTimeout = null;
  }

  private clearPendingDraftPersist() {
    if (this.draftPersistTimeout === null) return;
    clearTimeout(this.draftPersistTimeout);
    this.draftPersistTimeout = null;
  }

  private queueDraftPersist() {
    if (typeof window === "undefined" || !this.mapId || this.restoring) return;

    this.clearPendingDraftPersist();
    this.draftPersistTimeout = window.setTimeout(() => {
      this.draftPersistTimeout = null;
      this.persistDraft();
    }, SESSION_SNAPSHOT_BROADCAST_DELAY_MS);
  }

  private queueSessionSnapshotBroadcast() {
    this.clearPendingSessionSnapshotBroadcast();

    if (typeof window === "undefined") return;

    this.sessionSnapshotBroadcastTimeout = window.setTimeout(() => {
      this.sessionSnapshotBroadcastTimeout = null;
      this.persistDraft();
      this.broadcaster?.({
        type: "SESSION_SNAPSHOT",
        session: this.createSnapshot(),
      });
    }, SESSION_SNAPSHOT_BROADCAST_DELAY_MS);
  }

  private broadcastSessionSnapshotNow() {
    this.clearPendingSessionSnapshotBroadcast();
    this.persistDraft();
    this.broadcaster?.({
      type: "SESSION_SNAPSHOT",
      session: this.createSnapshot(),
    });
  }

  private getDraftKey(mapId: string) {
    return `${STORAGE_PREFIX}:${mapId}`;
  }

  private getPopoutKey(mapId: string) {
    return `${POPOUT_STORAGE_PREFIX}:${mapId}`;
  }

  private persistDraft() {
    if (typeof window === "undefined" || !this.mapId || this.restoring) return;

    const snapshot = this.createSnapshot();
    const payload = JSON.stringify({
      vttEnabled: this.vttEnabled,
      ...(uiStore.isGuestMode ? { myPeerId: this.myPeerId } : {}),
      snapshot,
    });
    window.sessionStorage.setItem(this.getDraftKey(this.mapId), payload);
    window.localStorage.setItem(this.getPopoutKey(this.mapId), payload);
  }

  refreshPopoutSnapshot() {
    this.queueDraftPersist();
  }

  private isInitiativePopoutWindow() {
    if (typeof window === "undefined") return false;
    return window.location.pathname.endsWith("/map/initiative");
  }

  private findPopoutDraftKey() {
    if (typeof window === "undefined") return null;

    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(`${POPOUT_STORAGE_PREFIX}:`)) {
        return key;
      }
    }

    return null;
  }

  private restoreAnyPopoutDraft(): boolean {
    if (typeof window === "undefined") return false;

    const key = this.findPopoutDraftKey();
    if (!key) return false;

    const raw = window.localStorage.getItem(key);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        vttEnabled?: boolean;
        myPeerId?: string | null;
        snapshot?: EncounterSession;
      };
      if (!parsed.snapshot?.mapId) return false;

      this.restoring = true;
      this.applySnapshot(parsed.snapshot, true);
      this.vttEnabled = !!parsed.vttEnabled;
      if (parsed.myPeerId !== undefined) {
        this.myPeerId = parsed.myPeerId;
      }
      this.hasHydratedSession = true;
      return true;
    } catch {
      return false;
    } finally {
      this.restoring = false;
    }
  }

  private handleActiveMapChange(activeMapId: string | null) {
    if (!activeMapId) {
      if (this.hasHydratedSession) {
        return;
      }
      if (this.restoreAnyPopoutDraft()) {
        return;
      }
      this.clearSession(true);
      return;
    }

    if (this.mapId !== activeMapId || this.restoredMapId !== activeMapId) {
      this.bindToMap(activeMapId);
    }
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
        this.persistDraft();
      }
      this.pendingTokenMoves.delete(tokenId);
    }, 500);

    this.pendingTokenMoves.set(tokenId, {
      previous: { ...previous },
      timeoutId,
    });
  }

  private clearPing(peerId: string) {
    const timeoutId = this.pingTimeouts.get(peerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pingTimeouts.delete(peerId);
    }

    if (!this.pings[peerId]) return;
    const next = { ...this.pings };
    delete next[peerId];
    this.pings = next;
  }

  private registerPing(ping: PingState) {
    this.clearPing(ping.peerId);
    this.lastPing = { ...ping };
    this.pings = {
      ...this.pings,
      [ping.peerId]: { ...ping },
    };

    const timeoutId = window.setTimeout(() => {
      const current = this.pings[ping.peerId];
      if (current && current.timestamp === ping.timestamp) {
        const next = { ...this.pings };
        delete next[ping.peerId];
        this.pings = next;
        if (
          this.lastPing?.peerId === ping.peerId &&
          this.lastPing.timestamp === ping.timestamp
        ) {
          this.lastPing = null;
        }
      }
      this.pingTimeouts.delete(ping.peerId);
    }, 3000);
    this.pingTimeouts.set(ping.peerId, timeoutId);
  }

  private clearPings() {
    for (const timeoutId of this.pingTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.pingTimeouts.clear();
    this.pings = {};
    this.lastPing = null;
  }

  private restoreDraft(mapId: string): boolean {
    if (typeof window === "undefined") return false;
    const raw =
      window.sessionStorage.getItem(this.getDraftKey(mapId)) ??
      window.localStorage.getItem(this.getPopoutKey(mapId));
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        vttEnabled?: boolean;
        snapshot?: EncounterSession;
      };
      if (!parsed.snapshot || parsed.snapshot.mapId !== mapId) return false;
      this.restoring = true;
      this.applySnapshot(parsed.snapshot, true);
      this.vttEnabled = !!parsed.vttEnabled;
      this.hasHydratedSession = true;
      return true;
    } catch {
      return false;
    } finally {
      this.restoring = false;
    }
  }

  bindToMap(mapId: string) {
    this.mapId = mapId;
    this.restoredMapId = mapId;
    const restored = this.restoreDraft(mapId);
    this.hasHydratedSession = restored;
    if (!restored) {
      this.resetSessionState(mapId);
    }
  }

  private resetSessionState(mapId: string) {
    this.clearPendingSessionSnapshotBroadcast();
    const session = createEncounterSession(mapId);
    this.sessionId = session.id;
    this.mode = session.mode;
    this.name = session.name;
    this.tokens = {};
    this.initiativeOrder = [];
    this.initiativeValues = {};
    this.round = 1;
    this.turnIndex = 0;
    this.selection = null;
    this.pendingTokenCoords = null;
    this.sessionFogMask = null;
    this.lastPing = null;
    this.clearPings();
    this.measurement = cloneMeasurement(session.measurement);
    this.sharedTokenImage = null;
    this.createdAt = session.createdAt;
    this.savedAt = null;
    this.snapshots = [];
    this.chatMessages = [];
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
  }

  clearSession(clearDraft = false) {
    this.clearPendingSessionSnapshotBroadcast();
    if (clearDraft && typeof window !== "undefined" && this.mapId) {
      window.sessionStorage.removeItem(this.getDraftKey(this.mapId));
      window.localStorage.removeItem(this.getPopoutKey(this.mapId));
    }
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
    this.mapId = null;
    this.sessionId = null;
    this.tokens = {};
    this.initiativeOrder = [];
    this.initiativeValues = {};
    this.round = 1;
    this.turnIndex = 0;
    this.selection = null;
    this.pendingTokenCoords = null;
    this.sessionFogMask = null;
    this.lastPing = null;
    this.clearPings();
    this.measurement = {
      active: false,
      start: null,
      end: null,
    };
    this.sharedTokenImage = null;
    this.createdAt = Date.now();
    this.savedAt = null;
    this.snapshots = [];
    this.vttEnabled = false;
    this.chatMessages = [];
    this.name = "Encounter";
    this.hasHydratedSession = false;
  }

  private createChatRoll(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
  ) {
    return {
      formula,
      total: result.total,
      parts: result.parts.map((p) => ({
        type: p.type,
        value: p.value,
        sides: p.type === "dice" ? p.sides : undefined,
        rolls: p.type === "dice" ? p.rolls : undefined,
        dropped: p.type === "dice" ? p.dropped : undefined,
      })),
    };
  }

  private buildChatPayload(
    content: string,
    roll?: ReturnType<MapSessionStore["createChatRoll"]>,
  ): ChatMessagePayload {
    const sender = uiStore.isGuestMode
      ? uiStore.guestUsername || "Guest"
      : "GM";
    const senderId = this.myPeerId || "host";

    return {
      type: "CHAT_MESSAGE",
      sender,
      senderId,
      content,
      timestamp: Date.now(),
      roll,
    };
  }

  sendChatMessage(content: string) {
    if (!this.vttEnabled) return;

    let roll = undefined;
    const trimmed = content.trim();
    if (trimmed.startsWith("/roll ")) {
      try {
        const formula = trimmed.replace("/roll ", "").trim();
        const result = diceEngine.evaluate(formula);
        roll = this.createChatRoll(formula, result);
      } catch (err) {
        console.error("[MapSession] Dice roll failed", err);
      }
    }

    const payload = this.buildChatPayload(content, roll);

    this.chatMessages = [...this.chatMessages, payload];
    this.emit(payload);
  }

  sendResolvedRollMessage(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
  ) {
    if (!this.vttEnabled) return;

    const payload = this.buildChatPayload(
      `/roll ${formula}`,
      this.createChatRoll(formula, result),
    );

    this.chatMessages = [...this.chatMessages, payload];
    this.emit(payload);
  }

  clearChatMessages() {
    if (!this.vttEnabled) return;

    this.chatMessages = [];
    this.emit({
      type: "CHAT_CLEAR",
      timestamp: Date.now(),
    });
  }

  handleRemoteChatMessage(payload: ChatMessagePayload) {
    this.chatMessages = [...this.chatMessages, payload];
    this.persistDraft();
  }

  handleRemoteChatClear() {
    this.chatMessages = [];
    this.persistDraft();
  }

  handleRemoteShowTokenImage(title: string, imagePath: string) {
    this.sharedTokenImage = {
      title,
      imagePath,
    };
  }

  clearSharedTokenImage() {
    this.sharedTokenImage = null;
  }

  showTokenImageToPlayers(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) {
      console.warn("[MapSession] showTokenImageToPlayers missing token", {
        tokenId,
      });
      return false;
    }

    const entityImage = token.entityId
      ? (this.deps.vault.entities[token.entityId]?.image ?? null)
      : null;
    const imagePath = entityImage ?? token.imageUrl;
    if (!imagePath) {
      console.warn("[MapSession] showTokenImageToPlayers missing image", {
        tokenId,
        tokenImageUrl: token.imageUrl,
        entityId: token.entityId,
        entityImage,
      });
      return false;
    }

    console.log("[MapSession] showTokenImageToPlayers", {
      tokenId,
      title: token.name,
      imagePath,
      tokenImageUrl: token.imageUrl,
      entityImage,
    });

    this.emit({
      type: "SHOW_TOKEN_IMAGE",
      title: token.name,
      imagePath,
    });
    return true;
  }

  createSnapshot(): EncounterSession {
    return {
      id: this.sessionId ?? crypto.randomUUID(),
      name: this.name,
      mapId: this.mapId ?? "",
      mode: this.mode,
      tokens: Object.fromEntries(
        Object.entries(this.tokens).map(([id, token]) => [id, { ...token }]),
      ),
      initiativeOrder: [...this.initiativeOrder],
      initiativeValues: { ...this.initiativeValues },
      round: this.round,
      turnIndex: this.turnIndex,
      selection: this.selection,
      sessionFogMask: this.sessionFogMask,
      lastPing: this.lastPing,
      measurement: cloneMeasurement(this.measurement),
      createdAt: this.createdAt,
      savedAt: this.savedAt,
      chatMessages: [...this.chatMessages],
      gridSize: this.deps.mapStore.gridSize,
      gridUnit: this.gridUnit,
      gridDistance: this.gridDistance,
    };
  }

  applySnapshot(snapshot: EncounterSession, silent = true) {
    this.clearPendingSessionSnapshotBroadcast();
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
    this.clearPings();
    this.sessionId = snapshot.id;
    this.mapId = snapshot.mapId;
    this.mode = snapshot.mode;
    this.name = snapshot.name ?? this.name;
    if (snapshot.tokens) {
      this.tokens = Object.fromEntries(
        Object.entries(snapshot.tokens).map(([id, token]) => [
          id,
          normalizeToken(token as Token),
        ]),
      );
    }
    this.initiativeOrder = [...snapshot.initiativeOrder];
    this.initiativeValues = { ...snapshot.initiativeValues };
    this.round = snapshot.round;
    this.turnIndex = Math.min(
      snapshot.turnIndex,
      Math.max(0, snapshot.initiativeOrder.length - 1),
    );
    this.selection =
      snapshot.selection && this.tokens[snapshot.selection]
        ? snapshot.selection
        : null;
    this.sessionFogMask = snapshot.sessionFogMask;
    this.lastPing = snapshot.lastPing ?? null;
    this.measurement = cloneMeasurement(snapshot.measurement);
    this.createdAt = snapshot.createdAt;
    this.savedAt = snapshot.savedAt;
    this.chatMessages = snapshot.chatMessages ? [...snapshot.chatMessages] : [];

    if (snapshot.gridSize !== undefined) {
      this.deps.mapStore.gridSize = snapshot.gridSize;
    }
    if (snapshot.gridUnit !== undefined) {
      this.gridUnit = snapshot.gridUnit;
    }
    if (snapshot.gridDistance !== undefined) {
      this.gridDistance = snapshot.gridDistance;
    }

    if (!silent) {
      this.emit({
        type: "SESSION_SNAPSHOT",
        session: this.createSnapshot(),
      });
    }
  }

  setVttEnabled(enabled: boolean) {
    this.vttEnabled = enabled;
    this.persistDraft();
  }

  setMode(mode: SessionMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.emit({ type: "SET_MODE", mode });
  }

  setSelection(tokenId: string | null) {
    if (tokenId && !this.tokens[tokenId]) return;
    this.selection = tokenId;
    this.selectedTokens = new Set(tokenId ? [tokenId] : []);
    this.emit({ type: "TOKEN_SELECT", tokenId });
  }

  setMultiSelection(tokenIds: string[]) {
    this.selectedTokens = new Set(tokenIds);
    // Also set primary selection to first token
    this.selection = tokenIds.length > 0 ? tokenIds[0] : null;
    if (this.selection) {
      this.emit({ type: "TOKEN_SELECT", tokenId: this.selection });
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
    this.emit({ type: "TOKEN_SELECT", tokenId: null });
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

  setSessionFogMask(mask: string | null) {
    this.sessionFogMask = mask;
    this.persistDraft();
  }

  setMeasurementActive(active: boolean) {
    const wasActive = this.measurement.active;
    this.measurement = {
      ...this.measurement,
      active,
      start: active ? this.measurement.start : null,
      end: active ? this.measurement.end : null,
      locked: active ? this.measurement.locked : false,
    };
    this.persistDraft();

    if (wasActive !== active) {
      const peerId = this.myPeerId || "host";
      this.emit({
        type: "MEASUREMENT",
        active,
        startX: this.measurement.start?.x ?? 0,
        startY: this.measurement.start?.y ?? 0,
        endX: this.measurement.end?.x ?? 0,
        endY: this.measurement.end?.y ?? 0,
        peerId,
      });
    }
  }

  setMeasurementStart(start: Point | null) {
    this.measurement = {
      ...this.measurement,
      active: !!start,
      start,
      end: start ? this.measurement.end : null,
      locked: false,
    };
    this.persistDraft();

    const peerId = this.myPeerId || "host";
    this.emit({
      type: "MEASUREMENT",
      active: !!start,
      startX: start?.x ?? 0,
      startY: start?.y ?? 0,
      endX: this.measurement.end?.x ?? 0,
      endY: this.measurement.end?.y ?? 0,
      peerId,
    });
  }

  setMeasurementEnd(end: Point | null, silent = false) {
    this.measurement = {
      ...this.measurement,
      active: !!this.measurement.start,
      end,
    };
    if (!silent) {
      this.persistDraft();
    }

    const peerId = this.myPeerId || "host";
    this.emit({
      type: "MEASUREMENT",
      active: !!this.measurement.start,
      startX: this.measurement.start?.x ?? 0,
      startY: this.measurement.start?.y ?? 0,
      endX: end?.x ?? 0,
      endY: end?.y ?? 0,
      peerId,
    });
  }

  setMeasurementLocked(locked: boolean) {
    this.measurement = {
      ...this.measurement,
      locked,
    };
    this.persistDraft();
  }

  clearMeasurement() {
    this.measurement = {
      active: false,
      start: null,
      end: null,
      locked: false,
    };
    this.persistDraft();
  }

  private getTokenDefaults(input: TokenCreationInput): Token {
    const mapGrid = this.deps.mapStore.gridSize || 50;
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

  private clampAndSnapPosition(
    point: Point,
    tokenSize: { width: number; height: number },
  ) {
    const activeMap = this.deps.mapStore.activeMap;
    if (!activeMap)
      return {
        x: point.x,
        y: point.y,
        width: tokenSize.width,
        height: tokenSize.height,
      };

    if (this.deps.mapStore.showGrid) {
      const gridSize = this.deps.mapStore.gridSize;
      const offsetX = this.deps.mapStore.gridOffsetX;
      const offsetY = this.deps.mapStore.gridOffsetY;

      // Snap position to grid lines
      const snapped = snapToGrid(point, gridSize, offsetX, offsetY);

      // Snap size to nearest grid cell multiple
      const snappedWidth = gridSize
        ? Math.max(gridSize, Math.round(tokenSize.width / gridSize) * gridSize)
        : tokenSize.width;
      const snappedHeight = gridSize
        ? Math.max(gridSize, Math.round(tokenSize.height / gridSize) * gridSize)
        : tokenSize.height;

      return {
        x: snapped.x,
        y: snapped.y,
        width: snappedWidth,
        height: snappedHeight,
      };
    }

    return {
      x: point.x,
      y: point.y,
      width: tokenSize.width,
      height: tokenSize.height,
    };
  }

  addToken(input: TokenCreationInput, silent = false) {
    if (!this.mapId) return null;
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
    if (!this.initiativeOrder.includes(positioned.id)) {
      this.initiativeOrder = [...this.initiativeOrder, positioned.id];
    }
    this.initiativeValues = {
      ...this.initiativeValues,
      [positioned.id]: this.initiativeValues[positioned.id] ?? 0,
    };
    if (!silent) {
      this.emit({ type: "TOKEN_ADDED", token: positioned });
    } else {
      this.persistDraft();
    }
    return positioned;
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

    if (permissionChanged) {
      console.log("[MapSession] updateToken permission change", {
        tokenId,
        current: {
          ownerPeerId: current.ownerPeerId,
          ownerGuestName: current.ownerGuestName,
          visibleTo: current.visibleTo,
        },
        updates: {
          ownerPeerId: updates.ownerPeerId,
          ownerGuestName: updates.ownerGuestName,
          visibleTo: updates.visibleTo,
        },
        next: {
          ownerPeerId: next.ownerPeerId,
          ownerGuestName: next.ownerGuestName,
          visibleTo: next.visibleTo,
        },
        silent,
      });
    }

    if (!silent) {
      if (shouldDebounceBroadcast) {
        this.queueSessionSnapshotBroadcast();
        return next;
      }

      this.emit({
        type: "TOKEN_STATE_UPDATE",
        tokenId,
        delta: {
          ...updates,
          x: posChanged || sizeChanged ? snapped.x : undefined,
          y: posChanged || sizeChanged ? snapped.y : undefined,
        },
      });

      // Ownership/visibility changes are permission-sensitive. Follow the
      // delta with a canonical snapshot so guests heal from any stale local state.
      if (permissionChanged) {
        this.broadcastSessionSnapshotNow();
      }
    } else {
      if (shouldDebounceBroadcast) {
        this.queueDraftPersist();
      } else {
        this.persistDraft();
      }
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

  confirmTokenMove(tokenId: string) {
    this.clearPendingMove(tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    if (!this.tokens[tokenId]) return false;
    this.clearPendingMove(tokenId);
    const nextTokens = { ...this.tokens };
    delete nextTokens[tokenId];
    this.tokens = nextTokens;
    this.initiativeOrder = this.initiativeOrder.filter((id) => id !== tokenId);
    const nextInitiative = { ...this.initiativeValues };
    delete nextInitiative[tokenId];
    this.initiativeValues = nextInitiative;
    if (this.selection === tokenId) {
      this.selection = null;
    }

    if (this.turnIndex >= this.initiativeOrder.length) {
      this.turnIndex = Math.max(0, this.initiativeOrder.length - 1);
    }

    if (!silent) {
      this.emit({ type: "TOKEN_REMOVED", tokenId });
    } else {
      this.persistDraft();
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

    for (const token of Object.values(this.tokens)) {
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

    const offset = this.deps.mapStore.gridSize || 50;
    const clone: Token = {
      ...source,
      id: crypto.randomUUID(),
      name: this.getClonedTokenName(source.name),
      x: source.x + offset,
      y: source.y + offset,
      zIndex:
        Math.max(
          ...Object.values(this.tokens).map((token) => token.zIndex),
          source.zIndex,
        ) + 1,
    };

    this.tokens = {
      ...this.tokens,
      [clone.id]: clone,
    };

    if (this.initiativeOrder.includes(tokenId)) {
      this.initiativeValues = {
        ...this.initiativeValues,
        [clone.id]: this.initiativeValues[tokenId] ?? 0,
      };
      this.initiativeOrder = [...this.initiativeOrder, clone.id];
      this.initiativeOrder = this.sortInitiativeOrder();
    }
    this.selection = clone.id;

    if (!silent) {
      this.emit({ type: "TOKEN_ADDED", token: clone });
    } else {
      this.persistDraft();
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
    console.log("[MapSession] setTokenOwner", {
      tokenId,
      fromOwnerPeerId: token.ownerPeerId,
      fromOwnerGuestName: token.ownerGuestName,
      toOwnerPeerId: ownerPeerId,
      toOwnerGuestName: ownerGuestName,
      fromVisibleTo: token.visibleTo,
    });
    return this.updateToken(tokenId, {
      ownerPeerId,
      ownerGuestName,
      visibleTo: token.visibleTo === "gm-only" ? "gm-only" : "all",
    });
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    let changed = false;
    const nextTokens = Object.fromEntries(
      Object.entries(this.tokens).map(([tokenId, token]) => {
        if (
          token.ownerGuestName === guestName &&
          token.ownerPeerId !== peerId
        ) {
          changed = true;
          return [
            tokenId,
            {
              ...token,
              ownerPeerId: peerId,
            },
          ];
        }
        return [tokenId, token];
      }),
    );

    if (!changed) return false;
    this.tokens = nextTokens;
    this.broadcastSessionSnapshotNow();
    return true;
  }

  clearGuestOwnership(peerId: string) {
    let changed = false;
    const nextTokens = Object.fromEntries(
      Object.entries(this.tokens).map(([tokenId, token]) => {
        if (token.ownerPeerId === peerId) {
          changed = true;
          return [
            tokenId,
            {
              ...token,
              ownerPeerId: null,
            },
          ];
        }
        return [tokenId, token];
      }),
    );

    if (!changed) return false;
    this.tokens = nextTokens;
    this.broadcastSessionSnapshotNow();
    return true;
  }

  setInitiativeValue(tokenId: string, initiativeValue: number) {
    if (!this.tokens[tokenId]) return;
    const activeTokenId = this.activeTokenId ?? tokenId;
    this.initiativeValues = {
      ...this.initiativeValues,
      [tokenId]: initiativeValue,
    };
    const sorted = this.sortInitiativeOrder();
    this.initiativeOrder = sorted;
    const nextIndex = sorted.indexOf(activeTokenId);
    this.turnIndex = nextIndex >= 0 ? nextIndex : 0;
    this.queueSessionSnapshotBroadcast();
  }

  addToInitiative(tokenId: string) {
    if (!this.tokens[tokenId] || this.initiativeOrder.includes(tokenId)) {
      return;
    }
    this.initiativeOrder = [...this.initiativeOrder, tokenId];
    this.initiativeValues = {
      ...this.initiativeValues,
      [tokenId]: this.initiativeValues[tokenId] ?? 0,
    };
    this.queueSessionSnapshotBroadcast();
  }

  removeFromInitiative(tokenId: string) {
    this.initiativeOrder = this.initiativeOrder.filter((id) => id !== tokenId);
    if (this.turnIndex >= this.initiativeOrder.length) {
      this.turnIndex = Math.max(0, this.initiativeOrder.length - 1);
    }
    this.queueSessionSnapshotBroadcast();
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
    this.queueSessionSnapshotBroadcast();
  }

  private sortInitiativeOrder() {
    return [...this.initiativeOrder].sort((a, b) => {
      const left = this.initiativeValues[a] ?? 0;
      const right = this.initiativeValues[b] ?? 0;
      if (left !== right) return right - left;
      return (this.tokens[b]?.zIndex ?? 0) - (this.tokens[a]?.zIndex ?? 0);
    });
  }

  private sortAndPersist() {
    this.initiativeOrder = this.sortInitiativeOrder();
    this.persistDraft();
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
    this.emit({
      type: "TURN_ADVANCE",
      turnIndex: this.turnIndex,
      round: this.round,
      activeTokenId,
    });
    return activeTokenId;
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

  async saveEncounterSnapshot(
    encounterId = this.sessionId ?? crypto.randomUUID(),
  ) {
    if (!this.mapId) return null;
    const result = await this.service.saveEncounterSnapshot(
      this.createSnapshot(),
      encounterId,
    );
    this.savedAt = Date.now();
    this.snapshots = [
      result.summary,
      ...this.snapshots.filter((s) => s.id !== encounterId),
    ];
    this.persistDraft();
    return result;
  }

  startNewEncounter(name = this.name) {
    if (!this.mapId) return null;

    const session = createEncounterSession(
      this.mapId,
      crypto.randomUUID(),
      name.trim() || this.name || "Encounter",
    );

    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
    this.clearPings();

    this.sessionId = session.id;
    this.mode = session.mode;
    this.name = session.name;
    this.tokens = {};
    this.initiativeOrder = [];
    this.initiativeValues = {};
    this.round = 1;
    this.turnIndex = 0;
    this.selection = null;
    this.pendingTokenCoords = null;
    this.sessionFogMask = null;
    this.lastPing = null;
    this.measurement = cloneMeasurement(session.measurement);
    this.createdAt = session.createdAt;
    this.savedAt = null;
    this.chatMessages = [];
    this.persistDraft();
    return session;
  }

  async refreshEncounterSnapshots() {
    if (!this.mapId) {
      this.snapshots = [];
      return [];
    }
    this.snapshots = await this.service.listEncounterSnapshots(this.mapId);
    return this.snapshots;
  }

  async loadEncounterSnapshot(encounterId: string) {
    if (!this.mapId) return null;
    const snapshot = await this.service.loadEncounterSnapshot(
      this.mapId,
      encounterId,
    );
    this.applySnapshot(snapshot, true);
    this.persistDraft();
    return snapshot;
  }

  async deleteEncounterSnapshot(encounterId: string) {
    if (!this.mapId) return null;
    await this.service.deleteEncounterSnapshot(this.mapId, encounterId);
    this.snapshots = this.snapshots.filter(
      (snapshot) => snapshot.id !== encounterId,
    );
    return true;
  }

  syncFromRemoteSession(snapshot: EncounterSession, persist = true) {
    if (snapshot.mapId && this.mapId && snapshot.mapId !== this.mapId) {
      return;
    }
    this.applySnapshot(snapshot, true);
    if (snapshot.mapId && this.deps.mapStore.activeMapId !== snapshot.mapId) {
      this.deps.mapStore.selectMap(snapshot.mapId);
    }
    this.vttEnabled = true;
    this.hasHydratedSession = true;
    this.queueDraftPersist();
    if (persist) {
      this.queueSessionSnapshotBroadcast();
    }
  }

  handleRemoteTokenAdded(token: Token) {
    this.tokens = { ...this.tokens, [token.id]: normalizeToken(token) };
    if (!this.initiativeOrder.includes(token.id)) {
      this.initiativeOrder = [...this.initiativeOrder, token.id];
    }
    this.initiativeValues = {
      ...this.initiativeValues,
      [token.id]: this.initiativeValues[token.id] ?? 0,
    };
    this.persistDraft();
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
    const before = this.tokens[tokenId]
      ? {
          ownerPeerId: this.tokens[tokenId].ownerPeerId,
          visibleTo: this.tokens[tokenId].visibleTo,
        }
      : null;
    console.log("[MapSession] handleRemoteTokenUpdate", {
      tokenId,
      before,
      delta,
    });
    this.clearPendingMove(tokenId);
    const updated = this.updateToken(tokenId, delta, true);
    console.log("[MapSession] handleRemoteTokenUpdate applied", {
      tokenId,
      after: updated
        ? {
            ownerPeerId: updated.ownerPeerId,
            ownerGuestName: updated.ownerGuestName,
            visibleTo: updated.visibleTo,
          }
        : null,
      canGuestSee: updated ? updated.visibleTo !== "gm-only" : null,
    });
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.clearPendingMove(tokenId);
    this.removeToken(tokenId, true);
  }

  handleRemoteMode(mode: SessionMode) {
    this.mode = mode;
    this.persistDraft();
  }

  handleRemoteTurn(turnIndex: number, round: number) {
    this.turnIndex = turnIndex;
    this.round = round;
    this.persistDraft();
  }

  handleRemoteFogMask(mask: string | null) {
    this.sessionFogMask = mask;
    this.persistDraft();
  }

  handleRemoteGridSettings(payload: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    if (payload.gridSize !== undefined) {
      this.deps.mapStore.gridSize = payload.gridSize;
    }
    if (payload.gridUnit !== undefined) {
      this.gridUnit = payload.gridUnit;
    }
    if (payload.gridDistance !== undefined) {
      this.gridDistance = payload.gridDistance;
    }
    this.persistDraft();
  }

  setGridSettings(settings: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    if (settings.gridSize !== undefined) {
      this.deps.mapStore.gridSize = settings.gridSize;
    }
    if (settings.gridUnit !== undefined) {
      this.gridUnit = settings.gridUnit;
    }
    if (settings.gridDistance !== undefined) {
      this.gridDistance = settings.gridDistance;
    }
    this.emit({
      type: "SET_GRID_SETTINGS",
      ...settings,
    });
  }

  handleRemotePing(
    x: number,
    y: number,
    peerId: string,
    color?: string,
    timestamp?: number,
  ) {
    const resolvedColor = color || hashToColor(peerId);
    this.registerPing({
      x,
      y,
      peerId,
      color: resolvedColor,
      timestamp: timestamp ?? Date.now(),
    });
  }

  handleRemoteMeasurement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    peerId: string,
    active: boolean,
  ) {
    if (!active) {
      if (this.activeMeasurement?.peerId === peerId) {
        this.activeMeasurement = null;
      }
      return;
    }

    this.activeMeasurement = {
      active: true,
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      peerId,
    };
    this.persistDraft();
  }

  ping(x: number, y: number) {
    if (!this.mapId) return;
    const peerId = this.myPeerId || "host";
    const color = hashToColor(peerId);
    const pingObj = {
      x,
      y,
      peerId,
      color,
      timestamp: Date.now(),
    };
    this.registerPing(pingObj);
    this.emit({
      type: "PING",
      ...pingObj,
    });
  }

  pingToken(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token) return;
    this.ping(token.x + token.width / 2, token.y + token.height / 2);
  }

  getSnapshotSummary() {
    return summarizeEncounterSession(this.createSnapshot());
  }
}

const MAP_SESSION_KEY = "__codex_map_session_instance__";
export const mapSession: MapSessionStore =
  (globalThis as any)[MAP_SESSION_KEY] ??
  ((globalThis as any)[MAP_SESSION_KEY] = new MapSessionStore({
    mapStore,
    vault,
  }));

if (typeof window !== "undefined") {
  (window as any).mapSession = mapSession;
}
