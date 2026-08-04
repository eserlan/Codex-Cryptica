import type { TileDeck } from "../../../types/vtt";

export interface StarterTileDeckManifest {
  id: string;
  name: string;
  sourceUrl: string;
  license: string;
  tiles: Array<{ id: string; name: string; assetPath: string }>;
}

export interface StarterTileDeckServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
  importFile: (
    file: File,
  ) => Promise<{ ok: true; file: { path: string } } | { ok: false }>;
  getDecks: () => TileDeck[];
  createDeck: (
    name: string,
    tiles: Array<{ name: string; imagePath: string; category?: string }>,
    starterDeckId: string,
  ) => TileDeck | null;
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

  async install(starterDeckId: string): Promise<TileDeck> {
    const existing = this.deps
      .getDecks()
      .find((deck) => deck.starterDeckId === starterDeckId);
    if (existing) return existing;

    const manifest = await this.getManifest(starterDeckId);
    const tiles: Array<{ name: string; imagePath: string; category: string }> =
      [];

    for (const tile of manifest.tiles) {
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
      tiles.push({
        name: tile.name,
        imagePath: result.file.path,
        category: getTileCategory(tile.assetPath),
      });
    }

    const deck = this.deps.createDeck(manifest.name, tiles, manifest.id);
    if (!deck) throw new Error("Could not create the starter tile deck.");
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
