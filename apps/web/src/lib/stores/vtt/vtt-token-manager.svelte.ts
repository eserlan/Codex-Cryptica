import type {
  DragPreview,
  SessionMode,
  Token,
  TokenBaseShape,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../../types/vtt";
import type { Point } from "schema";
import {
  normalizeToken,
  normalizeTokenRotation,
  normalizeTokenVisibility,
  nextZIndexInLayer,
  isNoteCollapsed,
  NOTE_COLLAPSED_SCALE,
  getHexRange,
  hexToPoint,
  pointToHex,
  type HexGridConfig,
  type MapLayer,
} from "map-engine";
import {
  snapToGrid,
  clampPointToBounds,
  hashToColor,
} from "$lib/utils/vtt-helpers";
import { snapToNeighborTiles } from "@codex/spatial-engine";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

const SQRT_3 = Math.sqrt(3);
const TOKEN_COORD_PRECISION = 2;
/** Smallest a freshly-placed character token defaults to, regardless of how fine the map's grid is. */
const MIN_DEFAULT_TOKEN_SIZE = 30;
/** Sticky-note amber. Notes are GM furniture, so they get one recognisable
 * colour rather than a name-hashed one. */
export const NOTE_DEFAULT_COLOR = "#f5b942";
/** Notes hold prose, not a portrait — give them more room than a token. */
const NOTE_SIZE_MULTIPLIER = 1.5;
/** A collapsed note still has to be big enough to click on a fine grid. */
const MIN_COLLAPSED_NOTE_SIZE = 16;

function isHexShaped(shape: string | undefined) {
  return shape === "hex" || shape === "hex-pointy" || shape === "hex-flat";
}

/** Supported token sizes below one grid cell: quarter and half. */
const FRACTIONAL_CELLS = [0.25, 0.5] as const;
const FRACTION_TOLERANCE = 0.02;

/**
 * A side measured in grid cells. Beyond one cell it rounds to whole cells.
 * Below one it stays at a half or quarter cell only if it already is one, so a
 * stray in-between size still becomes a whole cell rather than a fraction.
 */
function sideInCells(cells: number): number {
  const fraction = FRACTIONAL_CELLS.find(
    (f) => Math.abs(cells - f) <= FRACTION_TOLERANCE,
  );
  return fraction ?? Math.max(1, Math.round(cells));
}

function roundTokenCoordinate(value: number) {
  const factor = 10 ** TOKEN_COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function findBoundedHexPosition(
  targetCentre: Point,
  config: HexGridConfig,
  bounds: { width: number; height: number },
  width: number,
  height: number,
  fallback: Point,
): Point {
  const minCentreX = -bounds.width / 2 + width / 2;
  const maxCentreX = bounds.width / 2 - width / 2;
  const minCentreY = -bounds.height / 2 + height / 2;
  const maxCentreY = bounds.height / 2 - height / 2;
  const canFit = minCentreX <= maxCentreX && minCentreY <= maxCentreY;
  const searchCentre = canFit
    ? {
        x: Math.min(Math.max(targetCentre.x, minCentreX), maxCentreX),
        y: Math.min(Math.max(targetCentre.y, minCentreY), maxCentreY),
      }
    : targetCentre;
  const searchHex = pointToHex(searchCentre, config);
  const validCells = getHexRange(searchHex, 3)
    .map((hex) => ({ centre: hexToPoint(hex, config) }))
    .filter(
      ({ centre }) =>
        centre.x >= minCentreX &&
        centre.x <= maxCentreX &&
        centre.y >= minCentreY &&
        centre.y <= maxCentreY,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.centre.x - targetCentre.x, a.centre.y - targetCentre.y) -
        Math.hypot(b.centre.x - targetCentre.x, b.centre.y - targetCentre.y),
    );

  if (validCells.length === 0) {
    return clampPointToBounds(fallback, bounds, { width, height });
  }

  return {
    x: validCells[0].centre.x - width / 2,
    y: validCells[0].centre.y - height / 2,
  };
}

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

  private pendingTokenMoves = new Map<
    string,
    { previous: Token; timeoutId: number }
  >();
  private pendingTokenRotations = new Map<
    string,
    { previous: Token; timeoutId: number }
  >();

  allTokens = $derived.by(() => Object.values(this.tokens));
  selectedToken = $derived.by(() => {
    if (!this.selection) return null;
    return this.tokens[this.selection] ?? null;
  });

  constructor(
    private deps: VTTTokenManagerDependencies,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {}

  reset() {
    this.tokens = {};
    this.selection = null;
    this.selectedTokens = new Set();
    this.pendingTokenCoords = null;
    this.pendingNoteCoords = null;
    this.notePlacementArmed = false;
    this.draggingTokenId = null;
    this.dragPreview = null;
    for (const pending of this.pendingTokenMoves.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenMoves.clear();
    for (const pending of this.pendingTokenRotations.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenRotations.clear();
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

  /**
   * Folds a note down to a marker, or springs it back to the size it had.
   * A collapsed note keeps its body — it is only taking up less of the map,
   * the way a pin does, so a stocked dungeon does not bury its own art.
   */
  toggleNoteCollapsed(tokenId: string) {
    const token = this.tokens[tokenId];
    if (!token || token.kind !== "note") return null;

    if (isNoteCollapsed(token)) {
      const restored = token.noteCollapsedFrom!;
      return this.updateToken(tokenId, {
        width: restored.width,
        height: restored.height,
        noteCollapsedFrom: undefined,
      });
    }

    const collapsed = this.collapsedNoteSize();
    return this.updateToken(tokenId, {
      width: collapsed,
      height: collapsed,
      noteCollapsedFrom: { width: token.width, height: token.height },
    });
  }

  /** The side length a note takes when it is folded down to a marker. */
  private collapsedNoteSize() {
    const mapStore = this.deps.getMapStore();
    return Math.max(
      MIN_COLLAPSED_NOTE_SIZE,
      Math.round((mapStore.gridSize || 50) * NOTE_COLLAPSED_SCALE),
    );
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
    const mapStore = this.deps.getMapStore();
    const kind = input.kind ?? "token";
    const isNote = kind === "note";
    const isTile = kind === "tile";
    // gridSize can legitimately be very small — it's fit to a tile's native
    // pixel grid (e.g. ~15px for some geomorph packs), which is correct for
    // alignment/snapping but useless as a default character-token size: a
    // 15px circle is effectively invisible. Floor the default independently
    // of how fine the underlying grid happens to be.
    const mapGrid = Math.max(MIN_DEFAULT_TOKEN_SIZE, mapStore.gridSize || 50);
    const noteExpandedSize = Math.round(mapGrid * NOTE_SIZE_MULTIPLIER);
    const defaultSize = isNote ? noteExpandedSize : mapGrid;
    // A note lands folded down to a marker, so a stocked dungeon reads as a
    // field of pins rather than a wall of paper laid over the map art. It
    // springs back to `noteCollapsedFrom` when the GM opens it. A caller that
    // asks for an explicit size wants the note at that size, so it lands open.
    const landsCollapsed = isNote && input.width === undefined;
    const size = landsCollapsed ? this.collapsedNoteSize() : defaultSize;
    const defaultShape: TokenBaseShape = isNote
      ? "square"
      : isTile
        ? mapStore.gridType === "hex-flat"
          ? "hex-flat"
          : mapStore.gridType === "hex-pointy"
            ? "hex-pointy"
            : "square"
        : "circle";
    return {
      id: this.idGenerator.uuid(),
      entityId: input.entityId ?? null,
      name: input.name.trim(),
      x: input.x,
      y: input.y,
      width: input.width ?? size,
      height: input.height ?? size,
      rotation: input.rotation ?? 0,
      baseShape: input.baseShape ?? defaultShape,
      facingIndicator: input.facingIndicator ?? !isNote,
      zIndex: input.zIndex ?? Object.keys(this.tokens).length,
      ownerPeerId: input.ownerPeerId ?? null,
      ownerGuestName: input.ownerGuestName ?? null,
      // A note is the GM's own annotation: it stays hidden until they
      // deliberately reveal it, where a character token defaults to visible.
      visibleTo: normalizeTokenVisibility(
        input.visibleTo ?? (isNote ? "gm-only" : "all"),
      ),
      color:
        input.color || (isNote ? NOTE_DEFAULT_COLOR : hashToColor(input.name)),
      imageUrl: input.imageUrl ?? null,
      statusEffects: [],
      locked: input.locked === true,
      isVisionSource: input.isVisionSource === true,
      kind,
      tileDeckId: input.tileDeckId ?? null,
      tileDetails: input.tileDetails,
      noteBody: isNote ? (input.noteBody ?? "") : undefined,
      noteCollapsedFrom: isNote
        ? (input.noteCollapsedFrom ??
          (landsCollapsed
            ? { width: noteExpandedSize, height: noteExpandedSize }
            : undefined))
        : undefined,
      layer: input.layer ?? this.deps.getActiveLayer(),
    };
  }

  /**
   * The visible hex grid, or null on a square/hidden grid. Tiles on a hex grid
   * are placed by cell, not by pixel: a hex image is not a square, so the
   * square-grid snap would both crop its points and leave it off-centre.
   */
  private hexGridConfig(): HexGridConfig | null {
    const mapStore = this.deps.getMapStore();
    if (!mapStore.activeMap || !mapStore.showGrid) return null;
    if (
      mapStore.gridType !== "hex-flat" &&
      mapStore.gridType !== "hex-pointy"
    ) {
      return null;
    }
    return {
      orientation: mapStore.gridType === "hex-flat" ? "flat" : "pointy",
      size: mapStore.gridSize || 50,
      offsetX: mapStore.gridOffsetX || 0,
      offsetY: mapStore.gridOffsetY || 0,
    };
  }

  /**
   * Snaps a tile's centre to the centre of its hex cell. With `fitCell` the
   * box also becomes the cell's own bounding box (2R x sqrt(3)R for flat-top,
   * sqrt(3)R x 2R for pointy-top), which is exactly the box a hex tile image
   * is cut to. Returns null when the grid isn't hex.
   */
  snapTileToHexCell(
    point: Point,
    size: { width: number; height: number },
    fitCell = false,
  ): { x: number; y: number; width: number; height: number } | null {
    const mapStore = this.deps.getMapStore();
    const config = this.hexGridConfig();
    if (!config) return null;
    const flat = config.orientation === "flat";
    const width = fitCell ? (flat ? 2 : SQRT_3) * config.size : size.width;
    const height = fitCell ? (flat ? SQRT_3 : 2) * config.size : size.height;
    const targetCentre = {
      x: point.x + size.width / 2,
      y: point.y + size.height / 2,
    };
    const targetHex = pointToHex(targetCentre, config);
    const centre = hexToPoint(targetHex, config);
    const topLeft = { x: centre.x - width / 2, y: centre.y - height / 2 };
    let bounded = topLeft;
    if (mapStore.activeMap) {
      // Clamping the box directly moves it off-grid. Near an image edge, pick
      // the closest neighbouring whole cell that fits inside the map instead.
      bounded = findBoundedHexPosition(
        targetCentre,
        config,
        mapStore.activeMap.dimensions,
        width,
        height,
        topLeft,
      );
    }
    const rounded = {
      x: roundTokenCoordinate(bounded.x),
      y: roundTokenCoordinate(bounded.y),
    };
    const finalPosition = mapStore.activeMap
      ? clampPointToBounds(rounded, mapStore.activeMap.dimensions, {
          width,
          height,
        })
      : rounded;
    return {
      x: finalPosition.x,
      y: finalPosition.y,
      width,
      height,
    };
  }

  /** Identifies the hex cell a rect's centre sits in, or null off a hex grid. */
  hexCellKey(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): string | null {
    const config = this.hexGridConfig();
    if (!config) return null;
    const { q, r } = pointToHex(
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      config,
    );
    return `${q},${r}`;
  }

  /**
   * Snaps a creature token on a hex grid. A token's x/y is its top-left
   * corner, so the snap works on its centre: the centre goes to the middle of
   * the hex it is over, and each side rounds to a whole number of hexes
   * (one hex is sqrt(3)R across the flats), so the smallest token fills a
   * cell instead of being a fraction of one. A hex-shaped token keeps its own
   * bounding box, which is not square.
   */
  private snapTokenToHexCell(
    point: Point,
    size: { width: number; height: number },
    config: HexGridConfig,
    keepSize: boolean,
  ): { x: number; y: number; width: number; height: number } {
    const cell = SQRT_3 * config.size;
    const whole = (side: number) => sideInCells(side / cell) * cell;
    const width = keepSize ? size.width : whole(size.width);
    const height = keepSize ? size.height : whole(size.height);
    const centre = hexToPoint(
      pointToHex(
        { x: point.x + size.width / 2, y: point.y + size.height / 2 },
        config,
      ),
      config,
    );
    return {
      x: centre.x - width / 2,
      y: centre.y - height / 2,
      width,
      height,
    };
  }

  clampAndSnapPosition(
    point: Point,
    tokenSize: { width: number; height: number },
    // Notes opt out: grid snapping exists so creatures occupy whole cells,
    // and a note is an annotation rather than something standing in a cell.
    // Snapping it would also floor it at one full cell, which a collapsed
    // note is deliberately smaller than.
    {
      snapToTheGrid = true,
      hexShaped = false,
    }: { snapToTheGrid?: boolean; hexShaped?: boolean } = {},
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

    const hexConfig = snapToTheGrid ? this.hexGridConfig() : null;
    if (hexConfig) {
      ({
        x: targetX,
        y: targetY,
        width: targetWidth,
        height: targetHeight,
      } = this.snapTokenToHexCell(point, tokenSize, hexConfig, hexShaped));
    } else if (mapStore.showGrid && snapToTheGrid) {
      const gridSize = mapStore.gridSize;
      const offsetX = mapStore.gridOffsetX;
      const offsetY = mapStore.gridOffsetY;

      // Snap position to grid lines
      const snapped = snapToGrid(point, gridSize, offsetX, offsetY);
      targetX = snapped.x;
      targetY = snapped.y;

      // Snap size to nearest grid cell multiple
      targetWidth = gridSize
        ? sideInCells(tokenSize.width / gridSize) * gridSize
        : tokenSize.width;
      targetHeight = gridSize
        ? sideInCells(tokenSize.height / gridSize) * gridSize
        : tokenSize.height;
    }

    // Always clamp to map bounds to prevent invisible placements
    const clamped = hexConfig
      ? findBoundedHexPosition(
          {
            x: targetX + targetWidth / 2,
            y: targetY + targetHeight / 2,
          },
          hexConfig,
          activeMap.dimensions,
          targetWidth,
          targetHeight,
          { x: targetX, y: targetY },
        )
      : clampPointToBounds({ x: targetX, y: targetY }, activeMap.dimensions, {
          width: targetWidth,
          height: targetHeight,
        });

    return {
      x: clamped.x,
      y: clamped.y,
      width: targetWidth,
      height: targetHeight,
    };
  }

  /**
   * Map coordinates at the middle of what is currently on screen. Notes
   * created from outside the map (a table roll, a toolbar button) have no
   * click position to land on, and the map origin is often scrolled out of
   * view — dropping them where the GM is already looking keeps them findable.
   */
  viewportCenterPoint(): Point {
    const mapStore = this.deps.getMapStore();
    const canvasSize = mapStore.canvasSize;
    if (!canvasSize?.width || !canvasSize?.height) return { x: 0, y: 0 };
    const point = mapStore.unproject({
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    });
    return {
      x: roundTokenCoordinate(point.x),
      y: roundTokenCoordinate(point.y),
    };
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

    const sizeChanged =
      updates.width !== undefined || updates.height !== undefined;
    const posChanged = updates.x !== undefined || updates.y !== undefined;
    const permissionChanged =
      updates.ownerPeerId !== undefined ||
      updates.ownerGuestName !== undefined ||
      updates.visibleTo !== undefined;
    const statusChanged = updates.statusEffects !== undefined;
    const visionSourceChanged = updates.isVisionSource !== undefined;
    const shouldDebounceBroadcast = posChanged || sizeChanged;

    const movedPoint = {
      x: updates.x !== undefined ? roundTokenCoordinate(updates.x) : current.x,
      y: updates.y !== undefined ? roundTokenCoordinate(updates.y) : current.y,
    };
    const movedSize = {
      width: updates.width ?? current.width,
      height: updates.height ?? current.height,
    };
    const hexSnapped =
      current.kind === "tile" && (posChanged || sizeChanged)
        ? this.snapTileToHexCell(movedPoint, movedSize)
        : null;
    const snapped =
      posChanged || sizeChanged
        ? (hexSnapped ??
          this.clampAndSnapPosition(
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
            {
              snapToTheGrid: current.kind !== "note",
              hexShaped: isHexShaped(current.baseShape),
            },
          ))
        : {
            x: current.x,
            y: current.y,
            width: current.width,
            height: current.height,
          };

    // Repositioning a placed tile magnetically aligns it to nearby tiles'
    // edges too, same as initial placement — otherwise dragging a tile to
    // nudge it into alignment with its neighbors would only grid-snap.
    if (current.kind === "tile" && !hexSnapped && (posChanged || sizeChanged)) {
      // ⚡ Bolt Optimization: Avoid intermediate array allocations during token movement hot path
      const neighbors: Token[] = [];
      for (const key in this.tokens) {
        if (Object.prototype.hasOwnProperty.call(this.tokens, key)) {
          const token = this.tokens[key];
          if (token.kind === "tile" && token.id !== tokenId) {
            neighbors.push(token);
          }
        }
      }
      const snapThreshold = Math.max(12, snapped.width * 0.12);
      const tileSnapped = snapToNeighborTiles(
        snapped,
        neighbors,
        snapThreshold,
      );
      snapped.x = tileSnapped.x;
      snapped.y = tileSnapped.y;
    }

    const next = {
      ...current,
      ...updates,
      visibleTo:
        updates.visibleTo !== undefined
          ? normalizeTokenVisibility(updates.visibleTo)
          : current.visibleTo,
      x: snapped.x,
      y: snapped.y,
      rotation:
        updates.rotation !== undefined
          ? normalizeTokenRotation(updates.rotation)
          : current.rotation,
    };

    // Apply snapped size (always, not just when sizeChanged)
    next.width = snapped.width;
    next.height = snapped.height;

    this.tokens = {
      ...this.tokens,
      [tokenId]: next,
    };

    if (posChanged && (snapped.x !== current.x || snapped.y !== current.y)) {
      const dx = snapped.x - current.x;
      const dy = snapped.y - current.y;
      for (const childId in this.tokens) {
        const child = this.tokens[childId];
        if (child && child.parentTokenId === tokenId) {
          this.tokens[childId] = {
            ...child,
            x: roundTokenCoordinate(child.x + dx),
            y: roundTokenCoordinate(child.y + dy),
          };
        }
      }
    }

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
      if (permissionChanged || statusChanged || visionSourceChanged) {
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

  private clearPendingRotation(tokenId: string) {
    const pending = this.pendingTokenRotations.get(tokenId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    this.pendingTokenRotations.delete(tokenId);
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

  requestTokenRotation(tokenId: string, rotation: number, persistent = false) {
    const previous = this.tokens[tokenId];
    if (!previous) return null;
    const updated = this.updateToken(tokenId, { rotation }, true);
    if (updated && !persistent) {
      this.clearPendingRotation(tokenId);
      const timeoutId = window.setTimeout(() => {
        const current = this.tokens[tokenId];
        if (current) {
          this.tokens = {
            ...this.tokens,
            [tokenId]: { ...previous },
          };
          this.deps.persistDraft();
        }
        this.pendingTokenRotations.delete(tokenId);
      }, 500);
      this.pendingTokenRotations.set(tokenId, {
        previous: { ...previous },
        timeoutId,
      });
    }
    return updated;
  }

  confirmTokenRotation(tokenId: string) {
    this.clearPendingRotation(tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    if (!this.tokens[tokenId]) return false;
    this.clearPendingMove(tokenId);
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

    this.clearPendingMove(tokenId);
    if (delta.rotation !== undefined) {
      this.clearPendingRotation(tokenId);
    }
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
    for (const pending of this.pendingTokenRotations.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTokenRotations.clear();
  }
}
