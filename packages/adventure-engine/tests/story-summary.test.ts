import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  attachStorySummary,
  buildAdventurePrompt,
  buildStorySummaryRequest,
  MAX_STORY_SO_FAR_CHARS,
  parseAdventureSession,
  PROMPT_TRANSCRIPT_TURNS,
  SUMMARY_CHUNK_TURNS,
  SUMMARY_TRIGGER_TURNS,
  unsummarisedTurns,
  type AdventureSession,
} from "../src";
import { meta, now, proposal, session } from "./reducer-fixtures";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

function withTurns(count: number, overrides = {}): AdventureSession {
  const s = session();
  s.turns = Array.from({ length: count }, (_, i) => ({
    id: `turn-${i}`,
    sequence: i,
    inputId: `input-${i}`,
    playerAction: `Action ${i}`,
    narration: `Narration ${i}`,
    visiblePatch: {
      objectives: emptyPatch(),
      activeCharacters: emptyPatch(),
      knownFacts: emptyPatch(),
      relationships: emptyPatch(),
    },
    hiddenPatch: { secrets: emptyPatch(), gmThreads: emptyPatch() },
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: now,
  })) as unknown as AdventureSession["turns"];
  return Object.assign(s, overrides);
}

const WINDOW = PROMPT_TRANSCRIPT_TURNS;

describe("when a summary is due", () => {
  it("waits until enough turns have left the transcript window", () => {
    const justShort = withTurns(WINDOW + SUMMARY_TRIGGER_TURNS - 1);
    expect(unsummarisedTurns(justShort)).toHaveLength(
      SUMMARY_TRIGGER_TURNS - 1,
    );
    expect(buildStorySummaryRequest(justShort)).toBeUndefined();
    const due = buildStorySummaryRequest(
      withTurns(WINDOW + SUMMARY_TRIGGER_TURNS),
    );
    expect(due?.turns).toHaveLength(SUMMARY_TRIGGER_TURNS);
    expect(due?.throughSequence).toBe(SUMMARY_TRIGGER_TURNS - 1);
    expect(due).not.toHaveProperty("previous");
  });

  it("never includes the turns still inside the transcript window", () => {
    const s = withTurns(WINDOW + SUMMARY_TRIGGER_TURNS);
    const sequences = buildStorySummaryRequest(s)!.turns.map((t) => t.sequence);
    expect(Math.max(...sequences)).toBe(s.turns.length - WINDOW - 1);
  });

  it("catches a long session up in chunks, oldest first", () => {
    const s = withTurns(WINDOW + 100);
    const first = buildStorySummaryRequest(s)!;
    expect(first.turns).toHaveLength(SUMMARY_CHUNK_TURNS);
    expect(first.turns[0]?.sequence).toBe(0);
    const saved = attachStorySummary(
      s,
      { text: "Notes.", throughSequence: first.throughSequence },
      now,
    );
    if (!saved.ok) throw new Error("Expected summary");
    const second = buildStorySummaryRequest(saved.value)!;
    expect(second.previous).toBe("Notes.");
    expect(second.turns[0]?.sequence).toBe(SUMMARY_CHUNK_TURNS);
  });

  it("is not due for an archived adventure", () => {
    expect(
      buildStorySummaryRequest(withTurns(60, { status: "archived" })),
    ).toBeUndefined();
  });

  it("sends only the player's words and the narration, clipped", () => {
    const s = withTurns(WINDOW + SUMMARY_TRIGGER_TURNS);
    s.turns[0]!.narration = "n".repeat(5_000);
    s.hiddenState.secrets = [{ id: "s", text: "SECRET", status: "hidden" }];
    const request = buildStorySummaryRequest(s)!;
    expect(Object.keys(request.turns[0]!).sort()).toEqual([
      "gm",
      "player",
      "sequence",
    ]);
    expect(request.turns[0]!.gm.length).toBeLessThanOrEqual(1_200);
    expect(JSON.stringify(request)).not.toContain("SECRET");
  });
});

describe("attaching a summary", () => {
  const due = () => withTurns(WINDOW + SUMMARY_TRIGGER_TURNS);

  it("stores the notes without creating a revision, and a later turn commit keeps them", () => {
    const s = due();
    const result = attachStorySummary(
      s,
      { text: "  The party left town.  ", throughSequence: 7 },
      "2026-11-11T10:00:00.000Z",
    );
    if (!result.ok) throw new Error("Expected summary");
    expect(result.value.storySoFar).toEqual({
      text: "The party left town.",
      throughSequence: 7,
      updatedAt: "2026-11-11T10:00:00.000Z",
    });
    expect(result.value.revision).toBe(s.revision);
    expect(s.storySoFar).toBeUndefined();
    const committed = applyCompletedTurn(
      result.value,
      proposal(),
      { ...meta, turnId: "fresh-turn", inputId: "fresh-input" },
      meta.now,
      () => "new-id",
    );
    if (!committed.ok) throw new Error("Expected turn");
    expect(committed.value.storySoFar?.text).toBe("The party left town.");
    expect(committed.value.revision).toBe(s.revision + 1);
  });

  it.each([
    ["empty notes", { text: "   ", throughSequence: 7 }, "invalid-schema"],
    [
      "over-long notes",
      { text: "x".repeat(MAX_STORY_SO_FAR_CHARS + 1), throughSequence: 7 },
      "invalid-schema",
    ],
    [
      "a turn still in the window",
      { text: "Notes.", throughSequence: 15 },
      "conflicting-patch",
    ],
    [
      "a turn that does not exist",
      { text: "Notes.", throughSequence: 99 },
      "conflicting-patch",
    ],
  ])("rejects %s and leaves the session untouched", (_l, result, code) => {
    const s = due();
    const before = structuredClone(s);
    expect(attachStorySummary(s, result, now)).toMatchObject({
      ok: false,
      errors: [{ code }],
    });
    expect(s).toEqual(before);
  });

  it("rejects a result for turns already summarised", () => {
    const first = attachStorySummary(
      due(),
      { text: "Notes.", throughSequence: 7 },
      now,
    );
    if (!first.ok) throw new Error("Expected summary");
    expect(
      attachStorySummary(
        first.value,
        { text: "Late.", throughSequence: 7 },
        now,
      ),
    ).toMatchObject({ ok: false, errors: [{ code: "conflicting-patch" }] });
  });

  it("rejects a summary for an archived adventure", () => {
    expect(
      attachStorySummary(
        withTurns(24, { status: "archived" }),
        { text: "Notes.", throughSequence: 7 },
        now,
      ),
    ).toMatchObject({ ok: false, errors: [{ code: "invalid-transition" }] });
  });
});

describe("what the model sees and what is saved", () => {
  const promptFor = (s: AdventureSession) =>
    buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Look",
      anchors: [],
      relevant: [],
    });

  it("sends the notes with the state, and the last turns as the transcript", () => {
    const s = withTurns(30);
    s.storySoFar = {
      text: "The party left town.",
      throughSequence: 20,
      updatedAt: now,
    };
    const prompt = promptFor(s);
    expect(prompt.state).toContain("The party left town.");
    expect(JSON.parse(prompt.transcript)).toHaveLength(WINDOW);
  });

  it("sends nothing extra before the first summary", () => {
    expect(JSON.parse(promptFor(withTurns(30)).state)).not.toHaveProperty(
      "storySoFar",
    );
  });

  it("round-trips through a saved session, and old sessions still load", () => {
    const s = withTurns(2);
    s.storySoFar = { text: "Notes.", throughSequence: 0, updatedAt: now };
    expect(
      parseAdventureSession(JSON.parse(JSON.stringify(s))).storySoFar,
    ).toEqual(s.storySoFar);
    expect(parseAdventureSession(session()).storySoFar).toBeUndefined();
  });

  it("rejects saved notes that are over-long or empty", () => {
    const s = JSON.parse(JSON.stringify(session()));
    for (const text of ["", "x".repeat(MAX_STORY_SO_FAR_CHARS + 1)]) {
      expect(() =>
        parseAdventureSession({
          ...s,
          storySoFar: { text, throughSequence: 0, updatedAt: now },
        }),
      ).toThrow();
    }
  });
});
