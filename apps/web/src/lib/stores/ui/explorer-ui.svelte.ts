import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

type ExplorerCollapsedLabelGroups = Record<string, string[]>;
type ExplorerCollapsedCategoryGroups = Record<string, string[]>;
type ExplorerViewMode = "list" | "label" | "category";

export class ExplorerUIStore {
  private persistence: UIPersistence;

  explorerViewMode = $state<ExplorerViewMode>("list");
  explorerCollapsedCategoryGroups = $state<ExplorerCollapsedCategoryGroups>({});
  explorerCollapsedLabelGroups = $state<ExplorerCollapsedLabelGroups>({});
  explorerCollapsedEntityIds = $state<Record<string, string[]>>({});
  labelFilters = $state<Set<string>>(new Set());

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;
    this.loadFromPersistence();
  }

  private loadFromPersistence() {
    const explorerMode = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_VIEW_MODE,
      (v) => v,
      "list",
    );
    if (
      explorerMode === "list" ||
      explorerMode === "label" ||
      explorerMode === "category"
    ) {
      this.explorerViewMode = explorerMode;
    }

    this.explorerCollapsedCategoryGroups = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_CATEGORY_GROUPS,
      (v) => this.parseStringArrayMap(v, "Invalid collapsed category groups"),
      {},
    );

    this.explorerCollapsedLabelGroups = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_LABEL_GROUPS,
      (v) => this.parseStringArrayMap(v, "Invalid collapsed label groups"),
      {},
    );

    this.explorerCollapsedEntityIds = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_ENTITY_IDS,
      (v) => this.parseStringArrayMap(v, "Invalid collapsed entity IDs"),
      {},
    );
  }

  setExplorerViewMode(mode: ExplorerViewMode) {
    this.explorerViewMode = mode;
    this.persistence.write(UI_STORAGE_KEYS.EXPLORER_VIEW_MODE, mode, String);
  }

  toggleLabelFilter(label: string, isMulti = false) {
    if (isMulti) {
      const next = new Set(this.labelFilters);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      this.labelFilters = next;
    } else {
      if (this.labelFilters.has(label) && this.labelFilters.size === 1) {
        this.labelFilters = new Set();
      } else {
        this.labelFilters = new Set([label]);
      }
    }
  }

  removeLabelFilter(label: string) {
    const next = new Set(this.labelFilters);
    next.delete(label);
    this.labelFilters = next;
  }

  clearLabelFilters() {
    this.labelFilters = new Set();
  }

  getCollapsedCategoryGroups(vaultId: string | null): Set<string> {
    const scope = this.getExplorerGroupScope(vaultId);
    return new Set(this.explorerCollapsedCategoryGroups[scope] ?? []);
  }

  toggleExplorerCategoryGroup(vaultId: string | null, categoryId: string) {
    const scope = this.getExplorerGroupScope(vaultId);
    const nextCategories = new Set(
      this.explorerCollapsedCategoryGroups[scope] ?? [],
    );

    if (nextCategories.has(categoryId)) {
      nextCategories.delete(categoryId);
    } else {
      nextCategories.add(categoryId);
    }

    const nextState = this.withUpdatedGroup(
      this.explorerCollapsedCategoryGroups,
      scope,
      nextCategories,
    );
    this.explorerCollapsedCategoryGroups = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_CATEGORY_GROUPS,
      nextState,
    );
  }

  getCollapsedLabelGroups(vaultId: string | null): Set<string> {
    const scope = this.getExplorerGroupScope(vaultId);
    return new Set(this.explorerCollapsedLabelGroups[scope] ?? []);
  }

  toggleExplorerLabelGroup(vaultId: string | null, label: string) {
    const scope = this.getExplorerGroupScope(vaultId);
    const nextLabels = new Set(this.explorerCollapsedLabelGroups[scope] ?? []);

    if (nextLabels.has(label)) {
      nextLabels.delete(label);
    } else {
      nextLabels.add(label);
    }

    const nextState = this.withUpdatedGroup(
      this.explorerCollapsedLabelGroups,
      scope,
      nextLabels,
    );
    this.explorerCollapsedLabelGroups = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_LABEL_GROUPS,
      nextState,
    );
  }

  getCollapsedEntities(vaultId: string | null): Set<string> {
    const scope = this.getExplorerGroupScope(vaultId);
    return new Set(this.explorerCollapsedEntityIds[scope] ?? []);
  }

  toggleExplorerEntityCollapse(vaultId: string | null, entityId: string) {
    const scope = this.getExplorerGroupScope(vaultId);
    const nextEntities = new Set(this.explorerCollapsedEntityIds[scope] ?? []);

    if (nextEntities.has(entityId)) {
      nextEntities.delete(entityId);
    } else {
      nextEntities.add(entityId);
    }

    const nextState = this.withUpdatedGroup(
      this.explorerCollapsedEntityIds,
      scope,
      nextEntities,
    );
    this.explorerCollapsedEntityIds = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_ENTITY_IDS,
      nextState,
    );
  }

  private parseStringArrayMap(raw: string, errorMessage: string) {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every(
        (value) =>
          Array.isArray(value) &&
          value.every((item) => typeof item === "string"),
      )
    ) {
      return parsed as Record<string, string[]>;
    }
    throw new Error(errorMessage);
  }

  private withUpdatedGroup(
    current: Record<string, string[]>,
    scope: string,
    entries: Set<string>,
  ) {
    const nextState = { ...current };
    if (entries.size === 0) {
      delete nextState[scope];
    } else {
      nextState[scope] = Array.from(entries).sort((a, b) => a.localeCompare(b));
    }
    return nextState;
  }

  private getExplorerGroupScope(vaultId: string | null) {
    return vaultId ?? "__default__";
  }
}

const KEY = "__codex_explorer_ui_store__";
export const explorerUIStore: ExplorerUIStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new ExplorerUIStore());
