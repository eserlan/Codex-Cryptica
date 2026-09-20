import { describe, expect, it } from "vitest";
import { MAX_CONVERSATION_TURNS } from "generator-engine";
import { parseStoredSession, serialiseSession } from "./session-storage";

const development = {
  mode: "develop",
  alreadyInteresting: "a",
  centralQuestion: "b",
  makeItMove: "c",
  peopleWhoCare: [
    { name: "A", role: "one", wants: "x", conflictsWith: "B" },
    { name: "B", role: "two", wants: "y", conflictsWith: "A" },
  ],
  playerDirections: [
    { title: "One", description: "x" },
    { title: "Two", description: "y" },
  ],
  consequences: "d",
  creatorQuestions: ["q1", "q2"],
  generatorSuggestions: [
    { generatorKey: "settlement", reason: "r1" },
    { generatorKey: "npc", reason: "r2" },
  ],
};

const conversation = {
  ideaText: "A town.",
  turns: [{ kind: "idea", mode: "develop", text: "A town.", status: "done" }],
  previousInteractionId: "i-1",
  latest: development,
  hubDraftId: "hub-1",
};

describe("session storage", () => {
  it("round-trips a session with a conversation", () => {
    const raw = serialiseSession({
      ideaDraft: "A town.",
      mode: "assess",
      conversation: conversation as never,
    });
    const parsed = parseStoredSession(raw);
    expect(parsed).toMatchObject({
      ideaDraft: "A town.",
      mode: "assess",
      conversation: { ideaText: "A town.", previousInteractionId: "i-1" },
    });
  });

  it("round-trips a session with no conversation", () => {
    const raw = serialiseSession({
      ideaDraft: "x",
      mode: "develop",
      conversation: null,
    });
    expect(parseStoredSession(raw)).toEqual({
      ideaDraft: "x",
      mode: "develop",
      conversation: null,
    });
  });

  it.each([null, "", "{not json", "[]", "null", '{"version":99}', '"text"'])(
    "ignores unusable data: %s",
    (raw) => {
      expect(parseStoredSession(raw)).toBeNull();
    },
  );

  it("ignores an unknown mode and keeps the rest", () => {
    const parsed = parseStoredSession(
      JSON.stringify({
        version: 1,
        ideaDraft: "x",
        mode: "challenge",
        conversation: null,
      }),
    );
    expect(parsed).toEqual({ ideaDraft: "x", mode: null, conversation: null });
  });

  it("drops a conversation that has no result or no idea", () => {
    const noLatest = { ...conversation, latest: undefined };
    const noIdea = { ...conversation, ideaText: 5 };
    for (const c of [noLatest, noIdea]) {
      const parsed = parseStoredSession(
        JSON.stringify({
          version: 1,
          ideaDraft: "x",
          mode: "develop",
          conversation: c,
        }),
      );
      expect(parsed?.conversation).toBeNull();
    }
  });

  it("drops a conversation whose stored result or turn shape is malformed", () => {
    for (const malformed of [
      { ...conversation, latest: true },
      {
        ...conversation,
        turns: [{ kind: "idea", mode: "develop", text: "A town." }],
      },
      {
        ...conversation,
        latest: { ...development, peopleWhoCare: "not a list" },
      },
    ]) {
      const parsed = parseStoredSession(
        JSON.stringify({
          version: 1,
          ideaDraft: "x",
          mode: "develop",
          conversation: malformed,
        }),
      );
      expect(parsed?.conversation).toBeNull();
    }
  });

  it("drops a conversation whose result violates section bounds", () => {
    for (const latest of [
      { ...development, peopleWhoCare: [] },
      { ...development, playerDirections: [] },
      { ...development, creatorQuestions: ["only one"] },
      { ...development, generatorSuggestions: [] },
      {
        ...development,
        playerDirections: [
          { title: "Same", description: "x" },
          { title: " same ", description: "y" },
        ],
      },
    ]) {
      const parsed = parseStoredSession(
        JSON.stringify({
          version: 1,
          ideaDraft: "x",
          mode: "develop",
          conversation: { ...conversation, latest },
        }),
      );
      expect(parsed?.conversation).toBeNull();
    }
  });

  it("drops a conversation with too many turns or overlong turn text", () => {
    const tooManyTurns = Array.from(
      { length: MAX_CONVERSATION_TURNS + 1 },
      (_, index) => ({
        kind: "idea",
        mode: "develop",
        text: `Turn ${index}`,
        status: "done",
      }),
    );
    for (const turns of [
      tooManyTurns,
      [
        {
          kind: "idea",
          mode: "develop",
          text: "x".repeat(4001),
          status: "done",
        },
      ],
      [
        {
          kind: "answer-questions",
          mode: "develop",
          text: "",
          status: "done",
        },
      ],
    ]) {
      const parsed = parseStoredSession(
        JSON.stringify({
          version: 1,
          ideaDraft: "x",
          mode: "develop",
          conversation: { ...conversation, turns },
        }),
      );
      expect(parsed?.conversation).toBeNull();
    }
  });

  it("treats a non-string draft as empty", () => {
    const parsed = parseStoredSession(
      JSON.stringify({
        version: 1,
        ideaDraft: 7,
        mode: "develop",
        conversation: null,
      }),
    );
    expect(parsed?.ideaDraft).toBe("");
  });
});
