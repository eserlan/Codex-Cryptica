import { describe, it, expect, beforeEach } from "vitest";
import {
  SessionActivityService,
  ACTIVITY_LOG_RETENTION_MS,
} from "./SessionActivityService";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import type { Clock, IdGenerator, StorageLike } from "$lib/utils/runtime-deps";

const STORAGE_KEY = "codex_oracle_activity_log";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function fixedClock(now: number): Clock {
  return { now: () => now };
}

function seqIds(): IdGenerator {
  let n = 0;
  return { uuid: () => `id-${++n}` };
}

const NOW = 1_700_000_000_000;
const sampleEvent = {
  type: "discovery" as const,
  title: "Aldric",
  entityType: "character",
};

describe("SessionActivityService (injected deps)", () => {
  beforeEach(() => {
    discoveryPolicyStore.archiveActivityLog = [];
  });

  it("stamps deterministic id + timestamp from the injected seams", () => {
    const svc = new SessionActivityService(
      fixedClock(NOW),
      seqIds(),
      memoryStorage(),
    );

    svc.addEvent(sampleEvent);

    const [event] = discoveryPolicyStore.archiveActivityLog;
    expect(event.id).toBe("id-1");
    expect(event.timestamp).toBe(NOW);
    expect(event.title).toBe("Aldric");
  });

  it("persists to the injected storage", () => {
    const storage = memoryStorage();
    const svc = new SessionActivityService(fixedClock(NOW), seqIds(), storage);

    svc.addEvent(sampleEvent);

    const raw = storage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it("loads existing events from storage on construction", () => {
    const stored = JSON.stringify([
      { ...sampleEvent, id: "x", timestamp: NOW },
    ]);
    const svc = new SessionActivityService(
      fixedClock(NOW),
      seqIds(),
      memoryStorage({ [STORAGE_KEY]: stored }),
    );
    expect(svc).toBeDefined();
    expect(discoveryPolicyStore.archiveActivityLog).toHaveLength(1);
  });

  it("prunes events older than the retention window using the injected clock", () => {
    const old = {
      ...sampleEvent,
      id: "old",
      timestamp: NOW - ACTIVITY_LOG_RETENTION_MS - 1,
    };
    const fresh = { ...sampleEvent, id: "fresh", timestamp: NOW };
    new SessionActivityService(
      fixedClock(NOW),
      seqIds(),
      memoryStorage({ [STORAGE_KEY]: JSON.stringify([old, fresh]) }),
    );

    const ids = discoveryPolicyStore.archiveActivityLog.map((e) => e.id);
    expect(ids).toEqual(["fresh"]);
  });

  it("clear empties the log and storage", () => {
    const storage = memoryStorage();
    const svc = new SessionActivityService(fixedClock(NOW), seqIds(), storage);
    svc.addEvent(sampleEvent);

    svc.clear();

    expect(discoveryPolicyStore.archiveActivityLog).toHaveLength(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("recovers from corrupt stored JSON by resetting", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "not json{" });
    new SessionActivityService(fixedClock(NOW), seqIds(), storage);

    expect(discoveryPolicyStore.archiveActivityLog).toHaveLength(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});
