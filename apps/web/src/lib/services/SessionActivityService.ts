import type { ActivityEvent } from "$lib/types/activity";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import {
  systemClock,
  systemIdGenerator,
  browserStorage,
  type Clock,
  type IdGenerator,
  type StorageLike,
} from "$lib/utils/runtime-deps";

export type { ActivityEvent };

const STORAGE_KEY = "codex_oracle_activity_log";
const MAX_EVENTS = 50;
export const ACTIVITY_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class SessionActivityService {
  constructor(
    private clock: Clock = systemClock,
    private idGenerator: IdGenerator = systemIdGenerator,
    private storage: StorageLike = browserStorage,
  ) {
    // The exported singleton is constructed at import time, which also runs
    // during SSR. Skip auto-load there so we never mutate the shared
    // discoveryPolicyStore on the server (cross-request state bleed). Tests run
    // under jsdom (window present) and still exercise constructor load.
    if (typeof window !== "undefined") {
      this.load();
    }
  }

  addEvent(event: Omit<ActivityEvent, "id" | "timestamp">) {
    const fullEvent: ActivityEvent = {
      ...event,
      id: this.idGenerator.uuid(),
      timestamp: this.clock.now(),
    };

    discoveryPolicyStore.archiveActivityLog = this.prune([
      fullEvent,
      ...discoveryPolicyStore.archiveActivityLog,
    ]).slice(0, MAX_EVENTS);
    this.persist();
  }

  clear() {
    discoveryPolicyStore.archiveActivityLog = [];
    this.storage.removeItem(STORAGE_KEY);
  }

  load() {
    const raw = this.storage.getItem(STORAGE_KEY);
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
      this.storage.removeItem(STORAGE_KEY);
    }
  }

  private prune(events: ActivityEvent[]) {
    const cutoff = this.clock.now() - ACTIVITY_LOG_RETENTION_MS;
    return events
      .filter((event) => event.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private persist() {
    this.storage.setItem(
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
