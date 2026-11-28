import { describe, expect, it, vi } from "vitest";
import {
  loadDiagnosticBaseline,
  saveDiagnosticBaseline,
} from "./adventure-diagnostic-baseline";
import { copyDiagnosticSnapshot } from "./adventure-review-capture";
import { diagnosticState } from "./adventure-diagnostic-state";
import { exampleSession, quietSession } from "./test-fixtures/adventure-review";

function inMemoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe("Adventure diagnostic baseline storage", () => {
  it("saves an isolated cursor only after an explicit save", () => {
    const session = exampleSession();
    const storage = inMemoryStorage();
    const before = structuredClone(diagnosticState(session));

    expect(copyDiagnosticSnapshot(session, storage).isDelta).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(loadDiagnosticBaseline(session.id, storage)).toBeNull();
    saveDiagnosticBaseline(session, storage);
    expect(storage.setItem).toHaveBeenCalledOnce();
    session.visibleState.knownFacts.push({
      id: "new-fact",
      text: "A new clue",
      source: "provisional",
    });
    expect(loadDiagnosticBaseline(session.id, storage)).toEqual({
      sessionId: session.id,
      revision: session.revision,
      turnCount: 1,
      state: before,
    });
    expect(storage.setItem.mock.calls[0][0]).toBe(
      "codex-adventure-diagnostic-baseline:session-1",
    );
  });

  it("copies a delta without advancing the saved cursor and can force a full copy", () => {
    const session = quietSession(1);
    const storage = inMemoryStorage();
    saveDiagnosticBaseline(session, storage);
    const next = quietSession(2);
    next.revision += 1;

    const delta = copyDiagnosticSnapshot(next, storage);

    expect(delta).toMatchObject({
      isDelta: true,
      fromTurnCount: 1,
      toTurnCount: 2,
    });
    expect(
      JSON.parse(delta.text).turns.map((turn: { id: string }) => turn.id),
    ).toEqual(["turn-1"]);
    expect(loadDiagnosticBaseline(next.id, storage)?.turnCount).toBe(1);
    storage.getItem.mockClear();
    expect(
      copyDiagnosticSnapshot(next, storage, { forceFull: true }),
    ).toMatchObject({ isDelta: false, fromTurnCount: 0, toTurnCount: 2 });
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it.each([null, undefined])("works when storage is %s", (storage) => {
    const session = exampleSession();
    expect(loadDiagnosticBaseline(session.id, storage)).toBeNull();
    expect(() => saveDiagnosticBaseline(session, storage)).not.toThrow();
    expect(copyDiagnosticSnapshot(session, storage).isDelta).toBe(false);
  });

  it.each([
    "{bad-json",
    "null",
    "[]",
    "{}",
    JSON.stringify({
      sessionId: "other",
      revision: 2,
      turnCount: 1,
      state: {},
    }),
    JSON.stringify({
      sessionId: "session-1",
      revision: "2",
      turnCount: 1,
      state: {},
    }),
    JSON.stringify({
      sessionId: "session-1",
      revision: 2,
      turnCount: "1",
      state: {},
    }),
    JSON.stringify({
      sessionId: "session-1",
      revision: 2,
      turnCount: 1,
      state: null,
    }),
  ])("ignores an invalid stored baseline: %s", (raw) => {
    const storage = inMemoryStorage();
    storage.values.set("codex-adventure-diagnostic-baseline:session-1", raw);

    expect(loadDiagnosticBaseline("session-1", storage)).toBeNull();
    expect(copyDiagnosticSnapshot(exampleSession(), storage).isDelta).toBe(
      false,
    );
  });

  it("preserves full-copy fallback when the session revision moves backwards", () => {
    const session = exampleSession();
    const storage = inMemoryStorage();
    saveDiagnosticBaseline(session, storage);
    session.revision -= 1;

    expect(copyDiagnosticSnapshot(session, storage).isDelta).toBe(false);
  });

  it("ignores unavailable storage reads and writes so the diagnostic remains copyable", () => {
    const storage = {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    const session = exampleSession();

    expect(loadDiagnosticBaseline(session.id, storage)).toBeNull();
    expect(() => saveDiagnosticBaseline(session, storage)).not.toThrow();
    expect(copyDiagnosticSnapshot(session, storage)).toMatchObject({
      isDelta: false,
      fromTurnCount: 0,
      toTurnCount: 1,
    });
  });
});
