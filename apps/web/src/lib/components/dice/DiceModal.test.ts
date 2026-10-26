/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import DiceModal from "./DiceModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import {
  PLAY_TOOLS_WINDOW_STORAGE_KEY,
  saveBounds,
} from "./dice-window-bounds";

if (typeof Element !== "undefined") {
  if (!Element.prototype.animate) {
    Element.prototype.animate = () =>
      ({
        finished: Promise.resolve(),
        cancel: () => {},
      }) as unknown as Animation;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
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
  beforeEach(() => {
    window.localStorage.clear();
    modalUIStore.showDiceModal = false;
    openDiceWindow.mockClear();
  });

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

  it("closes when Escape key is pressed", async () => {
    modalUIStore.showDiceModal = true;
    render(DiceModal);

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(modalUIStore.showDiceModal).toBe(false);
  });

  it("loads and applies saved position and size from localStorage", async () => {
    saveBounds(
      { x: 150, y: 120, width: 480, height: 580 },
      window.localStorage,
    );

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const modal = screen.getByTestId("dice-modal");
    expect(modal.style.left).toBe("150px");
    expect(modal.style.top).toBe("120px");
    expect(modal.style.width).toBe("480px");
    expect(modal.style.height).toBe("580px");
  });

  it("centers window when center button is clicked and persists new bounds", async () => {
    saveBounds({ x: 50, y: 50, width: 400, height: 500 }, window.localStorage);

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const centerButton = screen.getByLabelText("Center window");
    await fireEvent.click(centerButton);

    const modal = screen.getByTestId("dice-modal");
    expect(modal.style.left).not.toBe("50px");

    const saved = JSON.parse(
      window.localStorage.getItem(PLAY_TOOLS_WINDOW_STORAGE_KEY) || "{}",
    );
    expect(saved.width).toBe(400);
    expect(saved.height).toBe(500);
    expect(saved.x).toBeGreaterThan(50);
  });

  it("allows dragging header to move window and persists updated bounds", async () => {
    saveBounds(
      { x: 100, y: 100, width: 400, height: 500 },
      window.localStorage,
    );

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const header = screen.getByTestId("dice-modal-header");
    await fireEvent.pointerDown(header, {
      button: 0,
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    await fireEvent.pointerMove(header, {
      clientX: 200,
      clientY: 170,
      pointerId: 1,
    });
    await fireEvent.pointerUp(header, { pointerId: 1 });

    const modal = screen.getByTestId("dice-modal");
    expect(modal.style.left).toBe("150px");
    expect(modal.style.top).toBe("150px");

    const saved = JSON.parse(
      window.localStorage.getItem(PLAY_TOOLS_WINDOW_STORAGE_KEY) || "{}",
    );
    expect(saved.x).toBe(150);
    expect(saved.y).toBe(150);
  });

  it("allows resizing via handle and persists updated dimensions", async () => {
    saveBounds(
      { x: 100, y: 100, width: 400, height: 500 },
      window.localStorage,
    );

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const resizeHandle = screen.getByTestId("dice-modal-resize-handle");
    await fireEvent.pointerDown(resizeHandle, {
      button: 0,
      clientX: 500,
      clientY: 600,
      pointerId: 1,
    });
    await fireEvent.pointerMove(resizeHandle, {
      clientX: 550,
      clientY: 660,
      pointerId: 1,
    });
    await fireEvent.pointerUp(resizeHandle, { pointerId: 1 });

    const modal = screen.getByTestId("dice-modal");
    expect(modal.style.width).toBe("450px");
    expect(modal.style.height).toBe("560px");

    const saved = JSON.parse(
      window.localStorage.getItem(PLAY_TOOLS_WINDOW_STORAGE_KEY) || "{}",
    );
    expect(saved.width).toBe(450);
    expect(saved.height).toBe(560);
  });

  it("calls openDiceWindow with current active tab when popout button is clicked", async () => {
    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const popoutButton = screen.getByLabelText("Pop out into new window");
    await fireEvent.click(popoutButton);

    expect(openDiceWindow).toHaveBeenCalledWith("dice");
  });

  it("updates header title and calls openDiceWindow with active tab when tab is switched", async () => {
    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const decksTab = screen.getByTestId("play-tools-tab-decks");
    await fireEvent.click(decksTab);

    expect(screen.getByText("Decks & Cards")).toBeDefined();

    const popoutButton = screen.getByLabelText("Pop out into new window");
    await fireEvent.click(popoutButton);

    expect(openDiceWindow).toHaveBeenCalledWith("decks");
  });

  it("does not write to storage on simple header click without movement", async () => {
    saveBounds(
      { x: 100, y: 100, width: 400, height: 500 },
      window.localStorage,
    );

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    setItemSpy.mockClear();

    const header = screen.getByTestId("dice-modal-header");
    await fireEvent.pointerDown(header, {
      button: 0,
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    await fireEvent.pointerUp(header, { pointerId: 1 });

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it("does not write to storage on resize handle click without movement", async () => {
    saveBounds(
      { x: 100, y: 100, width: 400, height: 500 },
      window.localStorage,
    );

    modalUIStore.showDiceModal = true;
    render(DiceModal);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    setItemSpy.mockClear();

    const resizeHandle = screen.getByTestId("dice-modal-resize-handle");
    await fireEvent.pointerDown(resizeHandle, {
      button: 0,
      clientX: 500,
      clientY: 600,
      pointerId: 1,
    });
    await fireEvent.pointerUp(resizeHandle, { pointerId: 1 });

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});
