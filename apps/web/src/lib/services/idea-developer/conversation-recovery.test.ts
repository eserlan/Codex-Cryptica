import { describe, expect, it, vi } from "vitest";
import { InteractionExpiredError } from "@codex/ai-engine";
import type { Conversation } from "generator-engine";
import { ConversationRecovery } from "./conversation-recovery";
import { TurnRunner } from "./turn-runner";

const person = (n: number) => ({
  name: `Person ${n}`,
  role: "Role",
  wants: "Something",
  conflictsWith: "Someone else",
});

const changed = JSON.stringify({
  alreadyInteresting: "a",
  centralQuestion: "b",
  makeItMove: "c",
  peopleWhoCare: [person(1), person(2)],
  playerDirections: [
    { title: "One", description: "x" },
    { title: "Two", description: "y" },
  ],
  consequences: "d",
  creatorQuestions: ["q1?", "q2?"],
  generatorSuggestions: [],
  whatChanged: "Rebuilt.",
});

const conversation: Conversation = {
  ideaText: "A town of dragon parts.",
  turns: [
    {
      kind: "idea",
      mode: "develop",
      text: "A town of dragon parts.",
      status: "done",
    },
  ],
  previousInteractionId: "gone",
  latest: JSON.parse(changed),
};

const params = {
  conversation,
  kind: "answer-questions" as const,
  text: "They left.",
  mode: "develop" as const,
  turnIndex: 1,
};

describe("ConversationRecovery", () => {
  it("rebuilds the conversation and returns the new interaction id", async () => {
    const send = vi.fn().mockResolvedValue({ id: "i-new", text: changed });
    const outcome = await new ConversationRecovery(
      new TurnRunner({ sendInteraction: send }),
    ).recover(params);
    expect(outcome).toMatchObject({
      kind: "development",
      interactionId: "i-new",
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].previousInteractionId).toBeFalsy();
  });

  it("tries once only: a second expiry is a failure, not a loop", async () => {
    const send = vi.fn().mockRejectedValue(new InteractionExpiredError("gone"));
    const outcome = await new ConversationRecovery(
      new TurnRunner({ sendInteraction: send }),
    ).recover(params);
    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ kind: "failed" });
  });

  it("passes other failures through so the typed input can be kept", async () => {
    const send = vi.fn().mockRejectedValue(new Error("boom"));
    const outcome = await new ConversationRecovery(
      new TurnRunner({ sendInteraction: send }),
    ).recover(params);
    expect(outcome).toMatchObject({
      kind: "failed",
      failure: { code: "unknown" },
    });
  });

  it("returns cancelled when the user cancels during recovery", async () => {
    const send = vi
      .fn()
      .mockRejectedValue(new DOMException("aborted", "AbortError"));
    const outcome = await new ConversationRecovery(
      new TurnRunner({ sendInteraction: send }),
    ).recover(params);
    expect(outcome.kind).toBe("cancelled");
  });
});
