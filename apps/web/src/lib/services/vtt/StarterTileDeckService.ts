import type { TileDeck } from "../../../types/vtt";

export interface StarterTileDeckManifest {
  id: string;
  name: string;
  sourceUrl: string;
  license: string;
  tiles: Array<{
    id: string;
    name: string;
    assetPath: string;
    category?: string;
  }>;
}

export interface StarterTileDeckServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
  /** Fetch this many tile assets concurrently. Defaults to 6. */
  concurrency?: number;
  importFile: (
    file: File,
  ) => Promise<{ ok: true; file: { path: string } } | { ok: false }>;
  getDecks: () => TileDeck[];
  /** Creates the deck up front, with no tiles yet — tiles stream in via addTile. */
  beginDeck: (
    name: string,
    starterDeckId: string,
    license?: string,
    sourceUrl?: string,
  ) => TileDeck | null;
  addTile: (
    deckId: string,
    tile: { name: string; imagePath: string; category?: string },
  ) => void;
  /** Flushes the deck's current state to durable storage. */
  persist: () => void;
}

/**
 * Installs a catalog deck into the active vault. The R2 files are only used
 * during this explicit prefetch; all subsequent drawing reads OPFS paths.
 */
export class StarterTileDeckService {
  constructor(private deps: StarterTileDeckServiceDeps) {}

  private get fetcher() {
    return this.deps.fetch ?? fetch;
  }

  private get baseUrl() {
    return (
      this.deps.baseUrl ??
      ((typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
        (typeof import.meta !== "undefined" &&
        import.meta.env?.DEV &&
        !import.meta.env?.VITEST
          ? "http://localhost:8787"
          : "https://oracle-proxy.espen-erlandsen.workers.dev"))
    );
  }

  /**
   * Installs a catalog deck, streaming tiles into it as they download so the
   * UI can show tiles (and a loaded/total count) before the whole pack is
   * in — large packs (hundreds of tiles) would otherwise block for a long
   * time with no feedback. Tiles fetch with bounded concurrency rather than
   * one at a time. If a tile fails partway through, whatever already
   * downloaded is kept (and persisted) and the error is rethrown.
   */
  async install(
    starterDeckId: string,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<TileDeck> {
    const existing = this.deps
      .getDecks()
      .find((deck) => deck.starterDeckId === starterDeckId);
    if (existing) return existing;

    const manifest = await this.getManifest(starterDeckId);
    const total = manifest.tiles.length;

    const deck = this.deps.beginDeck(
      manifest.name,
      manifest.id,
      manifest.license,
      manifest.sourceUrl,
    );
    if (!deck) throw new Error("Could not create the starter tile deck.");

    onProgress?.(0, total);

    let loaded = 0;
    let nextIndex = 0;
    let firstError: unknown = null;
    const concurrency = Math.max(
      1,
      Math.min(this.deps.concurrency ?? 6, total),
    );

    const worker = async () => {
      while (nextIndex < manifest.tiles.length && !firstError) {
        const tile = manifest.tiles[nextIndex++];
        try {
          const response = await this.fetcher(
            `${this.baseUrl}/api/starter-tile-decks/${encodeURIComponent(manifest.id)}/assets/${encodeURIComponent(tile.assetPath)}`,
          );
          if (!response.ok) {
            throw new Error(`Could not prefetch ${tile.name}.`);
          }
          const result = await this.deps.importFile(
            new File([await response.blob()], `${tile.id}.png`, {
              type: response.headers.get("Content-Type") || "image/png",
            }),
          );
          if (!result.ok) {
            throw new Error(`Could not save ${tile.name} in this vault.`);
          }
          this.deps.addTile(deck.id, {
            name: tile.name,
            imagePath: result.file.path,
            category: tile.category ?? getTileCategory(tile.assetPath),
          });
          loaded++;
          onProgress?.(loaded, total);
          if (loaded % 20 === 0) this.deps.persist();
        } catch (err) {
          if (!firstError) firstError = err;
          return;
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
    } finally {
      this.deps.persist();
    }

    if (firstError) throw firstError;
    return deck;
  }

  private async getManifest(id: string): Promise<StarterTileDeckManifest> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/starter-tile-decks/${encodeURIComponent(id)}`,
    );
    if (!response.ok) throw new Error("Could not load the starter tile deck.");
    const manifest = (await response.json()) as StarterTileDeckManifest;
    if (
      manifest.id !== id ||
      !manifest.name ||
      !Array.isArray(manifest.tiles) ||
      manifest.tiles.length === 0 ||
      manifest.tiles.some(
        (tile) => !tile.id || !tile.name || !isSafeAssetPath(tile.assetPath),
      )
    ) {
      throw new Error("The starter tile deck catalog is invalid.");
    }
    return manifest;
  }
}

export interface StarterDeckCatalogEntry {
  id: string;
  name: string;
  license: string;
}

/**
 * The set of starter decks the client offers to install. Each entry's assets
 * live under `starter-tile-decks/<id>/` in the shared R2 bucket; see
 * third_party/<id>/ for the upstream license text.
 */
export const STARTER_DECK_CATALOG: StarterDeckCatalogEntry[] = [
  {
    id: "kenney-scribble-dungeons",
    name: "Scribble Dungeons",
    license: "CC0-1.0",
  },
  {
    id: "majcher-geomorphs-2013",
    name: "Geomorphs 2013",
    license: "CC BY 4.0",
  },
  {
    id: "imsobad-geomorph-collection",
    name: "Geomorph Collection",
    license: "CC BY-SA 4.0",
  },
];

export function getTileCategory(assetPath: string): string {
  const path = assetPath.toLowerCase();
  if (path.startsWith("characters/")) return "Characters";
  if (path.startsWith("items/")) return "Items";
  return getTileCategoryFromName(path);
}

export function getTileCategoryFromName(name: string): string {
  const path = name.toLowerCase();
  if (/door|trap/.test(path)) return "Doors & traps";
  if (path.startsWith("corridors/") || /path|track|bridge/.test(path))
    return "Corridors";
  if (path.startsWith("rooms/") || /wall|inner|tiles_/.test(path))
    return "Rooms & walls";
  return "Props & overlays";
}

function isSafeAssetPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.endsWith(".png") &&
    !path.startsWith("/") &&
    !path.includes("..")
  );
}
