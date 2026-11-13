/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HelpHighlightService } from "./help-highlight.svelte";

const closedMenu = `
  <div data-help-reveal>
    <div role="menu" hidden>
      <button data-help-target="add-connection-button">ADD</button>
    </div>
  </div>`;

describe("HelpHighlightService with a closed action menu", () => {
  let service: HelpHighlightService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new HelpHighlightService();
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("opens the menu that holds the target, then highlights it", () => {
    document.body.innerHTML = closedMenu;
    const root = document.querySelector("[data-help-reveal]")!;
    root.addEventListener("codex:help-reveal", () => {
      root.querySelector("[role=menu]")!.removeAttribute("hidden");
    });

    expect(service.show("add-connection-button", "Add here")).toBe(true);
    expect(service.current?.target).toBe("add-connection-button");
  });

  it("returns false when the target is still hidden after the reveal", () => {
    document.body.innerHTML = closedMenu;
    const reveal = vi.fn();
    document
      .querySelector("[data-help-reveal]")!
      .addEventListener("codex:help-reveal", reveal);

    expect(service.show("add-connection-button", "Add here")).toBe(false);
    expect(reveal).toHaveBeenCalled();
    expect(service.current).toBeNull();
  });

  it("does not try to reveal a target outside any menu", () => {
    document.body.innerHTML = `<div hidden><button data-help-target="add-connection-button">x</button></div>`;
    expect(service.show("add-connection-button", "Add")).toBe(false);
  });
});
