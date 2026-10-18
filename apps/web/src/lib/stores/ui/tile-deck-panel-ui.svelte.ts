import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

/** deckId -> whether its tile-thumbnail grid is expanded. Missing/false means hidden (the default). */
type TileDeckGridExpanded = Record<string, boolean>;

export class TileDeckPanelUIStore {
  private persistence: UIPersistence;

  /** The "Add decks" section (starter-pack catalog + the custom-deck-creation form) collapses by default. */
  catalogCollapsed = $state(true);
  private gridExpanded = $state<TileDeckGridExpanded>({});

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;
    this.catalogCollapsed = this.persistence.read(
      UI_STORAGE_KEYS.TILE_DECK_CATALOG_COLLAPSED,
      (v) => this.parseBoolean(v),
      true,
    );
    this.gridExpanded = this.persistence.read(
      UI_STORAGE_KEYS.TILE_DECK_GRID_EXPANDED,
      (v) => this.parseBooleanMap(v),
      {},
    );
  }

  toggleCatalog() {
    this.catalogCollapsed = !this.catalogCollapsed;
    this.persistence.write(
      UI_STORAGE_KEYS.TILE_DECK_CATALOG_COLLAPSED,
      this.catalogCollapsed,
    );
  }

  isGridExpanded(deckId: string): boolean {
    return this.gridExpanded[deckId] === true;
  }

  toggleGrid(deckId: string) {
    const next = {
      ...this.gridExpanded,
      [deckId]: !this.isGridExpanded(deckId),
    };
    if (!next[deckId]) delete next[deckId];
    this.gridExpanded = next;
    this.persistence.write(UI_STORAGE_KEYS.TILE_DECK_GRID_EXPANDED, next);
  }

  private parseBoolean(raw: string): boolean {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "boolean") throw new Error("Invalid boolean");
    return parsed;
  }

  private parseBooleanMap(raw: string): TileDeckGridExpanded {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        if (typeof parsed[key] !== "boolean") {
          throw new Error("Invalid tile deck grid expanded map");
        }
      }
      return parsed as TileDeckGridExpanded;
    }
    throw new Error("Invalid tile deck grid expanded map");
  }
}

const KEY = "__codex_tile_deck_panel_ui_store__";
export const tileDeckPanelUIStore: TileDeckPanelUIStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new TileDeckPanelUIStore());
