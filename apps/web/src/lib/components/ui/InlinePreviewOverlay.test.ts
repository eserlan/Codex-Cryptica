/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InlinePreviewOverlay from "./InlinePreviewOverlay.svelte";
import { revisionService } from "$lib/services/RevisionService.svelte";

vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: {
    isRevising: false,
    pendingDraft: null,
    acceptDraft: vi.fn(),
    discardDraft: vi.fn(),
  },
}));

describe("InlinePreviewOverlay", () => {
  beforeEach(() => {
    (revisionService as any).isRevising = false;
    (revisionService as any).pendingDraft = null;
    vi.clearAllMocks();
  });

  it("announces AI revision work while a revision is in progress", () => {
    (revisionService as any).isRevising = true;

    render(InlinePreviewOverlay);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("AI Revision in Progress");
    expect(status.getAttribute("aria-busy")).toBe("true");
  });

  it("does not show a revision status when no revision is running", () => {
    render(InlinePreviewOverlay);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("AI Suggestion Ready")).toBeNull();
  });

  it("shows the review controls after AI work produces a draft", () => {
    (revisionService as any).pendingDraft = {
      entityId: "entity-1",
      chronicle: "Revised Chronicle",
      lore: "Revised Lore",
    };

    render(InlinePreviewOverlay);

    expect(screen.getByText("AI Suggestion Ready")).toBeDefined();
    expect(screen.getByRole("button", { name: "Apply Changes" })).toBeDefined();
  });
});
