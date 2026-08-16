/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedDraft } from "generator-engine";
import GeneratorDraftReview from "./GeneratorDraftReview.svelte";

function dungeonDraft(overrides: Partial<GeneratedDraft> = {}): GeneratedDraft {
  return {
    title: "The Observatory of Weeping Veins",
    entityType: "location",
    summary: "A contested subterranean sanctuary.",
    content:
      "## History & Original Purpose\nScholars carved the sanctuary into mithril veins.\n\n## Key Sectors & Layout\n### The Gallery\nEchoing halls descend beneath the observatory.",
    lore: "### Dungeon Layout\nThe Observatory → The Gallery\n\n### Central Secret / Boss Mystery\nThe archmages remain within the mithril.",
    labels: ["dungeon", "location"],
    sourceGeneratorId: "dungeon",
    templateApplied: false,
    ...overrides,
  };
}

const categories = [{ id: "location", label: "Location" }] as never;

describe("GeneratorDraftReview", () => {
  it("renders the complete dungeon document and GM reference separately", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft(),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.getByText("Summary")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("GM Reference")).toBeTruthy();
    expect(screen.getByText("History & Original Purpose")).toBeTruthy();
    expect(
      screen.getByText("The archmages remain within the mithril."),
    ).toBeTruthy();
  });

  it("does not show an empty Content section for legacy drafts", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ content: undefined }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.queryByText("Content")).toBeNull();
    expect(screen.getByText("GM Reference")).toBeTruthy();
  });

  it("labels dungeon locations with the active theme term", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft(),
        categories,
        themeId: "pirate",
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(
      screen.getByRole("option", { name: "Location (Hideout)" }),
    ).toBeTruthy();
  });

  it("keeps the ordinary location label for non-dungeon drafts", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ sourceGeneratorId: "settlement" }),
        categories,
        themeId: "scifi",
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.getByRole("option", { name: "Location" })).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Location (Facility)" }),
    ).toBeNull();
  });

  it("shows the explicitly selected naming language in review", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({
          sourceGeneratorId: "settlement",
          primaryLanguageId: "l1",
          primaryLanguageTitle: "Lemari",
        }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("primary-language-context").textContent,
    ).toContain("Naming language: Lemari");
  });

  it("shows and invokes the Plot Twist handoff action", async () => {
    const onGeneratePlotTwist = vi.fn();
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ labels: ["rpg-quest"] }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
        onGeneratePlotTwist,
      },
    });

    const button = screen.getByTestId("generate-plot-twist-from-quest");
    expect(button.getAttribute("disabled")).toBeNull();
    await fireEvent.click(button);
    expect(onGeneratePlotTwist).toHaveBeenCalledOnce();
  });

  it("disables the Plot Twist handoff while saving", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ labels: ["rpg-quest"] }),
        categories,
        saving: true,
        onsave: vi.fn(),
        onback: vi.fn(),
        onGeneratePlotTwist: vi.fn(),
      },
    });

    expect(
      screen
        .getByTestId("generate-plot-twist-from-quest")
        .getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("shows in-vault context provenance when present", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({
          contextProvenance: [
            { id: "e1", title: "Silver Keep" },
            { id: "e2", title: "Lord Varis" },
          ],
        }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    const badge = screen.getByTestId("in-vault-provenance");
    expect(badge.textContent).toContain("Used context:");
    expect(badge.textContent).toContain("Silver Keep");
    expect(badge.textContent).toContain("Lord Varis");
  });

  it("omits in-vault context provenance when absent", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ contextProvenance: undefined }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.queryByTestId("in-vault-provenance")).toBeNull();
  });
});
