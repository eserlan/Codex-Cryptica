import { describe, it, expect, beforeEach } from "vitest";
import { syncStats } from "./sync-stats";

describe("syncStats Store", () => {
  beforeEach(() => {
    syncStats.reset();
  });

  it("should have initial IDLE status", () => {
    let current: any;
    syncStats.subscribe(v => current = v)();
    expect(current.status).toBe("IDLE");
  });

  it("should update status", () => {
    syncStats.setStatus("SYNCING");
    let current: any;
    syncStats.subscribe(v => current = v)();
    expect(current.status).toBe("SYNCING");
  });

  it("should update stats partially", () => {
    syncStats.updateStats({ filesUploaded: 5 });
    let current: any;
    syncStats.subscribe(v => current = v)();
    expect(current.stats.filesUploaded).toBe(5);
    expect(current.stats.filesDownloaded).toBe(0);

    syncStats.updateStats({ filesDownloaded: 10 });
    syncStats.subscribe(v => current = v)();
    expect(current.stats.filesUploaded).toBe(5);
    expect(current.stats.filesDownloaded).toBe(10);
  });

  it("should set error and status", () => {
    syncStats.setError("Failed to sync");
    let current: any;
    syncStats.subscribe(v => current = v)();
    expect(current.status).toBe("ERROR");
    expect(current.lastError).toBe("Failed to sync");
  });

  it("should reset to initial state", () => {
    syncStats.setStatus("SYNCING");
    syncStats.updateStats({ filesUploaded: 5 });
    syncStats.reset();
    
    let current: any;
    syncStats.subscribe(v => current = v)();
    expect(current.status).toBe("IDLE");
    expect(current.stats.filesUploaded).toBe(0);
  });
});
