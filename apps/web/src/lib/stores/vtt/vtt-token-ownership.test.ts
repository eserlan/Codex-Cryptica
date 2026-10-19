import { describe, expect, it, vi } from "vitest";
import { createFullEncounterSessionFixture } from "./map-session-test-fixtures";
import { VTTTokenOwnership } from "./vtt-token-ownership";

function setup() {
  const deps = {
    broadcastSessionSnapshotNow: vi.fn(),
    isLayerLocked: vi.fn(() => false),
  };
  const session = {
    tokens: createFullEncounterSessionFixture().tokens,
    updateToken: vi.fn(),
  };
  return { session, deps, ownership: new VTTTokenOwnership(deps, session) };
}

describe("token ownership", () => {
  it("rebinds returning guests while preserving unrelated token identities", () => {
    const { session, ownership, deps } = setup();
    const original = session.tokens["token-1"];
    session.tokens.other = { ...original, id: "other", ownerGuestName: "Bob" };
    const other = session.tokens.other;
    expect(ownership.rebindGuestOwnership("new-peer", "Ava")).toBe(true);
    expect(session.tokens["token-1"]).toMatchObject({
      ownerPeerId: "new-peer",
      ownerGuestName: "Ava",
    });
    expect(original.ownerPeerId).toBe("guest-1");
    expect(session.tokens.other).toBe(other);
    expect(deps.broadcastSessionSnapshotNow).toHaveBeenCalledOnce();
  });

  it("clears the departing peer but keeps the guest name for reconnection", () => {
    const { session, ownership, deps } = setup();
    expect(ownership.clearGuestOwnership("guest-1")).toBe(true);
    expect(session.tokens["token-1"]).toMatchObject({
      ownerPeerId: null,
      ownerGuestName: "Ava",
    });
    expect(deps.broadcastSessionSnapshotNow).toHaveBeenCalledOnce();
  });

  it("avoids replacing records or broadcasting on no-op rebinding", () => {
    const { session, ownership, deps } = setup();
    const original = session.tokens;
    expect(ownership.rebindGuestOwnership("guest-1", "Ava")).toBe(false);
    expect(ownership.rebindGuestOwnership("new-peer", "Missing")).toBe(false);
    expect(ownership.clearGuestOwnership("missing")).toBe(false);
    expect(session.tokens).toBe(original);
    expect(deps.broadcastSessionSnapshotNow).not.toHaveBeenCalled();
  });

  it("reveals a note with its body and preserves hiding when setting an owner", () => {
    const { session, ownership } = setup();
    Object.assign(session.tokens["token-1"], {
      kind: "note",
      noteBody: "Secret",
      visibleTo: "gm-only",
    });
    ownership.toggleTokenVisibility("token-1");
    expect(session.updateToken).toHaveBeenCalledWith("token-1", {
      visibleTo: "all",
      noteBody: "Secret",
    });
    ownership.setTokenOwner("token-1", "new-peer");
    expect(session.updateToken).toHaveBeenCalledWith("token-1", {
      ownerPeerId: "new-peer",
      ownerGuestName: null,
      visibleTo: "gm-only",
    });
    expect(ownership.isTokenVisible("token-1", "new-peer", false)).toBe(false);
    expect(ownership.isTokenVisible("token-1", null, true)).toBe(true);
  });

  it("checks ownership and locks before allowing movement", () => {
    const { session, ownership, deps } = setup();
    expect(ownership.canMoveToken("token-1", "guest-1")).toBe(true);
    expect(ownership.canMoveToken("token-1", "other")).toBe(false);
    expect(ownership.canMoveToken("token-1", null, true)).toBe(true);
    session.tokens["token-1"].layer = "terrain";
    deps.isLayerLocked.mockReturnValue(true);
    expect(ownership.canMoveToken("token-1", null, true)).toBe(false);
    deps.isLayerLocked.mockReturnValue(false);
    session.tokens["token-1"].locked = true;
    expect(ownership.canMoveToken("token-1", null, true)).toBe(false);
  });

  it("rejects missing tokens", () => {
    const { session, ownership } = setup();
    expect(ownership.setTokenOwner("missing", null)).toBeNull();
    expect(ownership.toggleTokenVisibility("missing")).toBeUndefined();
    expect(ownership.canMoveToken("missing", null, true)).toBe(false);
    expect(ownership.isTokenVisible("missing", null, true)).toBe(false);
    expect(session.updateToken).not.toHaveBeenCalled();
  });
});
