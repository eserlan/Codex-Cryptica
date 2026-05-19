import type { ActivityEvent } from "$lib/types/activity";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

export type { ActivityEvent };

const STORAGE_KEY = "codex_oracle_activity_log";
const MAX_EVENTS = 50;
export const ACTIVITY_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class SessionActivityService {
  constructor() {
    this.load();
  }

  addEvent(event: Omit<ActivityEvent, "id" | "timestamp">) {
    const fullEvent: ActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    discoveryPolicyStore.archiveActivityLog = this.prune([
      fullEvent,
      ...discoveryPolicyStore.archiveActivityLog,
    ]).slice(0, MAX_EVENTS);
    this.persist();
  }

  clear() {
    discoveryPolicyStore.archiveActivityLog = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  load() {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      discoveryPolicyStore.archiveActivityLog = this.prune(
        discoveryPolicyStore.archiveActivityLog ?? [],
      );
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Invalid activity log");

      discoveryPolicyStore.archiveActivityLog = this.prune(
        parsed.filter(isActivityEvent),
      ).slice(0, MAX_EVENTS);
      this.persist();
    } catch {
      discoveryPolicyStore.archiveActivityLog = [];
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private prune(events: ActivityEvent[]) {
    const cutoff = Date.now() - ACTIVITY_LOG_RETENTION_MS;
    return events
      .filter((event) => event.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(discoveryPolicyStore.archiveActivityLog),
    );
  }
}

export const sessionActivity = new SessionActivityService();

function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!value || typeof value !== "object") return false;

  const event = value as ActivityEvent;
  return (
    typeof event.id === "string" &&
    typeof event.timestamp === "number" &&
    (event.type === "discovery" ||
      event.type === "archive" ||
      event.type === "update") &&
    typeof event.title === "string" &&
    typeof event.entityType === "string" &&
    (event.entityId === undefined || typeof event.entityId === "string") &&
    (event.details === undefined || typeof event.details === "string")
  );
}
