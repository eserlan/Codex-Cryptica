import { describe, expect, it } from "vitest";
import { noticeFor } from "./notices";

describe("noticeFor", () => {
  it("turns a failed turn into an error notice with its message", () => {
    expect(
      noticeFor({
        status: "failed",
        ideaText: "x",
        failure: { code: "unknown", message: "Something went wrong." },
      }),
    ).toEqual({ kind: "error", message: "Something went wrong." });
  });

  it("does the same for a failed later turn", () => {
    expect(
      noticeFor({
        status: "failed",
        failure: { code: "bot-check", message: "Couldn't confirm you." },
      }),
    ).toEqual({ kind: "error", message: "Couldn't confirm you." });
  });

  it("keeps when to try again for a limit", () => {
    expect(
      noticeFor({
        status: "limited",
        reason: "cooldown",
        retryAt: 9000,
        message: "Wait.",
      }),
    ).toEqual({ kind: "limited", message: "Wait.", retryAt: 9000 });
  });

  it("maps a rejection and a cap", () => {
    expect(
      noticeFor({ status: "rejected", reason: "empty", message: "Write." }),
    ).toEqual({ kind: "rejected", message: "Write." });
    expect(noticeFor({ status: "capped", message: "Limit." })).toEqual({
      kind: "capped",
      message: "Limit.",
    });
  });

  it("uses the model's sentence when the text was not an RPG idea", () => {
    expect(
      noticeFor({
        status: "needs-rpg-idea",
        message: "  Tell me a game idea.  ",
        interactionId: "i",
        ideaText: "hello",
      }),
    ).toEqual({ kind: "needs-rpg-idea", message: "Tell me a game idea." });
  });

  it("falls back to a plain sentence when the model gave none", () => {
    const notice = noticeFor({
      status: "needs-rpg-idea",
      interactionId: "i",
      ideaText: "hello",
    });
    expect(notice).toMatchObject({ kind: "needs-rpg-idea" });
    expect(notice?.message.length).toBeGreaterThan(0);
  });

  it("has no notice for a result or a cancel", () => {
    expect(noticeFor({ status: "cancelled" })).toBeNull();
    expect(
      noticeFor({
        status: "ok",
        development: {} as never,
        interactionId: "i",
        ideaText: "x",
      }),
    ).toBeNull();
  });
});
