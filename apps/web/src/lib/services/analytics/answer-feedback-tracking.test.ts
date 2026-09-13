import { describe, it, expect, vi } from "vitest";
import { trackAnswerUsefulVote } from "./answer-feedback-tracking";

describe("trackAnswerUsefulVote", () => {
  it("emits answer_useful_vote with slug, intent and value", () => {
    const track = vi.fn();

    trackAnswerUsefulVote(
      { slug: "x", intent: "answer-x", value: "yes" },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "answer_useful_vote",
      expect.objectContaining({ slug: "x", intent: "answer-x", value: "yes" }),
    );
  });

  it("includes reason only for a no vote that provides one", () => {
    const track = vi.fn();

    trackAnswerUsefulVote(
      { slug: "x", value: "no", reason: "Too vague" },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "answer_useful_vote",
      expect.objectContaining({ value: "no", reason: "Too vague" }),
    );
  });

  it("omits intent and reason when not provided", () => {
    const track = vi.fn();

    trackAnswerUsefulVote({ slug: "x", value: "yes" }, { zaraz: { track } });

    const properties = track.mock.calls[0][1];
    expect(properties).not.toHaveProperty("intent");
    expect(properties).not.toHaveProperty("reason");
  });

  it("no-ops silently when window.zaraz is absent", () => {
    expect(() =>
      trackAnswerUsefulVote({ slug: "x", value: "yes" }, {}),
    ).not.toThrow();
  });
});
