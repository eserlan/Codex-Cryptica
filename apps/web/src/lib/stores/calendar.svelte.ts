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
    this.config = newConfig;
    const db = await getDB();
    const activeVaultId = vault.activeVaultId;
    if (activeVaultId) {
      await db.put("settings", newConfig, `calendar_${activeVaultId}`);
    }
  }
}

export const calendarStore = new CalendarStore();
