/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { HexDiscoveryDraft } from "hex-crawl-engine";
import HexDiscoveryReview from "./HexDiscoveryReview.svelte";
import { AI_NOTICE_KEY } from "./hex-discovery-notice";
import type { HexDiscoveryControls } from "./discovery-controls";

function makeDraft(
  source: "ai" | "tables" = "ai",
  extra: Partial<HexDiscoveryDraft> = {},
): HexDiscoveryDraft {
  const part = (text: string, factionName?: string) => ({
    text,
    source,
    status: "pending" as const,
    ...(factionName ? { factionName } : {}),
  });
  return {
    source,
    createdAt: 1,
    parts: {
      landmark: part("Standing stones on the ridge."),
      encounter: part("A wolf pack hunts the ridge at dusk."),
      hazard: part("Loose scree on the slope."),
      secret: part("The stones hide a cairn."),
      factionPresence: part("The Ash Circle watches.", "Ash Circle"),
      atmosphere: part("Wind carries the smell of smoke."),
    },
    ...extra,
  };
}

function makeControls(overrides: Partial<HexDiscoveryControls> = {}) {
  const controls: HexDiscoveryControls = {
    retry: vi.fn(async () => undefined),
    rollTables: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => undefined),
    discardPart: vi.fn(async () => undefined),
    discardDraft: vi.fn(async () => undefined),
    saveEntityPart: vi.fn(async () => undefined),
    saveNotePart: vi.fn(async () => undefined),
    saveFactionPart: vi.fn(async () => undefined),
    ...overrides,
  };
  return controls;
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
}

function renderReview(overrides: Partial<Record<string, unknown>> = {}) {
  const controls = makeControls();
  const onCancel = vi.fn();
  const storage = memoryStorage();
  render(HexDiscoveryReview, {
    draft: makeDraft(),
    controls,
    proposedLink: null,
    factionMatch: null,
    failure: null,
    customTerrainLabel: undefined,
    aiEnabled: false,
    storage,
    onCancel,
    ...overrides,
  });
  return { controls, onCancel, storage };
}

describe("HexDiscoveryReview", () => {
  it("renders six parts, each with a source badge", () => {
    renderReview();

    expect(screen.getAllByText("AI-drafted")).toHaveLength(6);
    expect(screen.getByText("Standing stones on the ridge.")).toBeTruthy();
    expect(screen.getByText("Wind carries the smell of smoke.")).toBeTruthy();
  });

  it("labels rolled parts as Rolled", () => {
    renderReview({ draft: makeDraft("tables") });

    expect(screen.getAllByText("Rolled")).toHaveLength(6);
  });

  it("calls the controller for regenerate, save and discard", async () => {
    const { controls } = renderReview();

    await fireEvent.click(
      screen.getByRole("button", { name: "Save as location" }),
    );
    // No location is near, so there is nothing to link.
    expect(controls.saveEntityPart).toHaveBeenCalledWith("landmark", {
      linkTicked: false,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Discard Hazard" }),
    );
    expect(controls.discardPart).toHaveBeenCalledWith("hazard");

    await fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Secret" }),
    );
    expect(controls.regenerate).toHaveBeenCalledWith(
      "secret",
      expect.any(AbortSignal),
    );

    await fireEvent.click(
      screen.getByRole("button", { name: "Discard draft" }),
    );
    expect(controls.discardDraft).toHaveBeenCalledTimes(1);
  });

  it("ticks the proposed link by default and passes the choice on save", async () => {
    const { controls } = renderReview({
      proposedLink: { entityId: "loc-1", title: "Barrow Hill" },
    });

    const box = screen.getByLabelText(
      "Link to Barrow Hill",
    ) as HTMLInputElement;
    expect(box.checked).toBe(true);

    await fireEvent.click(box);
    await fireEvent.click(
      screen.getByRole("button", { name: "Save as location" }),
    );
    expect(controls.saveEntityPart).toHaveBeenCalledWith("landmark", {
      linkTicked: false,
    });
  });

  it("shows no link checkbox when no location is within 2 hexes", () => {
    renderReview({ proposedLink: null });

    expect(screen.queryByLabelText(/^Link to /)).toBeNull();
  });

  it("explains a failure and offers a retry or the terrain tables", async () => {
    const { controls } = renderReview({ failure: "ai-failed" });

    expect(screen.getByText("The AI couldn't draft this hex.")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(controls.retry).toHaveBeenCalledWith(expect.any(AbortSignal));

    await fireEvent.click(
      screen.getByRole("button", { name: "Roll on terrain tables" }),
    );
    expect(controls.rollTables).toHaveBeenCalledTimes(1);
  });

  it("does not show the failure message when the draft is fine", () => {
    renderReview({ failure: null });

    expect(screen.queryByText("The AI couldn't draft this hex.")).toBeNull();
  });

  it("explains custom terrain that fell back to general tables", () => {
    renderReview({
      draft: makeDraft("tables", { usedGeneralTables: true }),
      customTerrainLabel: "Ash fields",
    });

    expect(
      screen.getByText(
        "No tables for 'Ash fields', so general tables were used.",
      ),
    ).toBeTruthy();
  });

  it("aborts generation when Cancel is pressed while generating", async () => {
    let seen: AbortSignal | undefined;
    const controls = makeControls({
      regenerate: vi.fn(
        (_part, signal: AbortSignal) =>
          new Promise<void>(() => {
            seen = signal;
          }),
      ),
    });
    render(HexDiscoveryReview, {
      draft: makeDraft(),
      controls,
      proposedLink: null,
      factionMatch: null,
      failure: null,
      aiEnabled: false,
      storage: memoryStorage(),
      onCancel: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Landmark" }),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(seen?.aborted).toBe(true);
  });

  it("announces progress politely", async () => {
    renderReview();

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("shows the AI notice until dismissed, then keeps it hidden on this device", async () => {
    const storage = memoryStorage();
    const first = render(HexDiscoveryReview, {
      draft: makeDraft("ai"),
      controls: makeControls(),
      proposedLink: null,
      factionMatch: null,
      failure: null,
      aiEnabled: true,
      storage,
      onCancel: vi.fn(),
    });

    expect(
      screen.getByText(
        /Exploring sends this hex's terrain, notes and nearby lore/,
      ),
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss AI notice" }),
    );
    expect(storage.data[AI_NOTICE_KEY]).toBe("1");
    first.unmount();

    render(HexDiscoveryReview, {
      draft: makeDraft("ai"),
      controls: makeControls(),
      proposedLink: null,
      factionMatch: null,
      failure: null,
      aiEnabled: true,
      storage,
      onCancel: vi.fn(),
    });
    expect(screen.queryByText(/Exploring sends this hex/)).toBeNull();
  });

  it("does not show the AI notice when AI is disabled", () => {
    renderReview({ aiEnabled: false });

    expect(screen.queryByText(/Exploring sends this hex/)).toBeNull();
  });
});
