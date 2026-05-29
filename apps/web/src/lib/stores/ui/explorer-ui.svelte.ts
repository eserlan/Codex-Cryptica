import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

type ExplorerCollapsedLabelGroups = Record<string, string[]>;

export class ExplorerUIStore {
  private persistence: UIPersistence;

  explorerViewMode = $state<"list" | "label">("list");
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
    if (explorerMode === "list" || explorerMode === "label") {
      this.explorerViewMode = explorerMode;
    }

    this.explorerCollapsedLabelGroups = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_LABEL_GROUPS,
      (v) => {
        const parsed = JSON.parse(v);
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
          return parsed as ExplorerCollapsedLabelGroups;
        }
        throw new Error("Invalid collapsed label groups");
      },
      {},
    );

    this.explorerCollapsedEntityIds = this.persistence.read(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_ENTITY_IDS,
      (v) => {
        const parsed = JSON.parse(v);
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
        throw new Error("Invalid collapsed entity IDs");
      },
      {},
    );
  }

  setExplorerViewMode(mode: "list" | "label") {
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

  getCollapsedLabelGroups(vaultId: string | null): Set<string> {
    const scope = this.getExplorerLabelGroupScope(vaultId);
    return new Set(this.explorerCollapsedLabelGroups[scope] ?? []);
  }

  toggleExplorerLabelGroup(vaultId: string | null, label: string) {
    const scope = this.getExplorerLabelGroupScope(vaultId);
    const nextLabels = new Set(this.explorerCollapsedLabelGroups[scope] ?? []);

    if (nextLabels.has(label)) {
      nextLabels.delete(label);
    } else {
      nextLabels.add(label);
    }

    const nextState = { ...this.explorerCollapsedLabelGroups };
    if (nextLabels.size === 0) {
      delete nextState[scope];
    } else {
      nextState[scope] = Array.from(nextLabels).sort((a, b) =>
        a.localeCompare(b),
      );
    }

    this.explorerCollapsedLabelGroups = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_LABEL_GROUPS,
      nextState,
    );
  }

  getCollapsedEntities(vaultId: string | null): Set<string> {
    const scope = this.getExplorerLabelGroupScope(vaultId);
    return new Set(this.explorerCollapsedEntityIds[scope] ?? []);
  }

  toggleExplorerEntityCollapse(vaultId: string | null, entityId: string) {
    const scope = this.getExplorerLabelGroupScope(vaultId);
    const nextEntities = new Set(this.explorerCollapsedEntityIds[scope] ?? []);

    if (nextEntities.has(entityId)) {
      nextEntities.delete(entityId);
    } else {
      nextEntities.add(entityId);
    }

    const nextState = { ...this.explorerCollapsedEntityIds };
    if (nextEntities.size === 0) {
      delete nextState[scope];
    } else {
      nextState[scope] = Array.from(nextEntities).sort((a, b) =>
        a.localeCompare(b),
      );
    }

    this.explorerCollapsedEntityIds = nextState;
    this.persistence.write(
      UI_STORAGE_KEYS.EXPLORER_COLLAPSED_ENTITY_IDS,
      nextState,
    );
  }

  private getExplorerLabelGroupScope(vaultId: string | null) {
    return vaultId ?? "__default__";
  }
}

const KEY = "__codex_explorer_ui_store__";
export const explorerUIStore: ExplorerUIStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new ExplorerUIStore());
