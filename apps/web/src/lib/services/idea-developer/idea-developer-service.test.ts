import { describe, expect, it, vi } from "vitest";
import {
  MAX_CONVERSATION_TURNS,
  MAX_IDEA_LENGTH,
  type Conversation,
} from "generator-engine";
import { IdeaDeveloperService } from "./idea-developer-service";
import type { TurnOutcome } from "./turn-runner";
import type { UsageCheck } from "./usage-limiter";

const development = {
  mode: "develop" as const,
  alreadyInteresting: "a",
  centralQuestion: "b",
  makeItMove: "c",
  peopleWhoCare: [],
  playerDirections: [],
  consequences: "d",
  creatorQuestions: [],
  generatorSuggestions: [],
};

function setup(options: { check?: UsageCheck; outcome?: TurnOutcome } = {}) {
  const runner = {
    runFirstTurn: vi.fn().mockResolvedValue(
      options.outcome ?? {
        kind: "development",
        development,
        interactionId: "i-1",
      },
    ),
  };
  const limiter = {
    check: vi.fn().mockReturnValue(options.check ?? { allowed: true }),
    record: vi.fn(),
  };
  const hubSync = {
    add: vi.fn().mockReturnValue("hub-1"),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const service = new IdeaDeveloperService(
    runner as never,
    limiter as never,
    hubSync as never,
  );
  return { runner, limiter, hubSync, service };
}

describe("IdeaDeveloperService.start", () => {
  it("runs the first turn and records the use", async () => {
    const { service, runner, limiter } = setup();
    const result = await service.start({
      idea: "  A town.  ",
      mode: "develop",
    });
    expect(result).toMatchObject({
      status: "ok",
      interactionId: "i-1",
      ideaText: "A town.",
    });
    expect(runner.runFirstTurn).toHaveBeenCalledWith(
      expect.objectContaining({ idea: "A town." }),
    );
    expect(limiter.record).toHaveBeenCalledTimes(1);
  });

  it.each(["", "   ", "\n\t"])(
    "rejects empty input %j without a request",
    async (idea) => {
      const { service, runner, limiter } = setup();
      const result = await service.start({ idea, mode: "develop" });
      expect(result).toMatchObject({ status: "rejected", reason: "empty" });
      expect(runner.runFirstTurn).not.toHaveBeenCalled();
      expect(limiter.record).not.toHaveBeenCalled();
    },
  );

  it("rejects input over the length limit without a request", async () => {
    const { service, runner } = setup();
    const result = await service.start({
      idea: "x".repeat(MAX_IDEA_LENGTH + 1),
      mode: "develop",
    });
    expect(result).toMatchObject({ status: "rejected", reason: "too-long" });
    if (result.status === "rejected") {
      expect(result.message).toContain(String(MAX_IDEA_LENGTH));
    }
    expect(runner.runFirstTurn).not.toHaveBeenCalled();
  });

  it("accepts input exactly at the limit", async () => {
    const { service } = setup();
    const result = await service.start({
      idea: "x".repeat(MAX_IDEA_LENGTH),
      mode: "develop",
    });
    expect(result.status).toBe("ok");
  });

  it("makes no request when the limiter refuses, and returns the retry time", async () => {
    const { service, runner, limiter } = setup({
      check: { allowed: false, reason: "cooldown", retryAt: 5000 },
    });
    const result = await service.start({ idea: "A town.", mode: "develop" });
    expect(result).toMatchObject({ status: "limited", retryAt: 5000 });
    expect(runner.runFirstTurn).not.toHaveBeenCalled();
    expect(limiter.record).not.toHaveBeenCalled();
  });

  it("returns a failure and keeps the idea when the turn fails", async () => {
    const { service } = setup({
      outcome: {
        kind: "failed",
        failure: { code: "unknown", message: "Something went wrong." },
      },
    });
    const result = await service.start({ idea: "A town.", mode: "develop" });
    expect(result).toMatchObject({
      status: "failed",
      ideaText: "A town.",
      failure: { code: "unknown" },
    });
  });

  it("passes a cancelled turn through", async () => {
    const { service } = setup({ outcome: { kind: "cancelled" } });
    const result = await service.start({ idea: "A town.", mode: "develop" });
    expect(result.status).toBe("cancelled");
  });

  it("passes the needs-rpg-idea reply through", async () => {
    const { service } = setup({
      outcome: {
        kind: "needs-rpg-idea",
        message: "Tell me more.",
        interactionId: "i-9",
      },
    });
    const result = await service.start({ idea: "hello", mode: "develop" });
    expect(result).toMatchObject({
      status: "needs-rpg-idea",
      message: "Tell me more.",
    });
  });
});

describe("IdeaDeveloperService.start and the Session Hub", () => {
  it("adds one hub draft after a successful first turn and returns its id", async () => {
    const { service, hubSync } = setup();
    const result = await service.start({ idea: "A town.", mode: "develop" });
    expect(hubSync.add).toHaveBeenCalledTimes(1);
    expect(hubSync.add).toHaveBeenCalledWith(development, "A town.");
    expect(result).toMatchObject({ status: "ok", hubDraftId: "hub-1" });
  });

  it("adds nothing to the hub when the turn fails", async () => {
    const { service, hubSync } = setup({
      outcome: {
        kind: "failed",
        failure: { code: "unknown", message: "Nope." },
      },
    });
    await service.start({ idea: "A town.", mode: "develop" });
    expect(hubSync.add).not.toHaveBeenCalled();
  });

  it("adds nothing to the hub when the text was not an RPG idea", async () => {
    const { service, hubSync } = setup({
      outcome: { kind: "needs-rpg-idea", interactionId: "i-2" },
    });
    await service.start({ idea: "hello", mode: "develop" });
    expect(hubSync.add).not.toHaveBeenCalled();
  });

  it("still returns the development if the hub cannot be written", async () => {
    const { service, hubSync } = setup();
    hubSync.add.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const result = await service.start({ idea: "A town.", mode: "develop" });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.hubDraftId).toBeUndefined();
  });
});

describe("IdeaDeveloperService.continue", () => {
  const conversation = (doneTurns = 1): Conversation => ({
    ideaText: "A town.",
    turns: Array.from({ length: doneTurns }, (_, i) => ({
      kind: i === 0 ? ("idea" as const) : ("answer-questions" as const),
      mode: "develop" as const,
      text: i === 0 ? "A town." : `answer ${i}`,
      status: "done" as const,
    })),
    previousInteractionId: "i-1",
    latest: development,
    hubDraftId: "hub-1",
  });

  const second = { ...development, whatChanged: "Sharper." };

  function setupContinue(
    options: {
      check?: UsageCheck;
      outcome?: TurnOutcome;
      recovered?: TurnOutcome;
    } = {},
  ) {
    const runner = {
      runFirstTurn: vi.fn(),
      runFollowUpTurn: vi.fn().mockResolvedValue(
        options.outcome ?? {
          kind: "development",
          development: second,
          interactionId: "i-2",
        },
      ),
    };
    const limiter = {
      check: vi.fn().mockReturnValue(options.check ?? { allowed: true }),
      record: vi.fn(),
    };
    const hubSync = {
      add: vi.fn().mockReturnValue("hub-1"),
      update: vi.fn().mockReturnValue(true),
    };
    const recovery = {
      recover: vi.fn().mockResolvedValue(
        options.recovered ?? {
          kind: "development",
          development: second,
          interactionId: "i-new",
        },
      ),
    };
    const service = new IdeaDeveloperService(
      runner as never,
      limiter as never,
      hubSync as never,
      recovery as never,
    );
    return { runner, limiter, hubSync, recovery, service };
  }

  it("continues with the previous interaction id and updates the hub draft in place", async () => {
    const { service, runner, hubSync, limiter } = setupContinue();
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "They left.",
      mode: "develop",
    });
    expect(result).toMatchObject({
      status: "ok",
      interactionId: "i-2",
      turn: { kind: "answer-questions", text: "They left.", status: "done" },
    });
    expect(runner.runFollowUpTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        previousInteractionId: "i-1",
        turnIndex: 1,
        kind: "answer-questions",
      }),
    );
    expect(hubSync.update).toHaveBeenCalledWith("hub-1", second, "A town.");
    expect(hubSync.add).not.toHaveBeenCalled();
    expect(limiter.record).toHaveBeenCalledTimes(1);
  });

  it("checks the limiter on every later turn and makes no request when refused", async () => {
    const { service, runner, limiter } = setupContinue({
      check: { allowed: false, reason: "period", retryAt: 9000 },
    });
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result).toMatchObject({ status: "limited", retryAt: 9000 });
    expect(limiter.check).toHaveBeenCalled();
    expect(runner.runFollowUpTurn).not.toHaveBeenCalled();
    expect(limiter.record).not.toHaveBeenCalled();
  });

  it("refuses to continue past the turn cap without a request", async () => {
    const { service, runner } = setupContinue();
    const result = await service.continue({
      conversation: conversation(MAX_CONVERSATION_TURNS),
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result.status).toBe("capped");
    expect(runner.runFollowUpTurn).not.toHaveBeenCalled();
  });

  it("still allows the last turn under the cap", async () => {
    const { service } = setupContinue();
    const result = await service.continue({
      conversation: conversation(MAX_CONVERSATION_TURNS - 1),
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result.status).toBe("ok");
  });

  it.each(["answer-questions", "change-part"] as const)(
    "rejects empty text for %s without a request",
    async (kind) => {
      const { service, runner } = setupContinue();
      const result = await service.continue({
        conversation: conversation(),
        kind,
        text: "   ",
        mode: "develop",
      });
      expect(result).toMatchObject({ status: "rejected", reason: "empty" });
      expect(runner.runFollowUpTurn).not.toHaveBeenCalled();
    },
  );

  it("allows a mode switch with no text", async () => {
    const { service } = setupContinue();
    const result = await service.continue({
      conversation: conversation(),
      kind: "switch-mode",
      text: "",
      mode: "assess",
    });
    expect(result.status).toBe("ok");
  });

  it("rejects later text over the length limit", async () => {
    const { service, runner } = setupContinue();
    const result = await service.continue({
      conversation: conversation(),
      kind: "change-part",
      text: "x".repeat(MAX_IDEA_LENGTH + 1),
      mode: "develop",
    });
    expect(result).toMatchObject({ status: "rejected", reason: "too-long" });
    expect(runner.runFollowUpTurn).not.toHaveBeenCalled();
  });

  it("rebuilds an expired conversation once and carries on", async () => {
    const { service, recovery } = setupContinue({
      outcome: {
        kind: "failed",
        failure: { code: "expired", message: "gone" },
      },
    });
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "They left.",
      mode: "develop",
    });
    expect(recovery.recover).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "ok", interactionId: "i-new" });
  });

  it("keeps the typed input when recovery also fails", async () => {
    const { service, recovery } = setupContinue({
      outcome: {
        kind: "failed",
        failure: { code: "expired", message: "gone" },
      },
      recovered: {
        kind: "failed",
        failure: { code: "unknown", message: "Something went wrong." },
      },
    });
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "They left.",
      mode: "develop",
    });
    expect(recovery.recover).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "failed",
      failure: { code: "unknown" },
    });
  });

  it("passes a cancelled turn through without touching the hub", async () => {
    const { service, hubSync } = setupContinue({
      outcome: { kind: "cancelled" },
    });
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result.status).toBe("cancelled");
    expect(hubSync.update).not.toHaveBeenCalled();
  });

  it("still succeeds when the hub draft cannot be updated", async () => {
    const { service, hubSync } = setupContinue();
    hubSync.update.mockImplementation(() => {
      throw new Error("blocked");
    });
    const result = await service.continue({
      conversation: conversation(),
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result.status).toBe("ok");
  });

  it("does not need a hub draft to continue", async () => {
    const { service, hubSync } = setupContinue();
    const noHub = { ...conversation(), hubDraftId: undefined };
    const result = await service.continue({
      conversation: noHub,
      kind: "answer-questions",
      text: "x",
      mode: "develop",
    });
    expect(result.status).toBe("ok");
    expect(hubSync.update).not.toHaveBeenCalled();
  });
});
