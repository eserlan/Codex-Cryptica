import { describe, expect, it, vi } from "vitest";
import {
  ideaDeveloperTracker,
  trackIdeaDeveloperArrived,
  trackIdeaDeveloperGeneratorOpened,
  trackIdeaDeveloperResultShown,
  trackIdeaDeveloperSignupStarted,
  trackIdeaDeveloperSubmitted,
  trackIdeaDeveloperTurnSubmitted,
} from "./idea-developer-tracking";

function fakeWindow() {
  const track = vi.fn();
  return { win: { zaraz: { track } }, track };
}

const keys = (call: unknown[]) => Object.keys(call[1] as object).sort();

describe("idea developer funnel events carry only the listed properties", () => {
  it("arrived", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperArrived(
      {
        sourceKind: "answer",
        sourceId: "is-my-idea-good",
        suggestedMode: "assess",
      },
      win,
    );
    expect(track.mock.calls[0][0]).toBe("idea_developer_arrived");
    expect(track.mock.calls[0][1]).toEqual({
      source_kind: "answer",
      source_id: "is-my-idea-good",
      suggested_mode: "assess",
    });
  });

  it("arrived without a suggested mode leaves the property out", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperArrived({ sourceKind: "tools", sourceId: "abc" }, win);
    expect(keys(track.mock.calls[0])).toEqual(["source_id", "source_kind"]);
  });

  it("submitted", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperSubmitted({ mode: "develop" }, win);
    expect(track).toHaveBeenCalledWith("idea_developer_submitted", {
      mode: "develop",
    });
  });

  it("turn submitted", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperTurnSubmitted(
      { turnKind: "answer-questions", turnIndex: 2, mode: "assess" },
      win,
    );
    expect(track).toHaveBeenCalledWith("idea_developer_turn_submitted", {
      turn_kind: "answer-questions",
      turn_index: 2,
      mode: "assess",
    });
  });

  it("result shown", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperResultShown(
      { mode: "develop", turnIndex: 0, suggestionCount: 3 },
      win,
    );
    expect(track).toHaveBeenCalledWith("idea_developer_result_shown", {
      mode: "develop",
      turn_index: 0,
      suggestion_count: 3,
    });
  });

  it("generator opened", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperGeneratorOpened(
      { generatorKey: "settlement", position: 1 },
      win,
    );
    expect(track).toHaveBeenCalledWith("idea_developer_generator_opened", {
      generator_key: "settlement",
      position: 1,
    });
  });

  it("sign-up started", () => {
    const { win, track } = fakeWindow();
    trackIdeaDeveloperSignupStarted({}, win);
    expect(track).toHaveBeenCalledWith("idea_developer_signup_started", {
      placement: "result",
    });
  });
});

describe("idea developer tracking never carries content", () => {
  const MARKER = "ZZ-SECRET-MARKER-ZZ";

  it("has no way to accept idea, turn or result text through the tracker", () => {
    const { win, track } = fakeWindow();
    // Everything a caller could plausibly hand over, including junk keys.
    const hostile = {
      mode: "develop",
      turnKind: "answer-questions",
      turnIndex: 1,
      suggestionCount: 2,
      generatorKey: "npc",
      position: 0,
      sourceKind: "answer",
      sourceId: "abc",
      ideaText: MARKER,
      text: MARKER,
      development: { centralQuestion: MARKER },
      interactionId: MARKER,
      previousInteractionId: MARKER,
    } as never;

    trackIdeaDeveloperArrived(hostile, win);
    trackIdeaDeveloperSubmitted(hostile, win);
    trackIdeaDeveloperTurnSubmitted(hostile, win);
    trackIdeaDeveloperResultShown(hostile, win);
    trackIdeaDeveloperGeneratorOpened(hostile, win);
    trackIdeaDeveloperSignupStarted(hostile, win);

    expect(track).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(track.mock.calls)).not.toContain(MARKER);
  });

  it("stays silent, and does not throw, when analytics is not loaded", () => {
    expect(() =>
      trackIdeaDeveloperSubmitted({ mode: "develop" }, {}),
    ).not.toThrow();
    expect(() =>
      trackIdeaDeveloperSubmitted({ mode: "develop" }, undefined),
    ).not.toThrow();
  });

  it("exposes one method per event on the tracker", () => {
    expect(Object.keys(ideaDeveloperTracker).sort()).toEqual([
      "arrived",
      "generatorOpened",
      "resultShown",
      "signupStarted",
      "submitted",
      "turnSubmitted",
    ]);
  });
});
