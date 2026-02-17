import { DEFAULT_CALENDAR } from "chronology-engine";
import type { CampaignCalendar } from "chronology-engine";
import { vault } from "./vault.svelte";
import { getDB } from "../utils/idb";

class CalendarStore {
  config = $state<CampaignCalendar>(DEFAULT_CALENDAR);

  constructor() {
    // Initialized by vault switch
  }

  async init() {
    try {
      const db = await getDB();
      const activeVaultId = vault.activeVaultId;
      if (!activeVaultId) {
        this.config = DEFAULT_CALENDAR;
        return;
      }

      const savedConfig = await db.get("settings", `calendar_${activeVaultId}`);
      if (savedConfig) {
        this.config = savedConfig;
      } else {
        this.config = DEFAULT_CALENDAR;
      }
    } catch (err) {
      console.warn("[CalendarStore] Init deferred or failed:", err);
      this.config = DEFAULT_CALENDAR;
    }
  }

  async setConfig(newConfig: CampaignCalendar) {
    const previousConfig = this.config;
    this.config = newConfig;
    try {
      const db = await getDB();
      const activeVaultId = vault.activeVaultId;
      if (activeVaultId) {
        await db.put(
          "settings",
          $state.snapshot(newConfig),
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
