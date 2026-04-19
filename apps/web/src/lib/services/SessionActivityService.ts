import { uiStore } from "$lib/stores/ui.svelte";
import type { ActivityEvent } from "$lib/types/activity";

export type { ActivityEvent };

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
