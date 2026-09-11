import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

/**
 * Global Guided Mode preference (#1909). Defaults to ON for new users and
 * persists across sessions until explicitly toggled — a browser-wide
 * preference, not a per-world/vault setting (clarification decision).
 */
export class GuidedModeStore {
  private persistence: UIPersistence;

  isGuidedMode = $state(true);
  dismissedRecommendationIds = $state<string[]>([]);

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;

    this.isGuidedMode = this.persistence.read(
      UI_STORAGE_KEYS.GUIDED_MODE_ACTIVE,
      (v) => v === "true",
      true,
    );
    this.dismissedRecommendationIds = this.persistence.read(
      UI_STORAGE_KEYS.GUIDED_MODE_DISMISSED_RECOMMENDATIONS,
      (v) => JSON.parse(v),
      [],
    );
  }

  setGuidedMode(value: boolean) {
    this.isGuidedMode = value;
    this.persistence.write(UI_STORAGE_KEYS.GUIDED_MODE_ACTIVE, value, String);
  }

  toggleGuidedMode() {
    this.setGuidedMode(!this.isGuidedMode);
  }

  isRecommendationDismissed(id: string): boolean {
    return this.dismissedRecommendationIds.includes(id);
  }

  dismissRecommendation(id: string) {
    if (this.dismissedRecommendationIds.includes(id)) return;
    this.dismissedRecommendationIds = [...this.dismissedRecommendationIds, id];
    this.persistence.write(
      UI_STORAGE_KEYS.GUIDED_MODE_DISMISSED_RECOMMENDATIONS,
      this.dismissedRecommendationIds,
    );
  }
}

const KEY = "__codex_guided_mode_store__";
export const guidedModeStore: GuidedModeStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new GuidedModeStore());
