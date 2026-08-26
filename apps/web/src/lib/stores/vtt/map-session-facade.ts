import { summarizeEncounterSession } from "$lib/services/vtt-session";
import type { RollResult } from "dice-engine";
import type { Point } from "schema";
import type { VTTChatManager } from "./vtt-chat-manager.svelte";
import type { VTTEncounterManager } from "./vtt-encounter-manager.svelte";
import type { VTTGridManager } from "./vtt-grid-manager.svelte";
import type { VTTInitiativeManager } from "./vtt-initiative-manager.svelte";
import type { VTTLayerManager } from "./vtt-layer-manager.svelte";
import type { VTTMeasurementManager } from "./vtt-measurement-manager.svelte";
import type { VTTMediaManager } from "./vtt-media-manager.svelte";
import type { VTTNetworkManager } from "./vtt-network-manager.svelte";
import type { VTTPersistenceManager } from "./vtt-persistence-manager.svelte";
import type { VTTSessionLifecycleManager } from "./vtt-session-lifecycle-manager.svelte";
import type { VTTSessionSnapshotManager } from "./vtt-session-snapshot-manager";
import type { VTTTokenManager } from "./vtt-token-manager.svelte";
import type { VTTTileDeckManager } from "./vtt-tile-deck-manager.svelte";
import type {
  ChatCardPayload,
  ChatMessagePayload,
  DragPreview,
  EncounterSession,
  SessionMode,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../../types/vtt";

export abstract class MapSessionFacade {
  abstract vttEnabled: boolean;
  abstract mapId: string | null;
  abstract mode: SessionMode;
  abstract sessionFogMask: string | null;
  abstract myPeerId: string | null;

  encounterManager!: VTTEncounterManager;
  chatManager!: VTTChatManager;
  mediaManager!: VTTMediaManager;
  initiativeManager!: VTTInitiativeManager;
  tokenManager!: VTTTokenManager;
  gridManager!: VTTGridManager;
  layerManager!: VTTLayerManager;
  measurementManager!: VTTMeasurementManager;
  persistenceManager!: VTTPersistenceManager;
  networkManager!: VTTNetworkManager;
  snapshotManager!: VTTSessionSnapshotManager;
  lifecycleManager!: VTTSessionLifecycleManager;
  tileDeckManager!: VTTTileDeckManager;

  get sessionId() {
    return this.encounterManager.sessionId;
  }
  set sessionId(value) {
    this.encounterManager.sessionId = value;
  }
  get name() {
    return this.encounterManager.name;
  }
  set name(value) {
    this.encounterManager.name = value;
  }
  get createdAt() {
    return this.encounterManager.createdAt;
  }
  set createdAt(value) {
    this.encounterManager.createdAt = value;
  }
  get savedAt() {
    return this.encounterManager.savedAt;
  }
  set savedAt(value) {
    this.encounterManager.savedAt = value;
  }
  get snapshots() {
    return this.encounterManager.snapshots;
  }
  set snapshots(value) {
    this.encounterManager.snapshots = value;
  }

  get tokens() {
    return this.tokenManager.tokens;
  }
  set tokens(value) {
    this.tokenManager.tokens = value;
  }
  get selection() {
    return this.tokenManager.selection;
  }
  set selection(value) {
    this.tokenManager.selection = value;
  }
  get selectedTokens() {
    return this.tokenManager.selectedTokens;
  }
  set selectedTokens(value) {
    this.tokenManager.selectedTokens = value;
  }
  get pendingTokenCoords() {
    return this.tokenManager.pendingTokenCoords;
  }
  set pendingTokenCoords(value) {
    this.tokenManager.pendingTokenCoords = value;
  }
  get pendingNoteCoords() {
    return this.tokenManager.pendingNoteCoords;
  }
  set pendingNoteCoords(value) {
    this.tokenManager.pendingNoteCoords = value;
  }
  get draggingTokenId() {
    return this.tokenManager.draggingTokenId;
  }
  set draggingTokenId(value) {
    this.tokenManager.draggingTokenId = value;
  }
  get dragPreview() {
    return this.tokenManager.dragPreview;
  }
  set dragPreview(value) {
    this.tokenManager.dragPreview = value;
  }

  get measurement() {
    return this.measurementManager.measurement;
  }
  set measurement(value) {
    this.measurementManager.measurement = value;
  }
  get activeMeasurement() {
    return this.measurementManager.activeMeasurement;
  }
  set activeMeasurement(value) {
    this.measurementManager.activeMeasurement = value;
  }
  get lastPing() {
    return this.measurementManager.lastPing;
  }
  set lastPing(value) {
    this.measurementManager.lastPing = value;
  }
  get pings() {
    return this.measurementManager.pings;
  }
  set pings(value) {
    this.measurementManager.pings = value;
  }

  get allPings() {
    return this.measurementManager.allPings;
  }

  get gridUnit() {
    return this.gridManager.gridUnit;
  }
  set gridUnit(value) {
    this.gridManager.gridUnit = value;
  }
  get gridDistance() {
    return this.gridManager.gridDistance;
  }
  set gridDistance(value) {
    this.gridManager.gridDistance = value;
  }
  get showGridSettings() {
    return this.gridManager.showGridSettings;
  }
  set showGridSettings(value) {
    this.gridManager.showGridSettings = value;
  }
  get gridFitMode() {
    return this.gridManager.gridFitMode;
  }
  set gridFitMode(value) {
    this.gridManager.gridFitMode = value;
  }
  get gridMoveMode() {
    return this.gridManager.gridMoveMode;
  }
  set gridMoveMode(value) {
    this.gridManager.gridMoveMode = value;
  }
  get activeLayer() {
    return this.layerManager.activeLayer;
  }
  set activeLayer(value) {
    this.layerManager.activeLayer = value;
  }

  get allTokens() {
    return this.tokenManager.allTokens;
  }
  get tileDecks() {
    return this.tileDeckManager.decks;
  }
  createTileDeck(
    name: string,
    tiles: Array<{ name: string; imagePath: string; category?: string }>,
    starterDeckId?: string,
    license?: string,
    sourceUrl?: string,
  ) {
    return this.tileDeckManager.createDeck(
      name,
      tiles,
      starterDeckId,
      license,
      sourceUrl,
    );
  }
  beginStarterTileDeck(
    name: string,
    starterDeckId?: string,
    license?: string,
    sourceUrl?: string,
  ) {
    return this.tileDeckManager.beginDeck(
      name,
      starterDeckId,
      license,
      sourceUrl,
    );
  }
  addTileToDeck(
    deckId: string,
    tile: { name: string; imagePath: string; category?: string },
  ) {
    this.tileDeckManager.addTile(deckId, tile);
  }
  persistTileDecks() {
    this.tileDeckManager.persist();
  }
  removeTileDeck(deckId: string) {
    return this.tileDeckManager.removeDeck(deckId);
  }
  setTileDeckHardEdges(deckId: string, hardEdges: boolean) {
    this.tileDeckManager.setHardEdges(deckId, hardEdges);
  }
  drawTile(deckId: string, size = 150) {
    return this.tileDeckManager.draw(deckId, size);
  }
  drawAnyTile(size = 150) {
    return this.tileDeckManager.drawAny(size);
  }
  selectTile(deckId: string, tileId: string, size = 150) {
    return this.tileDeckManager.select(deckId, tileId, size);
  }
  updatePendingTilePlacement(x: number, y: number) {
    this.tileDeckManager.updatePendingPlacement(x, y);
  }
  placePendingTile() {
    return this.tileDeckManager.placePending();
  }
  cancelPendingTilePlacement() {
    this.tileDeckManager.cancelPendingPlacement();
  }
  get selectedToken() {
    return this.tokenManager.selectedToken;
  }

  get chatMessages() {
    return this.chatManager.chatMessages;
  }
  get sharedTokenImage() {
    return this.mediaManager.sharedTokenImage;
  }

  get initiativeOrder() {
    return this.initiativeManager.initiativeOrder;
  }
  get initiativeValues() {
    return this.initiativeManager.initiativeValues;
  }
  get round() {
    return this.initiativeManager.round;
  }
  get turnIndex() {
    return this.initiativeManager.turnIndex;
  }
  get activeTokenId() {
    return this.initiativeManager.activeTokenId;
  }
  get initiativeEntries() {
    return this.initiativeManager.initiativeEntries;
  }

  setBroadcaster(handler: ((message: VTTMessage) => void) | null) {
    this.networkManager.setBroadcaster(handler);
  }

  refreshPopoutSnapshot() {
    this.persistenceManager.queueDraftPersist();
  }

  private handleActiveMapChange(activeMapId: string | null) {
    this.lifecycleManager.handleActiveMapChange(activeMapId);
  }

  bindToMap(mapId: string) {
    this.lifecycleManager.bindToMap(mapId);
  }

  clearSession(clearDraft = false) {
    this.lifecycleManager.clearSession(clearDraft);
  }

  sendChatMessage(content: string) {
    this.chatManager.sendChatMessage(content, this.vttEnabled);
  }

  sendResolvedRollMessage(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
  ) {
    this.chatManager.sendResolvedRollMessage(formula, result, this.vttEnabled);
  }

  sendCardDrawMessage(deckName: string, cards: ChatCardPayload[]) {
    this.chatManager.sendCardDrawMessage(deckName, cards, this.vttEnabled);
  }

  clearChatMessages() {
    this.chatManager.clearChatMessages(this.vttEnabled);
  }

  handleRemoteChatMessage(payload: ChatMessagePayload) {
    this.networkManager.handleRemoteChatMessage(payload);
  }

  handleRemoteChatClear() {
    this.networkManager.handleRemoteChatClear();
  }

  handleRemoteShowTokenImage(title: string, imagePath: string) {
    this.networkManager.handleRemoteShowTokenImage(title, imagePath);
  }

  clearSharedTokenImage() {
    this.mediaManager.clearSharedTokenImage();
  }

  showTokenImageToPlayers(tokenId: string) {
    return this.mediaManager.showTokenImageToPlayers(tokenId);
  }

  showImageToPlayers(title: string, imagePath: string) {
    return this.mediaManager.showImageToPlayers(title, imagePath);
  }

  createSnapshot(): EncounterSession {
    return this.snapshotManager.createSnapshot();
  }

  applySnapshot(snapshot: EncounterSession, silent = true) {
    this.snapshotManager.applySnapshot(snapshot, silent);
  }

  setVttEnabled(enabled: boolean) {
    this.vttEnabled = enabled;
    this.persistenceManager.persistDraft();
  }

  setMode(mode: SessionMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.networkManager.emit({ type: "SET_MODE", mode });
  }

  setSelection(tokenId: string | null) {
    this.tokenManager.setSelection(tokenId);
  }

  setMultiSelection(tokenIds: string[]) {
    this.tokenManager.setMultiSelection(tokenIds);
  }

  addToSelection(tokenId: string) {
    this.tokenManager.addToSelection(tokenId);
  }

  removeFromSelection(tokenId: string) {
    this.tokenManager.removeFromSelection(tokenId);
  }

  clearSelection() {
    this.tokenManager.clearSelection();
  }

  toggleTokenVisibility(tokenId: string) {
    return this.tokenManager.toggleTokenVisibility(tokenId);
  }

  setVisionSource(tokenId: string, isVisionSource: boolean) {
    return this.tokenManager.setVisionSource(tokenId, isVisionSource);
  }

  isTokenVisible(
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ): boolean {
    return this.tokenManager.isTokenVisible(tokenId, peerId, isHost);
  }

  setSessionFogMask(mask: string | null) {
    this.sessionFogMask = mask;
    this.persistenceManager.persistDraft();
  }

  setMeasurementActive(active: boolean) {
    this.measurementManager.setMeasurementActive(active);
  }

  setMeasurementStart(start: Point | null) {
    this.measurementManager.setMeasurementStart(start);
  }

  setMeasurementEnd(end: Point | null, silent = false) {
    this.measurementManager.setMeasurementEnd(end, silent);
  }

  setMeasurementLocked(locked: boolean) {
    this.measurementManager.setMeasurementLocked(locked);
  }

  clearMeasurement() {
    this.measurementManager.clearMeasurement();
  }

  addToken(input: TokenCreationInput, silent = false) {
    if (!this.mapId) return null;
    return this.tokenManager.addToken(input, silent);
  }

  /** Map coordinates at the middle of the current view. */
  viewportCenterPoint() {
    return this.tokenManager.viewportCenterPoint();
  }

  /**
   * Drops a note on the map at `point`, or at the middle of the current view
   * when no position is given (a table roll has no click position of its own).
   * Returns null when no map is bound, which callers surface as "open a map
   * first" rather than failing silently.
   */
  addNote(
    input: { name: string; body?: string; x?: number; y?: number },
    silent = false,
  ) {
    if (!this.mapId) return null;
    const position =
      input.x !== undefined && input.y !== undefined
        ? { x: input.x, y: input.y }
        : this.tokenManager.viewportCenterPoint();
    return this.tokenManager.addToken(
      {
        name: input.name.trim() || "Note",
        x: position.x,
        y: position.y,
        kind: "note",
        noteBody: input.body ?? "",
        // Always the token layer, whatever the GM has active — a note pinned
        // onto the terrain layer would render underneath the tiles it annotates.
        layer: "token",
      },
      silent,
    );
  }

  requestTokenAdd(input: TokenCreationInput) {
    if (!this.mapId || !this.networkManager.hasBroadcaster) return false;
    return this.tokenManager.requestTokenAdd(input);
  }

  updateToken(tokenId: string, updates: TokenStateUpdateInput, silent = false) {
    if (!this.tileDeckManager.canTransform(tokenId, updates)) return null;
    return this.tokenManager.updateToken(tokenId, updates, silent);
  }

  moveToken(tokenId: string, x: number, y: number, silent = false) {
    return this.updateToken(tokenId, { x, y }, silent);
  }

  requestTokenMove(tokenId: string, x: number, y: number, persistent = false) {
    return this.tokenManager.requestTokenMove(tokenId, x, y, persistent);
  }

  rotateToken(tokenId: string, rotation: number, silent = false) {
    return this.tokenManager.rotateToken(tokenId, rotation, silent);
  }

  toggleTokenLock(tokenId: string) {
    return this.tokenManager.toggleTokenLock(tokenId);
  }

  bringTokenToFront(tokenId: string) {
    return this.tokenManager.bringTokenToFront(tokenId);
  }

  sendTokenToBack(tokenId: string) {
    return this.tokenManager.sendTokenToBack(tokenId);
  }

  requestTokenRotation(tokenId: string, rotation: number, persistent = false) {
    return this.tokenManager.requestTokenRotation(
      tokenId,
      rotation,
      persistent,
    );
  }

  confirmTokenRotation(tokenId: string) {
    this.tokenManager.confirmTokenRotation(tokenId);
  }

  confirmTokenMove(tokenId: string) {
    this.tokenManager.confirmTokenMove(tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    return this.tokenManager.removeToken(tokenId, silent);
  }

  cloneToken(tokenId: string, silent = false) {
    return this.tokenManager.cloneToken(tokenId, silent);
  }

  setTokenOwner(
    tokenId: string,
    ownerPeerId: string | null,
    ownerGuestName: string | null = null,
  ) {
    return this.tokenManager.setTokenOwner(
      tokenId,
      ownerPeerId,
      ownerGuestName,
    );
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    return this.tokenManager.rebindGuestOwnership(peerId, guestName);
  }

  clearGuestOwnership(peerId: string) {
    return this.tokenManager.clearGuestOwnership(peerId);
  }

  setInitiativeValue(tokenId: string, initiativeValue: number) {
    this.initiativeManager.setInitiativeValue(tokenId, initiativeValue);
  }

  addToInitiative(tokenId: string) {
    this.initiativeManager.addToInitiative(tokenId);
  }

  removeFromInitiative(tokenId: string) {
    this.initiativeManager.removeFromInitiative(tokenId);
  }

  reorderInitiative(fromIndex: number, toIndex: number) {
    this.initiativeManager.reorderInitiative(fromIndex, toIndex);
  }

  private sortInitiativeOrder() {
    return this.initiativeManager.sortInitiativeOrder();
  }

  private sortAndPersist() {
    this.initiativeManager.sortAndPersist();
  }

  advanceTurn() {
    return this.initiativeManager.advanceTurn();
  }

  canMoveToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.tokenManager.canMoveToken(tokenId, peerId, isHost);
  }

  canViewToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.tokenManager.canViewToken(tokenId, peerId, isHost);
  }

  canAdvanceTurn(peerId: string | null, isHost = false) {
    return this.initiativeManager.canAdvanceTurn(peerId, isHost);
  }

  saveEncounterSnapshot(encounterId?: string) {
    return this.encounterManager.saveEncounterSnapshot(encounterId);
  }

  startNewEncounter(name?: string) {
    return this.encounterManager.startNewEncounter(name);
  }

  refreshEncounterSnapshots() {
    return this.encounterManager.refreshEncounterSnapshots();
  }

  loadEncounterSnapshot(encounterId: string) {
    return this.encounterManager.loadEncounterSnapshot(encounterId);
  }

  deleteEncounterSnapshot(encounterId: string) {
    return this.encounterManager.deleteEncounterSnapshot(encounterId);
  }

  syncFromRemoteSession(snapshot: EncounterSession, persist = true) {
    this.networkManager.syncFromRemoteSession(snapshot, persist);
  }

  handleRemoteTokenAdded(token: Token) {
    this.networkManager.handleRemoteTokenAdded(token);
  }

  handleRemoteTokenUpdate(tokenId: string, delta: TokenStateUpdateInput) {
    this.networkManager.handleRemoteTokenUpdate(tokenId, delta);
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.networkManager.handleRemoteTokenRemoved(tokenId);
  }

  handleRemoteMode(mode: SessionMode) {
    this.networkManager.handleRemoteMode(mode);
  }

  handleRemoteTurn(turnIndex: number, round: number) {
    this.networkManager.handleRemoteTurn(turnIndex, round);
  }

  handleRemoteFogMask(mask: string | null) {
    this.networkManager.handleRemoteFogMask(mask);
  }

  handleRemoteGridSettings(payload: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    this.networkManager.handleRemoteGridSettings(payload);
  }

  setGridSettings(settings: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    this.gridManager.setGridSettings(settings);
  }

  handleRemotePing(
    x: number,
    y: number,
    peerId: string,
    color?: string,
    timestamp?: number,
  ) {
    this.networkManager.handleRemotePing(x, y, peerId, color, timestamp);
  }

  handleRemoteMeasurement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    peerId: string,
    active: boolean,
  ) {
    this.networkManager.handleRemoteMeasurement(
      startX,
      startY,
      endX,
      endY,
      peerId,
      active,
    );
  }

  ping(x: number, y: number) {
    this.measurementManager.ping(x, y);
  }

  pingToken(tokenId: string) {
    this.measurementManager.pingToken(tokenId);
  }

  setDragPreview(preview: DragPreview | null) {
    this.dragPreview = preview;
  }

  clearDragPreview() {
    this.dragPreview = null;
  }

  getSnapshotSummary() {
    return summarizeEncounterSession(this.createSnapshot());
  }
}
