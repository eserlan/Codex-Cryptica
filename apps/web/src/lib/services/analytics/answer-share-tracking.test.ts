import { describe, it, expect, vi } from "vitest";
import {
  trackAnswerShareClicked,
  trackAnswerShareCompleted,
  trackAnswerShareLinkCopied,
} from "./answer-share-tracking";

describe("trackAnswerShareClicked", () => {
  it("emits answer_share_clicked with the slug and intent", () => {
    const track = vi.fn();

    trackAnswerShareClicked(
      {
        slug: "how-do-you-track-faction-turns-between-rpg-sessions",
        intent: "answer-track-faction-turns-between-sessions",
      },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "answer_share_clicked",
      expect.objectContaining({
        slug: "how-do-you-track-faction-turns-between-rpg-sessions",
        intent: "answer-track-faction-turns-between-sessions",
      }),
    );
  });

  it("omits intent when the answer has none", () => {
    const track = vi.fn();

    trackAnswerShareClicked({ slug: "x" }, { zaraz: { track } });

    const properties = track.mock.calls[0][1];
    expect(properties).not.toHaveProperty("intent");
  });

  it("no-ops silently when window.zaraz is absent", () => {
    expect(() => trackAnswerShareClicked({ slug: "x" }, {})).not.toThrow();
  });
});

describe("trackAnswerShareCompleted", () => {
  it("emits answer_share_completed with the slug", () => {
    const track = vi.fn();

    trackAnswerShareCompleted({ slug: "x" }, { zaraz: { track } });

    expect(track).toHaveBeenCalledWith(
      "answer_share_completed",
      expect.objectContaining({ slug: "x" }),
    );
  });
});

describe("trackAnswerShareLinkCopied", () => {
  it("emits answer_share_link_copied with the slug", () => {
    const track = vi.fn();

    trackAnswerShareLinkCopied({ slug: "x" }, { zaraz: { track } });

    expect(track).toHaveBeenCalledWith(
      "answer_share_link_copied",
      expect.objectContaining({ slug: "x" }),
    );
  });
});
