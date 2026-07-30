/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
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
});
