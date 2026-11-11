/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventurePlayAction from "./AdventurePlayAction.svelte";
import type { GeneratedDraft } from "generator-engine";

const sampleDraft: GeneratedDraft = {
  title: "The Sunken Bastion",
  summary: "A forgotten keep in the mire.",
  entityType: "note",
  sourceGeneratorId: "adventure",
  labels: ["adventure"],
  templateApplied: false,
  content: [
    "## Initial Situation",
    "A drowned watchtower surfaces after the solstice deluge.",
    "## Primary Objective & Pressure",
    "Secure the waterlogged ledger before the marsh goblins burn it.",
    "## Key Locations",
    "- The Drowned Cellar",
    "- The Bell Tower",
    "## Important NPCs & Factions",
    "- Mire-Reeve Corvo",
    "## Threats & Antagonists",
    "- Marsh stalkers and rising black water.",
    "## Clues, Secrets & Discoveries",
    "- The vault key is concealed in the bell clapper.",
  ].join("\n\n"),
  lore: [
    "### Complications & Escalating Pressures",
    "- The floodwaters rise every three turns.",
    "### Rewards & Stakes",
    "- The lost royal grant.",
    "### Possible Outcomes",
    "- The keep collapses permanently.",
    "### Adventure Hooks",
    "- The reeve offers a bounty.",
  ].join("\n\n"),
};

describe("AdventurePlayAction", () => {
  it("renders player-safe preview and triggers onplay with selected adventure", async () => {
    const onplay = vi.fn(async () => {});
    render(AdventurePlayAction, {
      draft: sampleDraft,
      onplay,
    });

    expect(screen.getByTestId("adventure-play-action")).toBeTruthy();
    expect(screen.getByText("The Sunken Bastion")).toBeTruthy();
    expect(screen.getByText(/A drowned watchtower surfaces/)).toBeTruthy();
    expect(screen.getByText(/Secure the waterlogged ledger/)).toBeTruthy();
    expect(screen.getByText("2 starting locations")).toBeTruthy();

    const button = screen.getByTestId("play-generated-adventure");
    expect(button).toBeTruthy();
    expect(button.getAttribute("disabled")).toBeNull();

    await fireEvent.click(button);
    expect(onplay).toHaveBeenCalledTimes(1);
    expect(onplay).toHaveBeenCalledWith(
      expect.objectContaining({
        playerVisible: expect.objectContaining({
          title: "The Sunken Bastion",
          openingSituation: expect.stringContaining("drowned watchtower"),
          primaryObjective: expect.stringContaining("waterlogged ledger"),
        }),
        gmOnly: expect.objectContaining({
          truth: expect.stringContaining("Threats:"),
        }),
      }),
    );
  });

  it("disables play button and shows message when AI is disabled", () => {
    render(AdventurePlayAction, {
      draft: sampleDraft,
      aiDisabled: true,
      onplay: vi.fn(),
    });

    expect(screen.getByTestId("adventure-play-ai-disabled")).toBeTruthy();
    const button = screen.getByTestId("play-generated-adventure");
    expect(button.getAttribute("disabled")).not.toBeNull();
  });

  it("handles malformed draft gracefully", () => {
    const malformedDraft: GeneratedDraft = {
      ...sampleDraft,
      content: "No headings here",
    };

    render(AdventurePlayAction, {
      draft: malformedDraft,
      onplay: vi.fn(),
    });

    expect(
      screen.getByText(/This adventure could not be formatted for play/i),
    ).toBeTruthy();
    expect(screen.queryByTestId("play-generated-adventure")).toBeNull();
  });
});
