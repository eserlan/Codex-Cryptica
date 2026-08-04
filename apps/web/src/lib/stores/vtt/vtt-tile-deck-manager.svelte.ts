import type {
  TileDeck,
  TileDeckEntry,
  Token,
  TokenCreationInput,
} from "../../../types/vtt";
import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
import {
  canPlaceSpatialImage,
  nextSpatialImageZIndex,
} from "@codex/spatial-engine";

export interface VTTTileDeckManagerDependencies {
  getTokens: () => Record<string, Token>;
  addToken: (input: TokenCreationInput, silent?: boolean) => Token;
  persistDraft: () => void;
  normalizePlacement?: (
    point: { x: number; y: number },
    size: { width: number; height: number },
  ) => { x: number; y: number; width: number; height: number };
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
  ) {
    const trimmedName = name.trim();
    if (!trimmedName || tiles.length === 0) return null;

    const deck: TileDeck = {
      id: this.idGenerator.uuid(),
      name: trimmedName,
      starterDeckId,
      hardEdges: false,
      tiles: tiles.map((tile) => ({ ...tile, id: this.idGenerator.uuid() })),
    };
    this.decks = [...this.decks, deck];
    this.deps.persistDraft();
    return deck;
  }

  setHardEdges(deckId: string, hardEdges: boolean) {
    this.decks = this.decks.map((deck) =>
      deck.id === deckId ? { ...deck, hardEdges } : deck,
    );
    this.deps.persistDraft();
  }

  draw(deckId: string, size = 150) {
    const deck = this.decks.find((candidate) => candidate.id === deckId);
    if (!deck || deck.tiles.length === 0) return null;
    const tile = deck.tiles[Math.floor(Math.random() * deck.tiles.length)];
    return this.beginPlacement(deckId, tile, size);
  }

  select(deckId: string, tileId: string, size = 150) {
    const deck = this.decks.find((candidate) => candidate.id === deckId);
    const tile = deck?.tiles.find((candidate) => candidate.id === tileId);
    if (!tile) return null;
    return this.beginPlacement(deckId, tile, size);
  }

  private beginPlacement(deckId: string, tile: TileDeckEntry, size: number) {
    this.pendingPlacement = { deckId, tile, x: 0, y: 0, size, valid: true };
    return tile;
  }

  updatePendingPlacement(x: number, y: number) {
    const pending = this.pendingPlacement;
    if (!pending) return;
    const normalized = this.deps.normalizePlacement?.(
      { x, y },
      { width: pending.size, height: pending.size },
    ) ?? { x, y, width: pending.size, height: pending.size };
    this.pendingPlacement = {
      ...pending,
      x: normalized.x,
      y: normalized.y,
      size: normalized.width,
      valid: this.canPlace(pending.deckId, {
        x: normalized.x,
        y: normalized.y,
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
        zIndex: nextSpatialImageZIndex(Object.values(this.deps.getTokens())),
        kind: "tile",
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
    return Object.values(this.deps.getTokens()).filter(
      (token) => token.kind === "tile",
    );
  }
}
