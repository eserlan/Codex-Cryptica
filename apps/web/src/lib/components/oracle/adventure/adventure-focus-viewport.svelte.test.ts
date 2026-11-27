import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyboardInset } from "#lib/services/help-assistant/keyboard-inset.svelte.js";
import { AdventureFocusViewport } from "./adventure-focus-viewport.svelte.js";

const originalMatchMedia = window.matchMedia;
const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  window.matchMedia = originalMatchMedia;
  document.body.replaceChildren();
});

function setup() {
  const media = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(media);
  const keyboard = new KeyboardInset(null);
  const notify = vi.fn();
  let viewport!: AdventureFocusViewport;
  const dispose = $effect.root(() => {
    viewport = new AdventureFocusViewport(keyboard, { notify });
  });
  disposers.push(dispose);
  flushSync();
  return { viewport, keyboard, notify, dispose, media };
}

describe("AdventureFocusViewport", () => {
  it("tracks the phone breakpoint and cleans up its media listener", () => {
    const { viewport, media, dispose } = setup();
    const change = media.addEventListener.mock.calls[0]?.[1];
    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 639px)");
    expect(viewport.phone).toBe(false);
    change({ matches: true });
    expect(viewport.phone).toBe(true);
    dispose();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", change);
  });

  it("pins an overlay viewport and bounds scene details, leaving resizing browsers alone", () => {
    const { viewport, keyboard } = setup();
    viewport.phone = true;
    keyboard.visibleHeight = 500;
    keyboard.offsetTop = 12;
    keyboard.inset = 10;
    expect(viewport.keyboardStyle).toBe(
      "top: 12px; height: 500px; bottom: auto;",
    );
    expect(viewport.sceneDetailsMaxHeightPx).toBe(140);
    keyboard.visibleHeight = 100;
    expect(viewport.sceneDetailsMaxHeightPx).toBe(80);
    keyboard.visibleHeight = 1200;
    expect(viewport.sceneDetailsMaxHeightPx).toBe(256);
    keyboard.inset = 0;
    expect(viewport.keyboardStyle).toBeUndefined();
    expect(viewport.sceneDetailsMaxHeightPx).toBeUndefined();
    viewport.phone = false;
    keyboard.inset = 200;
    expect(viewport.keyboardStyle).toBeUndefined();
  });

  it("takes phone focus after portaling and restores the previous control on exit", async () => {
    const { viewport, dispose } = setup();
    const previous = document.createElement("button");
    const surface = document.createElement("section");
    const leave = document.createElement("button");
    const composer = document.createElement("textarea");
    surface.append(leave, composer);
    document.body.append(previous, surface);
    previous.focus();
    viewport.element = surface;
    viewport.phone = true;
    flushSync();
    await tick();
    expect(document.activeElement).toBe(leave);
    viewport.focusComposer();
    await tick();
    expect(document.activeElement).toBe(composer);
    dispose();
    expect(document.activeElement).toBe(previous);
  });

  it("leaves focus alone when another surface has taken it", async () => {
    const { viewport, dispose } = setup();
    const previous = document.createElement("button");
    const surface = document.createElement("section");
    surface.append(document.createElement("button"));
    const next = document.createElement("button");
    document.body.append(previous, surface, next);
    previous.focus();
    viewport.element = surface;
    viewport.phone = true;
    flushSync();
    await tick();
    next.focus();
    dispose();
    expect(document.activeElement).toBe(next);
  });

  it("detects nested modal dialogs only within this play surface", () => {
    const { viewport } = setup();
    viewport.element = document.createElement("section");
    expect(viewport.hasNestedModal()).toBe(false);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    viewport.element.append(dialog);
    expect(viewport.hasNestedModal()).toBe(true);
  });

  it("guards repeated native fullscreen requests while a transition is pending", async () => {
    const { viewport, notify } = setup();
    let finish!: () => void;
    const requestFullscreen = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    viewport.element = Object.assign(document.createElement("section"), {
      requestFullscreen,
    });
    const first = viewport.toggleFullscreen();
    await viewport.toggleFullscreen();
    expect(viewport.fullscreenTransitioning).toBe(true);
    expect(requestFullscreen).toHaveBeenCalledOnce();
    finish();
    await first;
    expect(viewport.fullscreenTransitioning).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports unavailable fullscreen without leaving the view busy", async () => {
    const { viewport, notify } = setup();
    await viewport.toggleFullscreen();
    expect(notify).toHaveBeenCalledWith(
      "Fullscreen is not available in this browser.",
      "info",
    );
    expect(viewport.fullscreenTransitioning).toBe(false);
  });
});
