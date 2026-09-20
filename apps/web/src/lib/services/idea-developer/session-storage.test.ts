import { describe, expect, it } from "vitest";
import { parseStoredSession, serialiseSession } from "./session-storage";

const development = {
  mode: "develop",
  alreadyInteresting: "a",
  centralQuestion: "b",
  makeItMove: "c",
  peopleWhoCare: [],
  playerDirections: [],
  consequences: "d",
  creatorQuestions: [],
  generatorSuggestions: [],
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
