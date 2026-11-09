import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

/**
 * Adventure discovery promotion preferences (#4535).
 * Allows users to choose whether discoveries during play require manual
 * review or are automatically promoted to Codex canon.
 */
export class AdventurePromotionSettings {
  private persistence: UIPersistence;

  autoPromote = $state(false);

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;

    this.autoPromote = this.persistence.read(
      UI_STORAGE_KEYS.ADVENTURE_AUTO_PROMOTE,
      (v) => v === "true",
      false,
    );
  }

  setAutoPromote(value: boolean): void {
    this.autoPromote = value;
    this.persistence.write(
      UI_STORAGE_KEYS.ADVENTURE_AUTO_PROMOTE,
      value,
      String,
    );
  }

  toggleAutoPromote(): void {
    this.setAutoPromote(!this.autoPromote);
  }
}

const KEY = "__codex_adventure_promotion_settings__";
export const adventurePromotionSettings: AdventurePromotionSettings =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new AdventurePromotionSettings());
