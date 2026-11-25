/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureCompletionPanel from "./AdventureCompletionPanel.svelte";
import type { AdventureCompletionSummary } from "@codex/adventure-engine";

function sampleCompletion(
  overrides: Partial<AdventureCompletionSummary> = {},
): AdventureCompletionSummary {
  return {
    eventId: "emergent:em-1:turn-4",
    source: "emergent",
    targetId: "em-1",
    result: "achieved",
    heading: "Secure fair water access for the lower ward",
    epilogue:
      "The council ratified, sealed, and publicly proclaimed the water-access compact.",
    worldImpacts: [
      "The eastern sluice was reopened by council order.",
      "The water-access compact is publicly posted in the square.",
    ],
    unresolvedConsequences: ["Who hired Sándor's courier remains unknown"],
    ...overrides,
  };
}

describe("AdventureCompletionPanel (#5192)", () => {
  it("renders goal heading, epilogue, world impacts, and triggers continue/find-another/finish actions", async () => {
    const onContinue = vi.fn();
    const onFindAnother = vi.fn();
    const onFinish = vi.fn();

    render(AdventureCompletionPanel, {
      completion: sampleCompletion(),
      onContinue,
      onFindAnother,
      onFinish,
    });

    const panel = screen.getByTestId("adventure-completion-panel");
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-labelledby")).toBeTruthy();
    const live = panel.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("Adventure Complete");
    expect(
      screen.getByText("Secure fair water access for the lower ward"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("adventure-completion-epilogue").textContent,
    ).toContain("ratified, sealed");
    expect(
      screen.getByTestId("adventure-completion-impacts").querySelectorAll("li")
        .length,
    ).toBe(2);
    expect(
      screen.getByTestId("adventure-completion-unresolved").textContent,
    ).toContain("Sándor's courier");

    await fireEvent.click(
      screen.getByRole("button", { name: /continue exploring/i }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);

    await fireEvent.click(
      screen.getByRole("button", { name: /find another adventure/i }),
    );
    expect(onFindAnother).toHaveBeenCalledTimes(1);

    await fireEvent.click(
      screen.getByRole("button", { name: /finish for now/i }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("supports Escape key dismissal and hides Finish for now when readOnly", async () => {
    const onContinue = vi.fn();
    render(AdventureCompletionPanel, {
      completion: sampleCompletion({
        result: "failed",
        heading: "Toll negotiation",
      }),
      readOnly: true,
      onContinue,
      onFindAnother: vi.fn(),
      onFinish: vi.fn(),
    });

    expect(screen.getByText("Arc Concluded")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /finish for now/i }),
    ).toBeNull();

    const panel = screen.getByTestId("adventure-completion-panel");
    await fireEvent.keyDown(panel, { key: "Escape" });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("reveals related adventure pitches on opt-in click and launches chosen story (#5194)", async () => {
    const onLaunchContinuation = vi.fn();
    render(AdventureCompletionPanel, {
      completion: sampleCompletion(),
      continuationSet: {
        sourceRevision: 4,
        sourceOutcomeId: "emergent:em-1:turn-4",
        freshOption: {
          title: "Start something unrelated",
          premise: "Begin a fresh adventure.",
        },
        candidates: [
          {
            id: "cont:character:p-1:em-1",
            anchorType: "character",
            sourceRecordIds: ["p-1"],
            playerSafeTitle: "Follow up with Clerk Sándor",
            playerSafePremise: "Ask Sándor about the countersigned order.",
            uncertainty: "What Sándor knows next remains unconfirmed.",
            sourceRevision: 4,
          },
        ],
      },
      onContinue: vi.fn(),
      onFindAnother: vi.fn(),
      onFinish: vi.fn(),
      onLaunchContinuation,
    });

    expect(
      screen.queryByTestId("adventure-completion-related-list"),
    ).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: /related adventures/i }),
    );
    expect(
      screen.getByTestId("adventure-completion-related-list"),
    ).toBeTruthy();
    expect(screen.getByText("Follow up with Clerk Sándor")).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: /launch story/i }),
    );
    expect(onLaunchContinuation).toHaveBeenCalledTimes(1);
    expect(onLaunchContinuation.mock.calls[0]?.[0]?.id).toBe(
      "cont:character:p-1:em-1",
    );
  });
});
