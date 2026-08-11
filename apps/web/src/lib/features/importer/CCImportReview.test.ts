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
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(screen.getByText("Scabard Campaign 42")).toBeTruthy();
    expect(screen.getByText("Found entities")).toBeTruthy();
    expect(screen.getByText("Found links")).toBeTruthy();
    expect(screen.getByText("Valeria")).toBeTruthy();
    expect(screen.getByText("Moon Harbor")).toBeTruthy();
    expect(screen.getByText("1 relationship found.")).toBeTruthy();
    expect(screen.getByText(/Type fallback/)).toBeTruthy();
    expect(screen.getByText("No bytes provided")).toBeTruthy();
  });

  it("emits include or ignore decisions", async () => {
    const onItemDecisionChange = vi.fn();

    render(CCImportReview, {
      session: baseSession,
      onItemDecisionChange,
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange: vi.fn(),
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
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    await fireEvent.click(screen.getByRole("button", { name: "update" }));

    expect(onMatchDecisionChange).toHaveBeenCalledWith("hero-1", "update");
  });

  it("emits a type change when the user picks a different category", async () => {
    const onItemTypeChange = vi.fn();

    render(CCImportReview, {
      session: baseSession,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange,
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    const select = screen.getByLabelText("Type for Valeria");
    await fireEvent.change(select, { target: { value: "character" } });

    expect(onItemTypeChange).toHaveBeenCalledWith("hero-1", "character");
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
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: /Import Assets/i }),
    ).toHaveProperty("disabled", true);
  });
});

describe("CCImportReview — matched-item field diff (T021/FR-015)", () => {
  it("renders a current-vs-package diff only for changed fields, from PreviewItem.existing", () => {
    const session: CCImportSession = {
      ...baseSession,
      items: [
        {
          draft: {
            sourceId: "hero-1",
            title: "Valeria the Bold",
            content: "New summary",
            tags: [],
          },
          resolvedType: "character",
          typeFallback: false,
          sourceRef: "cif:entity:tool:world:hero-1",
          match: { entityId: "existing-1" },
          decision: "include",
          matchDecision: "update",
          existing: {
            title: "Valeria",
            content: "Old summary",
            type: "character",
          },
        },
      ],
      relationships: [],
      assets: [],
      warnings: [],
    };

    render(CCImportReview, {
      session,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(
      document.querySelector(
        '[data-testid="cif-review-diff-cif:entity:tool:world:hero-1"]',
      ),
    ).toBeTruthy();
    expect(screen.getByText("Valeria")).toBeTruthy();
    expect(screen.getByText("Old summary")).toBeTruthy();
    expect(screen.getByText("New summary")).toBeTruthy();
  });

  it("renders no diff block for a matched item with no field changes", () => {
    const session: CCImportSession = {
      ...baseSession,
      items: [
        {
          draft: {
            sourceId: "hero-1",
            title: "Valeria",
            content: "Same",
            tags: [],
          },
          resolvedType: "character",
          typeFallback: false,
          sourceRef: "cif:entity:tool:world:hero-1",
          match: { entityId: "existing-1" },
          decision: "include",
          matchDecision: "skip",
          existing: {
            title: "Valeria",
            content: "Same",
            type: "character",
          },
        },
      ],
      relationships: [],
      assets: [],
      warnings: [],
    };

    render(CCImportReview, {
      session,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(
      document.querySelector(
        '[data-testid="cif-review-diff-cif:entity:tool:world:hero-1"]',
      ),
    ).toBeNull();
  });
});

describe("CCImportReview — derived counts (actionableCount and matchCount)", () => {
  it("renders correct matchCount and actionableCount for positive and edge cases", () => {
    const session: CCImportSession = {
      ...baseSession,
      items: [
        {
          draft: { sourceId: "item-1", title: "Item 1", content: "c1" },
          resolvedType: "note",
          typeFallback: false,
          sourceRef: "ref:1",
          match: { entityId: "e-1" },
          decision: "include",
          matchDecision: "update",
        },
        {
          draft: { sourceId: "item-2", title: "Item 2", content: "c2" },
          resolvedType: "note",
          typeFallback: false,
          sourceRef: "ref:2",
          match: null,
          decision: "include",
        },
        {
          draft: { sourceId: "item-3", title: "Item 3", content: "c3" },
          resolvedType: "note",
          typeFallback: false,
          sourceRef: "ref:3",
          match: { entityId: "e-3" },
          decision: "include",
          matchDecision: "skip",
        },
        {
          draft: { sourceId: "item-4", title: "Item 4", content: "c4" },
          resolvedType: "note",
          typeFallback: false,
          sourceRef: "ref:4",
          match: { entityId: "e-4" },
          decision: "ignore",
          matchDecision: "update",
        },
      ],
      relationships: [],
      assets: [],
      warnings: [],
    };

    render(CCImportReview, {
      session,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(screen.getByText("3 Matches")).toBeTruthy();
    expect(screen.getByText("2 items ready to import")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import 2" })).toBeTruthy();
  });

  it("handles edge case of matched item with decision=include and matchDecision=skip resulting in 0 actionable items", () => {
    const session: CCImportSession = {
      ...baseSession,
      items: [
        {
          draft: { sourceId: "item-1", title: "Item 1", content: "c1" },
          resolvedType: "note",
          typeFallback: false,
          sourceRef: "ref:1",
          match: { entityId: "e-1" },
          decision: "include",
          matchDecision: "skip",
        },
      ],
      relationships: [],
      assets: [],
      warnings: [],
    };

    render(CCImportReview, {
      session,
      onItemDecisionChange: vi.fn(),
      onMatchDecisionChange: vi.fn(),
      onItemTypeChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(screen.getByText("1 Matches")).toBeTruthy();
    expect(screen.getByText("0 items ready to import")).toBeTruthy();
  });
});
