import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HelpHighlightService } from "./help-highlight.svelte";

function mount(html: string) {
  document.body.innerHTML = html;
}

const button = `<button data-help-target="add-connection-button">ADD</button>`;

describe("HelpHighlightService", () => {
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

  it("finds the control, publishes where it is, and announces it in words", () => {
    mount(button);
    expect(service.show("add-connection-button", "Add a connection here")).toBe(
      true,
    );
    expect(service.current?.target).toBe("add-connection-button");
    expect(service.current?.label).toBe("Add a connection here");
    expect(service.announcement).toMatch(/Add a connection here highlighted/);
  });

  it("does nothing, and raises nothing, when the control is missing", () => {
    mount("<p>nothing here</p>");
    expect(service.show("add-connection-button", "Add")).toBe(false);
    expect(service.current).toBeNull();
  });

  it("does nothing when the control is hidden behind another tab", () => {
    mount(`<div hidden>${button}</div>`);
    expect(service.show("add-connection-button", "Add")).toBe(false);
    mount(`<div style="display:none">${button}</div>`);
    expect(service.show("add-connection-button", "Add")).toBe(false);
  });

  it("never clicks, focuses, or changes the control", () => {
    mount(button);
    const el = document.querySelector("button")!;
    const onClick = vi.fn();
    el.addEventListener("click", onClick);
    const before = el.outerHTML;
    service.show("add-connection-button", "Add");
    expect(onClick).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(el);
    expect(el.outerHTML).toBe(before);
  });

  it("clears on Escape", () => {
    mount(button);
    service.show("add-connection-button", "Add");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(service.current).toBeNull();
    expect(service.announcement).toMatch(/cleared/i);
  });

  it("clears on click-away", () => {
    mount(`${button}<p id="away">elsewhere</p>`);
    service.show("add-connection-button", "Add");
    document
      .getElementById("away")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(service.current).toBeNull();
  });

  it("clears itself after fifteen seconds", () => {
    mount(button);
    service.show("add-connection-button", "Add");
    vi.advanceTimersByTime(14_999);
    expect(service.current).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(service.current).toBeNull();
  });

  it("clears when the control leaves the page", () => {
    mount(button);
    service.show("add-connection-button", "Add");
    document.body.innerHTML = "";
    window.dispatchEvent(new Event("resize"));
    expect(service.current).toBeNull();
  });

  it("stops listening once cleared, and replaces a previous highlight", () => {
    mount(button);
    const spy = vi.spyOn(document, "removeEventListener");
    service.show("add-connection-button", "First");
    service.show("add-connection-button", "Second");
    expect(service.current?.label).toBe("Second");
    service.clear();
    expect(spy).toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(service.current).toBeNull();
  });

  it("scrolls without animation when the user prefers reduced motion", () => {
    mount(button);
    const scroll = vi.fn();
    (document.querySelector("button") as HTMLElement).scrollIntoView = scroll;
    const reduced = new HelpHighlightService({
      win: {
        ...window,
        matchMedia: () => ({ matches: true }),
        addEventListener: window.addEventListener.bind(window),
        removeEventListener: window.removeEventListener.bind(window),
        getComputedStyle: window.getComputedStyle.bind(window),
      } as unknown as Window,
    });
    reduced.show("add-connection-button", "Add");
    expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
    reduced.clear();
  });

  it("scrolls smoothly when motion is allowed", () => {
    mount(button);
    const scroll = vi.fn();
    (document.querySelector("button") as HTMLElement).scrollIntoView = scroll;
    service.show("add-connection-button", "Add");
    expect(scroll).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
  });
});
