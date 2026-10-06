import type { Point } from "schema";
import {
  hexToPoint,
  hexTravel,
  newlyRevealedHexes,
  visionRangeInHexes,
} from "map-engine";
import type { HexGridConfig, HexCoord } from "map-engine";
import type { Token } from "../../../types/vtt";
import {
  formatMapMove,
  type JournalCapturePayload,
} from "session-journal-engine";
import type { TokenVisionRevealer as TokenVisionRevealerContract } from "./token-vision-revealer";
import {
  MaskUndoRecorder,
  type MaskUndoRecorder as MaskUndoRecorderContract,
} from "./mask-undo-recorder";
import { visionRangeToPixels } from "./vtt-vision";
import type { MapFogPainter } from "./map-fog-painter";
import type { MapStore } from "$lib/stores/map.svelte";
import type { MapSessionStore } from "$lib/stores/map-session.svelte";
import type { SessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import type { OracleStore } from "$lib/stores/oracle.svelte";
import { TokenVisionRevealer } from "./token-vision-revealer";
import { getActiveHexConfig } from "./hex-fog-stroke";
import { appEventBus } from "@codex/events";
import { JOURNAL_EVENTS } from "session-journal-engine";

export interface Travel {
  hexes: number | null;
  distance: number;
  unit: string;
}

export interface SoloExplorationState {
  soloOn: boolean;
  canReveal: boolean;
  hex: HexGridConfig | null;
  visionRange: number;
  gridDistance: number;
  gridSize: number;
  gridUnit: string;
  showHexCoordinates: boolean;
  mapId: string | null;
  assetsReady: boolean;
}

export interface SoloExplorationRecorderDeps {
  revealer: Pick<TokenVisionRevealerContract, "reveal">;
  undo: Pick<MaskUndoRecorderContract, "snapshot" | "commit">;
  isRevealedAt: (imgPoint: Point) => boolean;
  publishCapture: (payload: JournalCapturePayload) => void;
  getState: () => SoloExplorationState;
}

interface RevealRadius {
  pixels: number;
  hexes: number | undefined;
}

interface CompletedMove {
  travel: Travel;
  destination: HexCoord | null;
}

interface TokenTravel {
  hexes: number | null;
  distance: number;
  destination: HexCoord | null;
}

export const SOLO_EXPLORATION_CONTEXT = Symbol("solo-exploration-recorder");

export function publishSoloMapMove(payload: JournalCapturePayload): void {
  appEventBus.emit({
    type: JOURNAL_EVENTS.CAPTURE,
    domain: "journal",
    payload,
    metadata: { timestamp: Date.now() },
  });
}

export function createSoloExplorationRecorder(deps: {
  mapStore: MapStore;
  mapSession: MapSessionStore;
  sessionModeStore: SessionModeStore;
  oracle: OracleStore;
  painter: MapFogPainter;
  getMaskCanvas: () => HTMLCanvasElement | null;
  getMapImage: () => HTMLImageElement | null;
  publishCapture: (payload: JournalCapturePayload) => void;
}): SoloExplorationRecorder {
  const revealer = new TokenVisionRevealer({
    mapStore: deps.mapStore,
    getMaskCanvas: deps.getMaskCanvas,
    getMapImage: deps.getMapImage,
  });
  return new SoloExplorationRecorder({
    revealer,
    undo: new MaskUndoRecorder({
      getMaskCanvas: deps.getMaskCanvas,
      createCanvas: () => document.createElement("canvas"),
      mapStore: deps.mapStore,
      oracle: deps.oracle,
    }),
    isRevealedAt: (point) => deps.painter.isRevealedAt(point),
    publishCapture: deps.publishCapture,
    getState: () => ({
      soloOn: deps.mapStore.soloFog && deps.mapStore.showFog,
      canReveal: deps.mapStore.isGMMode && !deps.sessionModeStore.isGuestMode,
      hex: getActiveHexConfig(deps.mapStore),
      visionRange: deps.mapStore.visionRange,
      gridDistance: deps.mapSession.gridDistance,
      gridSize: deps.mapStore.gridSize,
      gridUnit: deps.mapSession.gridUnit,
      showHexCoordinates: deps.mapStore.showHexCoordinates,
      mapId: deps.mapStore.activeMapId,
      assetsReady: Boolean(deps.getMaskCanvas() && deps.getMapImage()),
    }),
  });
}

/** Coordinates live vision reveal with one undo/travel/capture record per completed move. */
export class SoloExplorationRecorder {
  lastMove = $state<Travel | null>(null);
  total = $state<Travel>({ hexes: 0, distance: 0, unit: "" });
  private mapId: string | null = null;
  private readonly lastPointByToken = new Map<string, Point>();
  private readonly startPointByToken = new Map<string, Point>();
  private lastVisionPositions = new Map<string, Point>();
  private lastSoloOn: boolean | null = null;
  private lastAssetsReady = false;
  private pendingBefore: HTMLCanvasElement | null = null;
  private pendingRevealed = new Set<string>();
  private pendingNeedsUndo = false;

  constructor(private readonly deps: SoloExplorationRecorderDeps) {
    this.total = { hexes: 0, distance: 0, unit: deps.getState().gridUnit };
    this.mapId = deps.getState().mapId;
  }

  async onVisionChanged(tokens: Token[]): Promise<boolean> {
    const state = this.deps.getState();
    this.syncMapAndTravelUnit(state);
    const sources = tokens.filter((token) => token.isVisionSource === true);
    if (!state.canReveal || !state.mapId) return false;
    if (sources.length === 0) {
      this.lastVisionPositions.clear();
      return false;
    }

    const shouldRevealSolo = this.shouldRevealSolo(sources, state);
    const shouldReveal = !state.soloOn || shouldRevealSolo;
    const moved = this.collectMovedSources(sources);
    if (!shouldReveal) return false;
    const radius = this.getRevealRadius(state);
    this.recordPendingReveal(state, moved, radius);
    const revealed = await this.deps.revealer.reveal(
      sources,
      radius.pixels,
      radius.hexes,
    );
    if (!state.soloOn) {
      this.rememberCurrentPositions(moved);
      this.clearPendingReveal();
    }
    return revealed;
  }

  async onMoveSettled(tokens: Token[]): Promise<void> {
    const state = this.deps.getState();
    if (state.mapId !== this.mapId) this.clear(state.mapId);
    if (!state.soloOn || !state.canReveal || !state.mapId) {
      this.clearPendingReveal();
      return;
    }

    const move = this.measureMove(tokens, state);
    if (move) this.recordCompletedMove(move, state);
    this.clearPendingReveal();
  }

  reset(): void {
    const unit = this.deps.getState().gridUnit;
    this.lastMove = null;
    this.total = { hexes: 0, distance: 0, unit };
    this.startPointByToken.clear();
    this.clearPendingReveal();
  }

  private collectMovedSources(sources: Token[]): Token[] {
    const moved: Token[] = [];
    for (const token of sources) {
      const point = { x: token.x, y: token.y };
      const previous = this.lastPointByToken.get(token.id);
      if (previous && (previous.x !== point.x || previous.y !== point.y)) {
        moved.push(token);
        if (!this.startPointByToken.has(token.id))
          this.startPointByToken.set(token.id, previous);
      } else if (!previous) {
        this.lastPointByToken.set(token.id, point);
      }
    }
    return moved;
  }

  private syncMapAndTravelUnit(state: SoloExplorationState): void {
    if (state.mapId !== this.mapId) this.clear(state.mapId);
    if (this.total.distance === 0 && this.total.unit !== state.gridUnit) {
      this.total = { ...this.total, unit: state.gridUnit };
    }
  }

  private shouldRevealSolo(
    sources: Token[],
    state: SoloExplorationState,
  ): boolean {
    const movedOrAdded = sources.some((token) => {
      const previous = this.lastVisionPositions.get(token.id);
      return !previous || previous.x !== token.x || previous.y !== token.y;
    });
    const enteredSolo = state.soloOn && this.lastSoloOn !== true;
    const assetsBecameReady = state.assetsReady && !this.lastAssetsReady;

    this.lastVisionPositions = new Map(
      sources.map((token) => [token.id, { x: token.x, y: token.y }]),
    );
    this.lastSoloOn = state.soloOn;
    this.lastAssetsReady = state.assetsReady;
    return movedOrAdded || enteredSolo || assetsBecameReady;
  }

  private rememberCurrentPositions(tokens: Token[]): void {
    for (const token of tokens) {
      this.lastPointByToken.set(token.id, { x: token.x, y: token.y });
      this.startPointByToken.delete(token.id);
    }
  }

  private getRevealRadius(state: SoloExplorationState): RevealRadius {
    const hexes = state.hex
      ? visionRangeInHexes(state.visionRange, state.gridDistance)
      : undefined;
    return {
      hexes,
      pixels: state.hex
        ? (hexes ?? 0) * state.hex.size * 1.5
        : visionRangeToPixels(
            state.visionRange,
            state.gridDistance,
            state.gridSize,
          ),
    };
  }

  private recordPendingReveal(
    state: SoloExplorationState,
    moved: Token[],
    radius: RevealRadius,
  ): void {
    if (!this.shouldInspectReveal(state, moved)) return;
    const newly = this.findNewHexes(moved, state, radius);
    if (newly.length === 0 && !this.hasNewCircleFog(moved, state, radius))
      return;

    if (!this.pendingBefore) this.pendingBefore = this.deps.undo.snapshot();
    this.pendingNeedsUndo = true;
    for (const hex of newly) this.pendingRevealed.add(`${hex.q},${hex.r}`);
  }

  private shouldInspectReveal(
    state: SoloExplorationState,
    moved: Token[],
  ): boolean {
    return state.soloOn && moved.length > 0;
  }

  private findNewHexes(
    moved: Token[],
    state: SoloExplorationState,
    radius: RevealRadius,
  ): HexCoord[] {
    if (!state.hex) return [];
    return this.findNewHexesInGrid(moved, state.hex, radius.hexes ?? 0);
  }

  private hasNewCircleFog(
    moved: Token[],
    state: SoloExplorationState,
    radius: RevealRadius,
  ): boolean {
    return state.hex ? false : this.hasFogInAnyCircle(moved, radius.pixels);
  }

  private findNewHexesInGrid(
    tokens: Token[],
    config: HexGridConfig,
    radius: number,
  ): HexCoord[] {
    return tokens.flatMap((token) =>
      newlyRevealedHexes(
        this.toHex({ x: token.x, y: token.y }, config),
        radius,
        (hex) => this.deps.isRevealedAt(hexToPoint(hex, config)),
      ),
    );
  }

  private hasFogInCircle(token: Token, radius: number): boolean {
    const steps = Math.max(1, Math.ceil(radius / 16));
    for (let step = 0; step <= steps; step++) {
      const distance = (radius * step) / steps;
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
        const point = {
          x: token.x + Math.cos(angle) * distance,
          y: token.y + Math.sin(angle) * distance,
        };
        if (!this.deps.isRevealedAt(point)) return true;
      }
    }
    return false;
  }

  private hasFogInAnyCircle(tokens: Token[], radius: number): boolean {
    return tokens.some((token) => this.hasFogInCircle(token, radius));
  }

  private measureMove(
    tokens: Token[],
    state: SoloExplorationState,
  ): CompletedMove | null {
    const measured = tokens
      .filter((token) => token.isVisionSource === true)
      .map((token) => this.measureTokenMove(token, state))
      .filter((travel): travel is TokenTravel => travel !== null);
    const hexes = measured.reduce(
      (sum, travel) => sum + (travel.hexes ?? 0),
      0,
    );
    const distance = measured.reduce((sum, travel) => sum + travel.distance, 0);
    if (distance <= 0) return null;
    return {
      travel: {
        hexes: state.hex ? hexes : null,
        distance,
        unit: state.gridUnit,
      },
      destination:
        [...measured].reverse().find((travel) => travel.destination)
          ?.destination ?? null,
    };
  }

  private measureTokenMove(
    token: Token,
    state: SoloExplorationState,
  ): TokenTravel | null {
    const point = { x: token.x, y: token.y };
    const from =
      this.startPointByToken.get(token.id) ??
      this.lastPointByToken.get(token.id);
    this.lastPointByToken.set(token.id, point);
    this.startPointByToken.delete(token.id);
    if (!from || (from.x === point.x && from.y === point.y)) return null;
    return this.measureTokenTravel(from, point, state);
  }

  private measureTokenTravel(
    from: Point,
    to: Point,
    state: SoloExplorationState,
  ): TokenTravel {
    if (state.hex) {
      const result = hexTravel(from, to, state.hex);
      return {
        hexes: result.hexes,
        distance: result.hexes * state.gridDistance,
        destination: result.hexes > 0 ? result.to : null,
      };
    }
    const pixelsPerUnit =
      state.gridSize > 0 ? state.gridDistance / state.gridSize : 1;
    return {
      hexes: null,
      distance: Math.hypot(to.x - from.x, to.y - from.y) * pixelsPerUnit,
      destination: null,
    };
  }

  private recordCompletedMove(
    move: CompletedMove,
    state: SoloExplorationState,
  ): void {
    this.lastMove = move.travel;
    this.total = {
      hexes: state.hex
        ? (this.total.hexes ?? 0) + (move.travel.hexes ?? 0)
        : null,
      distance: this.total.distance + move.travel.distance,
      unit: state.gridUnit,
    };
    if (this.pendingBefore && this.pendingNeedsUndo)
      this.deps.undo.commit("Map Exploration", this.pendingBefore);
    this.deps.publishCapture(
      formatMapMove({
        mapId: state.mapId!,
        toHex: move.destination,
        hexes: move.travel.hexes,
        distance: move.travel.distance,
        unit: move.travel.unit,
        revealed: this.pendingRevealed.size,
        showCoordinates: state.showHexCoordinates,
      }),
    );
  }

  private clearPendingReveal(): void {
    this.pendingBefore = null;
    this.pendingRevealed.clear();
    this.pendingNeedsUndo = false;
  }

  private clear(mapId: string | null): void {
    this.reset();
    this.lastPointByToken.clear();
    this.lastVisionPositions.clear();
    this.lastSoloOn = null;
    this.lastAssetsReady = false;
    this.mapId = mapId;
  }

  private toHex(point: Point, config: HexGridConfig): HexCoord {
    return hexTravel(point, point, config).to;
  }
}
