import { DEFAULT_CALENDAR } from "chronology-engine";
import type { WorldCalendar, CalendarSnapshot } from "chronology-engine";
import { vault } from "./vault.svelte";
import { getDB } from "../utils/idb";

export class CalendarStore {
  config = $state<WorldCalendar>({ ...DEFAULT_CALENDAR, revision: 1 });

  constructor() {
    // Initialized by vault switch
  }

  async init() {
    try {
      const db = await getDB();
      const activeVaultId = vault.activeVaultId;
      if (!activeVaultId) {
        this.config = { ...DEFAULT_CALENDAR, revision: 1 };
        return;
      }

      const savedConfig = await db.get("settings", `calendar_${activeVaultId}`);
      if (savedConfig) {
        this.config = {
          ...savedConfig,
          revision: savedConfig.revision || 1,
        };
      } else {
        this.config = { ...DEFAULT_CALENDAR, revision: 1 };
      }
    } catch (err) {
      console.warn("[CalendarStore] Init deferred or failed:", err);
      this.config = { ...DEFAULT_CALENDAR, revision: 1 };
    }
  }

  getSnapshot(): CalendarSnapshot {
    return {
      config: $state.snapshot(this.config),
      revision: this.config.revision || 1,
    };
  }

  private hasStructuralChanges(a: WorldCalendar, b: WorldCalendar): boolean {
    if (a.useGregorian !== b.useGregorian) return true;

    const aMonths = a.months || [];
    const bMonths = b.months || [];
    if (aMonths.length !== bMonths.length) return true;
    for (let i = 0; i < aMonths.length; i++) {
      if (
        aMonths[i].id !== bMonths[i].id ||
        aMonths[i].name !== bMonths[i].name ||
        aMonths[i].days !== bMonths[i].days
      ) {
        return true;
      }
    }

    const aAnchors = a.anchors || [];
    const bAnchors = b.anchors || [];
    if (aAnchors.length !== bAnchors.length) return true;
    for (let i = 0; i < aAnchors.length; i++) {
      if (
        aAnchors[i].id !== bAnchors[i].id ||
        aAnchors[i].name !== bAnchors[i].name ||
        aAnchors[i].afterMonthId !== bAnchors[i].afterMonthId ||
        aAnchors[i].afterDay !== bAnchors[i].afterDay
      ) {
        return true;
      }
    }

    return false;
  }

  async setConfig(newConfig: WorldCalendar) {
    const previousConfig = this.config;
    const prevRevision = previousConfig.revision || 1;

    const configCopy = { ...newConfig };

    if (this.hasStructuralChanges(previousConfig, configCopy)) {
      configCopy.revision = prevRevision + 1;
    } else {
      configCopy.revision = prevRevision;
    }

    this.config = configCopy;
    try {
      const db = await getDB();
      const activeVaultId = vault.activeVaultId;
      if (activeVaultId) {
        await db.put(
          "settings",
          $state.snapshot(configCopy),
          `calendar_${activeVaultId}`,
        );
      }
    } catch (err) {
      console.error("[CalendarStore] Failed to persist calendar config:", err);
      this.config = previousConfig;
    }
  }
}

export const calendarStore = new CalendarStore();
