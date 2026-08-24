/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DiceModal from "./DiceModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel: () => {} }) as unknown as Animation;
}

const { openDiceWindow } = vi.hoisted(() => ({
  openDiceWindow: vi.fn(),
}));

vi.mock("$lib/stores/ui/navigation", () => ({
  openDiceWindow,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    resolveImageUrl: vi.fn(async (path: string) => `blob:${path}`),
    releaseImageUrl: vi.fn(),
    activeVaultId: "test-vault",
    getActiveVaultHandle: vi.fn(async () => null),
  },
}));

vi.mock("$lib/features/random", () => ({
  ensureRandomSourcesLoaded: vi.fn(),
  randomSources: {
    decks: [],
    tables: [],
  },
  deckService: {
    draw: vi.fn(),
    drawSpread: vi.fn(),
    reset: vi.fn(),
    remaining: vi.fn(async () => []),
  },
}));

describe("DiceModal", () => {
  it("renders when modalUIStore.showDiceModal is true and closes on close button click", async () => {
    modalUIStore.showDiceModal = true;

    render(DiceModal);

    const modal = screen.getByTestId("dice-modal");
    expect(modal).toBeDefined();
    expect(screen.getByText("Play Tools")).toBeDefined();

    const closeButton = screen.getByLabelText("Close");
    await fireEvent.click(closeButton);

    expect(modalUIStore.showDiceModal).toBe(false);
  });

  it("calls openDiceWindow with current active tab when popout button is clicked", async () => {
    modalUIStore.showDiceModal = true;
    openDiceWindow.mockClear();

    render(DiceModal);

    const popoutButton = screen.getByLabelText("Pop out into new window");
    await fireEvent.click(popoutButton);

    expect(openDiceWindow).toHaveBeenCalledWith("dice");
  });

  it("updates header title and calls openDiceWindow with active tab when tab is switched", async () => {
    modalUIStore.showDiceModal = true;
    openDiceWindow.mockClear();

    render(DiceModal);

    const decksTab = screen.getByTestId("play-tools-tab-decks");
    await fireEvent.click(decksTab);

    expect(screen.getByText("Decks & Cards")).toBeDefined();

    const popoutButton = screen.getByLabelText("Pop out into new window");
    await fireEvent.click(popoutButton);

    expect(openDiceWindow).toHaveBeenCalledWith("decks");
  });
});
