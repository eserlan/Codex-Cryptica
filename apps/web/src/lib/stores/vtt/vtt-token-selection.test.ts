import { describe, expect, it, vi } from "vitest";
import { createFullEncounterSessionFixture } from "./map-session-test-fixtures";
import { VTTTokenSelection } from "./vtt-token-selection";

function setup() {
  const session = {
    tokens: createFullEncounterSessionFixture().tokens,
    selection: null as string | null,
    selectedTokens: new Set<string>(),
  };
  const emit = vi.fn();
  return { session, emit, selection: new VTTTokenSelection(session, emit) };
}

describe("token selection", () => {
  it("selects existing tokens and emits the primary selection", () => {
    const { session, emit, selection } = setup();
    selection.setSelection("token-1");
    expect(session.selection).toBe("token-1");
    expect(session.selectedTokens).toEqual(new Set(["token-1"]));
    expect(emit).toHaveBeenCalledWith({
      type: "TOKEN_SELECT",
      tokenId: "token-1",
    });
  });

  it("ignores a missing primary token", () => {
    const { session, emit, selection } = setup();
    selection.setSelection("missing");
    selection.addToSelection("missing");
    expect(session.selection).toBeNull();
    expect(session.selectedTokens.size).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it("keeps multi-selection's supplied IDs and selects the first", () => {
    const { session, emit, selection } = setup();
    selection.setMultiSelection(["token-1", "other", "token-1"]);
    expect(session.selection).toBe("token-1");
    expect(session.selectedTokens).toEqual(new Set(["token-1", "other"]));
    expect(emit).toHaveBeenCalledOnce();
    selection.removeFromSelection("token-1");
    expect(session.selection).toBe("other");
    selection.removeFromSelection("other");
    expect(session.selection).toBeNull();
  });

  it("adds a selection without emitting or replacing an existing primary", () => {
    const { session, emit, selection } = setup();
    selection.addToSelection("token-1");
    expect(session.selection).toBe("token-1");
    session.tokens.other = { ...session.tokens["token-1"], id: "other" };
    selection.addToSelection("other");
    selection.removeFromSelection("other");
    expect(session.selection).toBe("token-1");
    expect(emit).not.toHaveBeenCalled();
  });

  it("clears both fields and preserves the distinct empty multi-selection message behaviour", () => {
    const { session, emit, selection } = setup();
    selection.setMultiSelection([]);
    expect(emit).not.toHaveBeenCalled();
    selection.setSelection(null);
    expect(emit).toHaveBeenCalledWith({ type: "TOKEN_SELECT", tokenId: null });
    selection.addToSelection("token-1");
    selection.clearSelection();
    expect(session.selection).toBeNull();
    expect(session.selectedTokens.size).toBe(0);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
