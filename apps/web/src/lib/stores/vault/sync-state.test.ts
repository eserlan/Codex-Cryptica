import { afterEach, describe, expect, it, vi } from "vitest";
import type { VaultRepository } from "@codex/vault-engine";
import type { VaultRecord } from "../../utils/idb";
import { VaultSyncState } from "./sync-state.svelte";
import { VaultSyncError } from "./sync-types";

afterEach(() => vi.useRealTimers());

function createState() {
  const repository = { pendingSaveCount: 0 };
  const record = { lastInternalChange: 20, lastSavedToFolder: 10 };
  const state = new VaultSyncState({
    repository: repository as VaultRepository,
    activeVaultRecord: () => record as VaultRecord,
  });
  return { state, repository, record };
}

describe("VaultSyncState", () => {
  it("derives saving and dirty state while preserving explicit status priority", () => {
    const { state, repository, record } = createState();
    expect(state.isDirty).toBe(true);
    repository.pendingSaveCount = 2;
    expect(state.status).toBe("saving");
    state.setStatus("error");
    expect(state.status).toBe("error");
    state.setStatus("loading");
    expect(state.isDirty).toBe(false);
    state.setStatus("idle");
    record.lastSavedToFolder = 30;
    expect(state.isDirty).toBe(false);
  });

  it("expires saved status and cancels its timer when another status wins", () => {
    vi.useFakeTimers();
    const { state } = createState();
    state.setStatus("saved");
    vi.advanceTimersByTime(2499);
    expect(state.status).toBe("saved");
    vi.advanceTimersByTime(1);
    expect(state.status).toBe("idle");
    state.setStatus("saved");
    state.setStatus("error");
    vi.advanceTimersByTime(2500);
    expect(state.status).toBe("error");
  });
});

describe("VaultSyncError", () => {
  it("keeps the error code, message and original cause", () => {
    const cause = new Error("unreadable");
    const error = new VaultSyncError("vault_load_failed", "Load failed", cause);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "VaultSyncError",
      code: "vault_load_failed",
      message: "Load failed",
      cause,
    });
  });
});
