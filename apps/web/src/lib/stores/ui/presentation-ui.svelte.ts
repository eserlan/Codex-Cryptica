import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

/** entityId -> collapsed section keys (see `computeSectionKeys` in
 * @codex/stat-sheet-engine). Viewer-only UI state (#2331): never touches
 * Presentation content or field values. */
type PresentationCollapsedSections = Record<string, string[]>;

export class PresentationUIStore {
  private persistence: UIPersistence;

  collapsedSections = $state<PresentationCollapsedSections>({});

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;
    this.collapsedSections = this.persistence.read(
      UI_STORAGE_KEYS.PRESENTATION_COLLAPSED_SECTIONS,
      (v) => this.parseStringArrayMap(v),
      {},
    );
  }

  getCollapsedSections(entityId: string): Set<string> {
    return new Set(this.collapsedSections[entityId] ?? []);
  }

  toggleSection(entityId: string, sectionKey: string) {
    const next = new Set(this.collapsedSections[entityId] ?? []);
    if (next.has(sectionKey)) {
      next.delete(sectionKey);
    } else {
      next.add(sectionKey);
    }

    const nextState = { ...this.collapsedSections };
    if (next.size === 0) {
      delete nextState[entityId];
    } else {
      nextState[entityId] = Array.from(next).sort();
    }
    this.collapsedSections = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.PRESENTATION_COLLAPSED_SECTIONS,
      nextState,
    );
  }

  private parseStringArrayMap(raw: string): PresentationCollapsedSections {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        const value = parsed[key];
        if (
          !Array.isArray(value) ||
          !value.every((v) => typeof v === "string")
        ) {
          throw new Error("Invalid collapsed presentation sections");
        }
      }
      return parsed as PresentationCollapsedSections;
    }
    throw new Error("Invalid collapsed presentation sections");
  }
}

const KEY = "__codex_presentation_ui_store__";
export const presentationUIStore: PresentationUIStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new PresentationUIStore());
