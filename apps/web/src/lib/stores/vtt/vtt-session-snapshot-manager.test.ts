import { describe, expect, it, vi } from "vitest";
import { createSnapshotManagerHarness } from "./map-session-test-helpers";
import {
  createFullEncounterSessionFixture,
  createLegacyEncounterSessionFixture,
  createPartialEncounterSessionFixture,
} from "./map-session-test-fixtures";
import { VTTSessionSnapshotManager } from "./vtt-session-snapshot-manager";

describe("VTTSessionSnapshotManager", () => {
  it("creates snapshots with token, initiative, chat, measurement, grid, fog, and map metadata", () => {
    const harness = createSnapshotManagerHarness();
    harness.loadFullFixture();
    const manager = new VTTSessionSnapshotManager(harness.deps);

    const snapshot = manager.createSnapshot();

    expect(snapshot).toMatchObject(createFullEncounterSessionFixture());
    expect(snapshot.tokens["token-1"]).not.toBe(
      harness.state.tokens["token-1"],
    );
    expect(snapshot.chatMessages).not.toBe(harness.state.chatMessages);
  });

  it("applies full encounter snapshots into live state", () => {
    const harness = createSnapshotManagerHarness();
    const manager = new VTTSessionSnapshotManager(harness.deps);
    const snapshot = createFullEncounterSessionFixture();

    manager.applySnapshot(snapshot);

    expect(harness.state.sessionId).toBe(snapshot.id);
    expect(harness.state.mapId).toBe(snapshot.mapId);
    expect(harness.state.mode).toBe(snapshot.mode);
    expect(harness.state.tokens["token-1"]).toMatchObject(
      snapshot.tokens["token-1"],
    );
    expect(harness.state.selection).toBe("token-1");
    expect([...harness.state.selectedTokens]).toEqual(["token-1"]);
    expect(harness.state.initiativeOrder).toEqual(["token-1"]);
    expect(harness.state.round).toBe(3);
    expect(harness.state.gridSize).toBe(70);
    expect(harness.state.gridUnit).toBe("m");
    expect(harness.state.gridDistance).toBe(2);
  });

  it("normalizes legacy token visibility and partial snapshots", () => {
    const harness = createSnapshotManagerHarness();
    const manager = new VTTSessionSnapshotManager(harness.deps);

    manager.applySnapshot(createLegacyEncounterSessionFixture());
    expect(harness.state.tokens["legacy-token"].visibleTo).toBe("all");

    manager.applySnapshot(createPartialEncounterSessionFixture());
    expect(harness.state.selection).toBeNull();
    expect(harness.state.turnIndex).toBe(0);
    expect(harness.state.chatMessages).toEqual([]);
    expect(harness.state.lastPing).toBeNull();
  });

  it("repairs negative turns without mutating the saved snapshot", () => {
    const harness = createSnapshotManagerHarness();
    const manager = new VTTSessionSnapshotManager(harness.deps);
    const snapshot = createFullEncounterSessionFixture();
    snapshot.turnIndex = -3;
    snapshot.selection = "missing-token";

    manager.applySnapshot(snapshot);

    expect(harness.state.turnIndex).toBe(0);
    expect(harness.state.selection).toBeNull();
    expect(snapshot.turnIndex).toBe(-3);
    expect(snapshot.selection).toBe("missing-token");
  });

  it("emits a canonical session snapshot when applied non-silently", () => {
    const harness = createSnapshotManagerHarness();
    const manager = new VTTSessionSnapshotManager(harness.deps);

    manager.applySnapshot(createFullEncounterSessionFixture(), false);

    expect(harness.state.emitted).toHaveLength(1);
    expect(harness.state.emitted[0]).toMatchObject({
      type: "SESSION_SNAPSHOT",
      session: {
        id: "enc-full",
        mapId: "map-1",
      },
    });
  });

  it("uses injected dependencies instead of singleton state", () => {
    const harness = createSnapshotManagerHarness();
    const clearPendingSessionSnapshotBroadcast = vi.fn();
    const manager = new VTTSessionSnapshotManager({
      ...harness.deps,
      clearPendingSessionSnapshotBroadcast,
    });

    manager.applySnapshot(createFullEncounterSessionFixture());

    expect(clearPendingSessionSnapshotBroadcast).toHaveBeenCalled();
  });
});
