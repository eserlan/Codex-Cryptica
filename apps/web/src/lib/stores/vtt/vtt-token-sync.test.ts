import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeTokenVisibility } from "map-engine";
import type { TokenStateUpdateInput } from "../../../types/vtt";
import { createFullEncounterSessionFixture } from "./map-session-test-fixtures";
import { VTTTokenSync } from "./vtt-token-sync";

function setup() {
  const deps = {
    emit: vi.fn(),
    persistDraft: vi.fn(),
    queueSessionSnapshotBroadcast: vi.fn(),
    broadcastSessionSnapshotNow: vi.fn(),
  };
  const session = {
    tokens: createFullEncounterSessionFixture().tokens,
    updateToken: vi.fn(
      (id: string, updates: TokenStateUpdateInput, _silent: boolean) => {
        const current = session.tokens[id];
        if (!current) return null;
        const next = {
          ...current,
          ...updates,
          visibleTo: normalizeTokenVisibility(
            updates.visibleTo ?? current.visibleTo,
          ),
        };
        session.tokens = { ...session.tokens, [id]: next };
        return next;
      },
    ),
  };
  return { deps, session, sync: new VTTTokenSync(deps, session) };
}

afterEach(() => vi.useRealTimers());

describe("token sync publication", () => {
  it("publishes local lifecycle changes or persists them when silent", () => {
    const { sync, deps } = setup();
    const message = { type: "TOKEN_REMOVED" as const, tokenId: "token-1" };
    sync.publish(message, false);
    expect(deps.emit).toHaveBeenCalledWith(message);
    sync.publish(message, true);
    expect(deps.emit).toHaveBeenCalledOnce();
    expect(deps.persistDraft).toHaveBeenCalledOnce();
  });

  it("persists silent changes without emitting", () => {
    const { sync, deps } = setup();
    sync.publishUpdate("token-1", { x: 20 }, true);
    expect(deps.persistDraft).toHaveBeenCalledOnce();
    expect(deps.emit).not.toHaveBeenCalled();
    expect(deps.queueSessionSnapshotBroadcast).not.toHaveBeenCalled();
  });

  it("debounces geometry changes even when they also change ownership", () => {
    const { sync, deps } = setup();
    sync.publishUpdate("token-1", { width: 100, ownerPeerId: null }, false);
    expect(deps.queueSessionSnapshotBroadcast).toHaveBeenCalledOnce();
    expect(deps.emit).not.toHaveBeenCalled();
    expect(deps.broadcastSessionSnapshotNow).not.toHaveBeenCalled();
  });

  it.each<TokenStateUpdateInput>([
    { ownerPeerId: null },
    { ownerGuestName: null },
    { visibleTo: "gm-only" },
    { statusEffects: [] },
    { isVisionSource: false },
  ])("follows sensitive updates with a canonical snapshot: %o", (updates) => {
    const { sync, deps } = setup();
    sync.publishUpdate("token-1", updates, false);
    expect(deps.emit).toHaveBeenCalledWith({
      type: "TOKEN_STATE_UPDATE",
      tokenId: "token-1",
      delta: { ...updates, x: undefined, y: undefined },
    });
    expect(deps.broadcastSessionSnapshotNow).toHaveBeenCalledOnce();
  });

  it("publishes ordinary metadata without an extra snapshot", () => {
    const { sync, deps } = setup();
    sync.publishUpdate("token-1", { rotation: 90 }, false);
    expect(deps.emit).toHaveBeenCalledOnce();
    expect(deps.broadcastSessionSnapshotNow).not.toHaveBeenCalled();
  });
});

describe("optimistic token changes", () => {
  it.each(["move", "rotation"] as const)(
    "reverts an unconfirmed %s after 500ms",
    (kind) => {
      vi.useFakeTimers();
      const { sync, session, deps } = setup();
      const previous = session.tokens["token-1"];
      sync.request(kind, previous.id, { x: 300, rotation: 90 }, false);
      vi.advanceTimersByTime(499);
      expect(session.tokens[previous.id].x).toBe(300);
      vi.advanceTimersByTime(1);
      expect(session.tokens[previous.id]).toEqual(previous);
      expect(deps.persistDraft).toHaveBeenCalledOnce();
    },
  );

  it.each(["move", "rotation"] as const)("keeps a confirmed %s", (kind) => {
    vi.useFakeTimers();
    const { sync, session } = setup();
    sync.request(kind, "token-1", { x: 300 }, false);
    sync.confirm(kind, "token-1");
    vi.advanceTimersByTime(500);
    expect(session.tokens["token-1"].x).toBe(300);
  });

  it("replaces a previous timer and retains the last request's starting state", () => {
    vi.useFakeTimers();
    const { sync, session } = setup();
    sync.request("move", "token-1", { x: 200 }, false);
    vi.advanceTimersByTime(250);
    sync.request("move", "token-1", { x: 300 }, false);
    vi.advanceTimersByTime(250);
    expect(session.tokens["token-1"].x).toBe(300);
    vi.advanceTimersByTime(250);
    expect(session.tokens["token-1"].x).toBe(200);
  });

  it("clears both kinds of timer on reset", () => {
    vi.useFakeTimers();
    const { sync, session, deps } = setup();
    sync.request("move", "token-1", { x: 300 }, false);
    sync.request("rotation", "token-1", { rotation: 90 }, false);
    sync.clear();
    vi.advanceTimersByTime(500);
    expect(session.tokens["token-1"]).toMatchObject({ x: 300, rotation: 90 });
    expect(deps.persistDraft).not.toHaveBeenCalled();
  });

  it("does not schedule missing or persistent requests, or resurrect removed tokens", () => {
    vi.useFakeTimers();
    const { sync, session, deps } = setup();
    expect(sync.request("move", "missing", { x: 0 }, false)).toBeNull();
    sync.request("move", "token-1", { x: 300 }, true);
    vi.advanceTimersByTime(500);
    expect(session.tokens["token-1"].x).toBe(300);
    sync.request("rotation", "token-1", { rotation: 90 }, false);
    delete session.tokens["token-1"];
    vi.advanceTimersByTime(500);
    expect(session.tokens["token-1"]).toBeUndefined();
    expect(deps.persistDraft).not.toHaveBeenCalled();
  });
});
