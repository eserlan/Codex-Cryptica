import type {
  MapLayer,
  TileDeck,
  TileDeckEntry,
  TileDeckStocking,
  Token,
  TokenCreationInput,
} from "../../../types/vtt";
import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
import {
  canPlaceSpatialImage,
  snapToNeighborTiles,
} from "@codex/spatial-engine";
import { nextZIndexInLayer } from "map-engine";

export interface VTTTileDeckManagerDependencies {
  getTokens: () => Record<string, Token>;
  addToken: (input: TokenCreationInput, silent?: boolean) => Token;
  persistDraft: () => void;
  normalizePlacement?: (
    point: { x: number; y: number },
    size: { width: number; height: number },
  ) => { x: number; y: number; width: number; height: number };
  getActiveLayer: () => MapLayer;
  setActiveLayer: (layer: MapLayer) => void;
  /**
   * Rolls the deck's stocking table, returning the table's name and the result
   * text, or null when the table has gone (renamed, deleted, or belonging to
   * another vault). Injected so the manager stays free of the vault-backed
   * source store.
   */
  rollStockingTable?: (
    tableId: string,
  ) => { name: string; text: string } | null;
  /** Pins a note centred on a freshly drawn tile. */
  pinTileNote?: (input: {
    name: string;
    body: string;
    x: number;
    y: number;
  }) => void;
  /** Injected so a stocking frequency can be driven by a fake in a test. */
  random?: () => number;
}

/**
 * Geomorphs and full room/wall tiles are always map terrain, never furniture
 * or a token — so placing one switches the active layer instead of dropping
 * it wherever the user last had selected.
 */
function isTerrainTileCategory(category?: string): boolean {
  if (!category) return false;
  return category === "Rooms & walls" || category.startsWith("Geomorphs");
}

export class VTTTileDeckManager {
  decks = $state<TileDeck[]>([]);
  pendingPlacement = $state<{
    deckId: string;
    tile: TileDeckEntry;
    x: number;
    y: number;
    size: number;
    valid: boolean;
    /** Only a *drawn* tile is stocked; one picked by hand is placed as-is. */
    stock: boolean;
  } | null>(null);

  constructor(
    private deps: VTTTileDeckManagerDependencies,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {}

  setSnapshotData(decks: TileDeck[]) {
    this.decks = decks.map((deck) => ({
      ...deck,
      tiles: deck.tiles.map((tile) => ({ ...tile })),
    }));
  }

  createDeck(
    name: string,
    tiles: Array<Omit<TileDeckEntry, "id">>,
    starterDeckId?: string,
    license?: string,
    sourceUrl?: string,
  ) {
    const trimmedName = name.trim();
    if (!trimmedName || tiles.length === 0) return null;

    const deck: TileDeck = {
      id: this.idGenerator.uuid(),
      name: trimmedName,
      starterDeckId,
      license,
      sourceUrl,
      hardEdges: false,
      tiles: tiles.map((tile) => ({ ...tile, id: this.idGenerator.uuid() })),
    };
    this.decks = [...this.decks, deck];
    this.deps.persistDraft();
    return deck;
  }

  /** Creates a deck with no tiles yet, meant to be filled via addTile as a starter pack streams in. */
  beginDeck(
    name: string,
    starterDeckId?: string,
    license?: string,
    sourceUrl?: string,
  ) {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const deck: TileDeck = {
      id: this.idGenerator.uuid(),
      name: trimmedName,
      starterDeckId,
      license,
      sourceUrl,
      hardEdges: false,
      tiles: [],
    };
    this.decks = [...this.decks, deck];
    return deck;
  }

  /** Appends a single tile to a deck's reactive state without persisting — call persist() to flush. */
  addTile(deckId: string, tile: Omit<TileDeckEntry, "id">) {
    this.decks = this.decks.map((deck) =>
      deck.id === deckId
        ? {
            ...deck,
            tiles: [...deck.tiles, { ...tile, id: this.idGenerator.uuid() }],
          }
        : deck,
    );
  }

  persist() {
    this.deps.persistDraft();
  }

  removeDeck(deckId: string) {
    const existed = this.decks.some((deck) => deck.id === deckId);
    if (!existed) return false;
    this.decks = this.decks.filter((deck) => deck.id !== deckId);
    if (this.pendingPlacement?.deckId === deckId) {
      this.pendingPlacement = null;
    }
    this.deps.persistDraft();
    return true;
  }

  setHardEdges(deckId: string, hardEdges: boolean) {
    this.decks = this.decks.map((deck) =>
      deck.id === deckId ? { ...deck, hardEdges } : deck,
    );
    this.deps.persistDraft();
  }

  /**
   * Sets what this deck stocks a drawn tile with. Passing "none" clears the
   * setting rather than storing it, so a deck carries a stocking only when it
   * actually has one.
   */
  setStocking(deckId: string, stocking: TileDeckStocking) {
    const next = stocking.mode === "none" ? undefined : stocking;
    this.decks = this.decks.map((deck) =>
      deck.id === deckId ? { ...deck, stocking: next } : deck,
    );
    this.deps.persistDraft();
  }

  draw(deckId: string, size = 150) {
    const deck = this.decks.find((candidate) => candidate.id === deckId);
    if (!deck || deck.tiles.length === 0) return null;
    const tile = deck.tiles[Math.floor(Math.random() * deck.tiles.length)];
    return this.beginPlacement(deckId, tile, size, true);
  }

  /** Draws a random tile from across every deck, each tile weighted equally. */
  drawAny(size = 150) {
    const pool = this.decks.flatMap((deck) =>
      deck.tiles.map((tile) => ({ deckId: deck.id, tile })),
    );
    if (pool.length === 0) return null;
    const { deckId, tile } = pool[Math.floor(Math.random() * pool.length)];
    return this.beginPlacement(deckId, tile, size, true);
  }

  select(deckId: string, tileId: string, size = 150) {
    const deck = this.decks.find((candidate) => candidate.id === deckId);
    const tile = deck?.tiles.find((candidate) => candidate.id === tileId);
    if (!tile) return null;
    return this.beginPlacement(deckId, tile, size);
  }

  private beginPlacement(
    deckId: string,
    tile: TileDeckEntry,
    size: number,
    stock = false,
  ) {
    this.pendingPlacement = {
      deckId,
      tile,
      x: 0,
      y: 0,
      size,
      valid: true,
      stock,
    };
    return tile;
  }

  updatePendingPlacement(x: number, y: number) {
    const pending = this.pendingPlacement;
    if (!pending) return;
    const normalized = this.deps.normalizePlacement?.(
      { x, y },
      { width: pending.size, height: pending.size },
    ) ?? { x, y, width: pending.size, height: pending.size };

    // Magnetically align to nearby placed tiles' edges so a room/geomorph
    // pack can be assembled edge-to-edge without pixel-perfect dragging.
    const snapThreshold = Math.max(12, normalized.width * 0.12);
    const snapped = snapToNeighborTiles(
      normalized,
      this.existingTiles(),
      snapThreshold,
    );

    this.pendingPlacement = {
      ...pending,
      x: snapped.x,
      y: snapped.y,
      size: normalized.width,
      valid: this.canPlace(pending.deckId, {
        x: snapped.x,
        y: snapped.y,
        width: normalized.width,
        height: normalized.height,
      }),
    };
  }

  placePending() {
    const pending = this.pendingPlacement;
    if (!pending || !pending.valid) return null;
    const token = this.createTile(
      pending.deckId,
      pending.tile,
      pending.x,
      pending.y,
      pending.size,
    );
    const deck = this.decks.find(
      (candidate) => candidate.id === pending.deckId,
    );
    if (token && deck && pending.stock) {
      this.stockDrawnTile(deck, {
        x: pending.x,
        y: pending.y,
        size: pending.size,
      });
    }
    this.pendingPlacement = null;
    return token;
  }

  cancelPendingPlacement() {
    this.pendingPlacement = null;
  }

  canTransform(
    tokenId: string,
    updates: Partial<Pick<Token, "x" | "y" | "width" | "height">>,
  ) {
    const token = this.deps.getTokens()[tokenId];
    if (!token || token.kind !== "tile") return true;
    return this.canPlace(
      token.tileDeckId ?? "",
      {
        x: updates.x ?? token.x,
        y: updates.y ?? token.y,
        width: updates.width ?? token.width,
        height: updates.height ?? token.height,
      },
      tokenId,
    );
  }

  private createTile(
    deckId: string,
    tile: TileDeckEntry,
    x: number,
    y: number,
    size: number,
  ) {
    const deck = this.decks.find((candidate) => candidate.id === deckId);
    if (!deck) return null;

    const activeLayer = this.deps.getActiveLayer();
    const targetLayer = isTerrainTileCategory(tile.category)
      ? "terrain"
      : activeLayer;
    if (targetLayer !== activeLayer) {
      this.deps.setActiveLayer(targetLayer);
    }

    // ⚡ Bolt Optimization: Avoid intermediate array allocations for tile snapping hot path
    const tokens = this.deps.getTokens();
    const sameLayerTokens: Token[] = [];
    for (const key in tokens) {
      if (Object.prototype.hasOwnProperty.call(tokens, key)) {
        const token = tokens[key];
        if (token.layer === targetLayer) {
          sameLayerTokens.push(token);
        }
      }
    }

    const placed = this.deps.addToken(
      {
        name: tile.name,
        x,
        y,
        width: size,
        height: size,
        baseShape: "square",
        facingIndicator: false,
        imageUrl: tile.imagePath,
        color: "#64748b",
        zIndex: nextZIndexInLayer(sameLayerTokens),
        kind: "tile",
        layer: targetLayer,
        tileDeckId: deck.id,
        tileDetails: {
          description: "",
          encounter: "",
          notes: "",
          contents: "",
        },
      },
      false,
    );
    // Non-silent creation broadcasts TOKEN_ADDED to active guests; persist the
    // host's draft as well because the normal broadcast path does not do so.
    this.deps.persistDraft();
    return placed;
  }

  /**
   * Pins the deck's stocking on a freshly drawn tile, as a note on the map
   * rather than a field buried in the tile's details — what a room holds is
   * something the GM reads off the map mid-session.
   *
   * Runs at placement rather than at draw, so a placement the GM escapes out
   * of neither burns a table roll nor leaves a note behind.
   */
  private stockDrawnTile(
    deck: TileDeck,
    placement: { x: number; y: number; size: number },
  ) {
    const stocking = deck.stocking;
    if (!stocking || stocking.mode === "none") return;
    // The frequency roll comes first: a tile that holds nothing should not
    // consume a table roll on the way to being left empty.
    if ((this.deps.random ?? Math.random)() * (stocking.frequency ?? 1) >= 1) {
      return;
    }

    const centre = {
      x: placement.x + placement.size / 2,
      y: placement.y + placement.size / 2,
    };
    if (stocking.mode === "encounter") {
      // Deliberately empty: an encounter is generated from the note itself,
      // where the GM can see the room it belongs to and decide.
      this.deps.pinTileNote?.({ name: "Encounter", body: "", ...centre });
      return;
    }

    if (!stocking.tableId) return;
    const rolled = this.deps.rollStockingTable?.(stocking.tableId);
    if (!rolled) return;
    this.deps.pinTileNote?.({
      name: rolled.name,
      body: rolled.text,
      ...centre,
    });
  }

  private canPlace(
    deckId: string,
    candidate: { x: number; y: number; width: number; height: number },
    excludeId?: string,
  ) {
    const deck = this.decks.find((item) => item.id === deckId);
    return (
      !deck?.hardEdges ||
      canPlaceSpatialImage(
        candidate,
        this.existingTiles().filter((tile) => tile.id !== excludeId),
      )
    );
  }

  private existingTiles() {
    // ⚡ Bolt Optimization: Avoid intermediate array allocations for tile validation hot path
    const tokens = this.deps.getTokens();
    const tiles: Token[] = [];
    for (const key in tokens) {
      if (Object.prototype.hasOwnProperty.call(tokens, key)) {
        const token = tokens[key];
        if (token.kind === "tile") {
          tiles.push(token);
        }
      }
    }
    return tiles;
  }
}
