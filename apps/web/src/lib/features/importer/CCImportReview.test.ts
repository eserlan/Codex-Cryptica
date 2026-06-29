/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { CCImportSession } from "@codex/importer";
import CCImportReview from "./CCImportReview.svelte";

const baseSession: CCImportSession = {
  id: "session-1",
  sourceSystem: "scabard",
  sourceLabel: "Scabard Campaign 42",
  items: [
    {
      draft: {
        sourceId: "hero-1",
        title: "Valeria",
        content: "Content",
        tags: ["assassin"],
      },
      resolvedType: "note",
      typeFallback: true,
      sourceRef: "scabard:item:hero-1",
      match: { entityId: "existing-1" },
      decision: "include",
      matchDecision: "skip",
    },
    {
      draft: {
        sourceId: "town-1",
        title: "Moon Harbor",
        content: "Harbor",
        sourceType: "place",
        tags: ["port"],
      },
      resolvedType: "location",
      typeFallback: false,
      sourceRef: "scabard:place:town-1",
      match: null,
      decision: "include",
    },
  ],
  relationships: [
    {
      draft: {
        fromRef: "hero-1",
        toRef: "town-1",
        type: "located_in",
        label: "Located In",
      },
      status: "unresolved",
      reason: "Checked on import",
    },
  ],
  assets: [
    {
      draft: {
        id: "asset-1",
        originalName: "map.png",
        mimeType: "image/png",
        placementRef: "map.png",
      },
      eligible: false,
      skipReason: "No bytes provided",
    },
  ],
  warnings: [
    {
      code: "TYPE_FALLBACK",
      message: "Used default type",
      ref: "scabard:item:hero-1",
    },
  ],
};

describe("CCImportReview", () => {
  it("renders session summary and row content", () => {
    render(CCImportReview, {
      session: baseSession,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(screen.getByText("Scabard Campaign 42")).toBeTruthy();
    expect(screen.getByText("Found entities")).toBeTruthy();
    expect(screen.getByText("Found links")).toBeTruthy();
    expect(screen.getByText("Valeria")).toBeTruthy();
    expect(screen.getByText("Moon Harbor")).toBeTruthy();
    expect(screen.getByText("1 relationship found.")).toBeTruthy();
    expect(screen.getByText("Type fallback")).toBeTruthy();
    expect(screen.getByText("No bytes provided")).toBeTruthy();
  });

  it("emits include or ignore decisions", async () => {
    const onItemDecisionChange = vi.fn();

    render(CCImportReview, {
      session: baseSession,
      onItemDecisionChange,
      onMatchDecisionChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    await fireEvent.click(screen.getByLabelText("Include Valeria"));

    expect(onItemDecisionChange).toHaveBeenCalledWith("hero-1", "ignore");
  });

  it("emits match decision changes", async () => {
    const onMatchDecisionChange = vi.fn();

    render(CCImportReview, {
      session: baseSession,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange,
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    await fireEvent.click(screen.getByRole("button", { name: "update" }));

    expect(onMatchDecisionChange).toHaveBeenCalledWith("hero-1", "update");
  });

  it("disables commit when nothing actionable remains", () => {
    const session: CCImportSession = {
      ...baseSession,
      items: [
        {
          ...baseSession.items[0],
          decision: "ignore",
          matchDecision: "skip",
        },
      ],
      relationships: [],
      assets: [],
    };

    render(CCImportReview, {
      session,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: /Import Assets/i }),
    ).toHaveProperty("disabled", true);
  });
});
