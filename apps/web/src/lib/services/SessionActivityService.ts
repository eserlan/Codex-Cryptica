import { uiStore } from "$lib/stores/ui.svelte";

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: "discovery" | "archive" | "update";
  title: string;
  entityType: string;
  entityId?: string;
  details?: string;
}

export class SessionActivityService {
  addEvent(event: Omit<ActivityEvent, "id" | "timestamp">) {
    const fullEvent: ActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    uiStore.archiveActivityLog = [
      fullEvent,
      ...uiStore.archiveActivityLog,
    ].slice(0, 50);
  }

  clear() {
    uiStore.archiveActivityLog = [];
  }
}

export const sessionActivity = new SessionActivityService();
