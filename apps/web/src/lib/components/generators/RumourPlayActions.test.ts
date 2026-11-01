/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { generateRumourLocal } from "generator-engine";
import RumourPlayActions from "./RumourPlayActions.svelte";

function seededRng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function draft() {
  const output = generateRumourLocal({}, seededRng());
  return {
    ...output,
    summary: output.summary ?? "",
    sourceGeneratorId: "rumour" as const,
    entityType: "note",
    templateApplied: false,
  };
}

describe("RumourPlayActions", () => {
  it("presents six separately actionable public rumours with no GM truth", async () => {
    const onplay = vi.fn(async () => undefined);
    render(RumourPlayActions, {
      props: { draft: draft(), onplay },
    });

    const actions = screen.getAllByRole("button", { name: "Play with Oracle" });
    expect(actions).toHaveLength(6);
    const publicText = screen.getByTestId("rumour-play-actions").textContent;
    expect(publicText).not.toContain("What's Actually Happening");
    expect(publicText).not.toContain("essentially true");
    expect(publicText).not.toContain("dangerous misconception");

    await fireEvent.click(screen.getByTestId("play-rumour-4"));
    await waitFor(() => expect(onplay).toHaveBeenCalledWith(4));
    expect(onplay).toHaveBeenCalledTimes(1);
  });

  it("disables all launch buttons while saving", () => {
    render(RumourPlayActions, {
      props: {
        draft: draft(),
        disabled: true,
        onplay: vi.fn(async () => undefined),
      },
    });
    const buttons = screen.getAllByRole("button", { name: "Play with Oracle" });
    expect(
      buttons.every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("does not launch a malformed batch or guess a mismatched GM section", () => {
    const onplay = vi.fn(async () => undefined);
    const original = draft();
    render(RumourPlayActions, {
      props: {
        draft: {
          ...original,
          lore: original.lore.replace(
            "### GM Notes — Rumour 4",
            "### GM Notes — Rumour 3",
          ),
        },
        onplay,
      },
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be paired",
    );
    expect(
      screen.queryByRole("button", { name: "Play with Oracle" }),
    ).toBeNull();
    expect(onplay).not.toHaveBeenCalled();
  });
});
