import type { GeneratorId } from "generator-engine";
import { isSupportedGenerator } from "generator-engine";
import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

/**
 * Default starred generators when the user has no saved preference (#2988).
 */
export const DEFAULT_FAVORITE_GENERATOR_IDS: readonly GeneratorId[] = [
  "npc",
  "faction",
  "settlement",
] as const;

/**
 * Manages user's favourite / starred generators (#2988).
 * Persisted in local browser storage via UIPersistence.
 */
export class GeneratorFavoritesStore {
  private persistence: UIPersistence;

  favoriteIds = $state<GeneratorId[]>([]);

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;

    const raw = this.persistence.read<GeneratorId[]>(
      UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS,
      (val) => {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (id): id is GeneratorId =>
                typeof id === "string" && isSupportedGenerator(id),
            );
          }
        } catch {
          // ignore corrupted JSON
        }
        return [...DEFAULT_FAVORITE_GENERATOR_IDS];
      },
      [...DEFAULT_FAVORITE_GENERATOR_IDS],
    );

    this.favoriteIds = raw;
  }

  isFavorite(id: GeneratorId): boolean {
    return this.favoriteIds.includes(id);
  }

  addFavorite(id: GeneratorId): void {
    if (!isSupportedGenerator(id) || this.favoriteIds.includes(id)) {
      return;
    }
    this.favoriteIds = [...this.favoriteIds, id];
    this.save();
  }

  removeFavorite(id: GeneratorId): void {
    if (!this.favoriteIds.includes(id)) {
      return;
    }
    this.favoriteIds = this.favoriteIds.filter((fav) => fav !== id);
    this.save();
  }

  toggleFavorite(id: GeneratorId): void {
    if (this.isFavorite(id)) {
      this.removeFavorite(id);
    } else {
      this.addFavorite(id);
    }
  }

  private save(): void {
    this.persistence.write(
      UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS,
      this.favoriteIds,
    );
  }
}

const KEY = "__codex_generator_favorites_store__";
export const generatorFavoritesStore: GeneratorFavoritesStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new GeneratorFavoritesStore());
