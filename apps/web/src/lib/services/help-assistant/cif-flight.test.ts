/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CifFlight, locateCifHome } from "./cif-flight.svelte";
import type { HighlightRect, HighlightState } from "./help-highlight.svelte";

const header: HighlightRect = { top: 320, left: 84, width: 44, height: 48 };
const launcher: HighlightRect = { top: 700, left: 8, width: 40, height: 40 };
const control: HighlightRect = { top: 40, left: 600, width: 90, height: 30 };

const highlight = (id: number, rect = control): HighlightState => ({
  id,
  target: "status-tab",
  label: "Status",
  rect,
});

function setup(
  options: { home?: HighlightRect | null; reduced?: boolean } = {},
) {
  const deps = {
    findHome: vi.fn(() => (options.home === undefined ? header : options.home)),
    reducedMotion: vi.fn(() => options.reduced ?? false),
    flightMs: 600,
  };
  return { flight: new CifFlight(deps), deps };
}

describe("CifFlight", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("flies from the header to the control, perches, then flies home when the highlight ends", () => {
    const { flight } = setup();
    expect(flight.away).toBe(false);

    flight.follow(highlight(1));
    expect(flight.phase).toBe("outbound");
    expect(flight.away).toBe(true);
    expect(flight.from).toEqual(header);
    expect(flight.target).toEqual(control);

    vi.advanceTimersByTime(600);
    expect(flight.phase).toBe("perched");

    flight.follow(null);
    expect(flight.phase).toBe("returning");
    expect(flight.home).toEqual(header);
    // Still drawn beside the control until the flight home is over.
    expect(flight.target).toEqual(control);
    expect(flight.away).toBe(true);

    vi.advanceTimersByTime(600);
    expect(flight.phase).toBe("idle");
    expect(flight.away).toBe(false);
    expect(flight.target).toBeNull();
  });

  it("tracks the control as it moves without starting a new flight", () => {
    const { flight } = setup();
    flight.follow(highlight(1));
    const id = flight.flightId;
    const moved = { ...control, top: 90 };
    flight.follow(highlight(1, moved));
    expect(flight.target).toEqual(moved);
    expect(flight.flightId).toBe(id);
    expect(flight.phase).toBe("outbound");
  });

  it("starts a fresh flight for a new highlight, even on the way home", () => {
    const { flight } = setup();
    flight.follow(highlight(1));
    vi.advanceTimersByTime(600);
    flight.follow(null);
    const first = flight.flightId;

    flight.follow(highlight(2));
    expect(flight.phase).toBe("outbound");
    expect(flight.flightId).toBeGreaterThan(first);
    // The cancelled return flight does not land him later.
    vi.advanceTimersByTime(600);
    expect(flight.phase).toBe("perched");
  });

  it("does nothing when a guide's control was never found", () => {
    const { flight, deps } = setup();
    flight.follow(null);
    expect(flight.phase).toBe("idle");
    expect(deps.findHome).not.toHaveBeenCalled();
  });

  it("turns back at once when the highlight is dismissed mid-flight", () => {
    const { flight } = setup();
    flight.follow(highlight(1));
    vi.advanceTimersByTime(200);
    flight.follow(null);
    expect(flight.phase).toBe("returning");
    // The outbound timer must not flip him back to perched.
    vi.advanceTimersByTime(450);
    expect(flight.phase).toBe("returning");
    vi.advanceTimersByTime(200);
    expect(flight.phase).toBe("idle");
  });

  it("heads for the Cif button when the chat closes on the way home", () => {
    const { flight, deps } = setup();
    flight.follow(highlight(1));
    vi.advanceTimersByTime(600);
    flight.follow(null);

    deps.findHome.mockReturnValue(launcher);
    flight.homeLost();
    expect(flight.phase).toBe("returning");
    expect(flight.home).toEqual(launcher);
  });

  it("ends the flight on the spot when the chat closes and there is no home left", () => {
    const { flight, deps } = setup();
    flight.follow(highlight(1));
    vi.advanceTimersByTime(600);
    flight.follow(null);

    deps.findHome.mockReturnValue(null);
    flight.homeLost();
    expect(flight.phase).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a closing chat while Cif is still out pointing", () => {
    const { flight, deps } = setup();
    flight.follow(highlight(1));
    deps.findHome.mockReturnValue(null);
    flight.homeLost();
    expect(flight.phase).toBe("outbound");
  });

  it("just disappears when there is no home to fly back to", () => {
    const { flight } = setup({ home: null });
    flight.follow(highlight(1));
    expect(flight.from).toBeNull();
    vi.advanceTimersByTime(600);
    flight.follow(null);
    expect(flight.phase).toBe("idle");
  });

  it("never flies with reduced motion: he is beside the control at once and home at once", () => {
    const { flight } = setup({ reduced: true });
    flight.follow(highlight(1));
    expect(flight.phase).toBe("perched");
    expect(flight.away).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    flight.follow(null);
    expect(flight.phase).toBe("idle");
    expect(flight.away).toBe(false);
  });
});

describe("locateCifHome", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const place = (el: Element, rect: HighlightRect) => {
    el.getBoundingClientRect = () =>
      ({ ...rect, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
  };

  function mount() {
    document.body.innerHTML = `
      <div data-testid="help-assistant-panel"><span data-cif-avatar></span></div>
      <button data-testid="help-assistant-button"></button>`;
    const avatar = document.querySelector("[data-cif-avatar]")!;
    const button = document.querySelector(
      '[data-testid="help-assistant-button"]',
    )!;
    place(avatar, header);
    place(button, launcher);
    return { avatar, button };
  }

  it("is the header avatar while the chat is open", () => {
    mount();
    expect(locateCifHome(document, true)).toEqual(header);
  });

  it("is the Cif button while the chat is closed", () => {
    mount();
    expect(locateCifHome(document, false)).toEqual(launcher);
  });

  it("skips a panel that is sliding away", () => {
    mount();
    document
      .querySelector('[data-testid="help-assistant-panel"]')!
      .setAttribute("aria-hidden", "true");
    expect(locateCifHome(document, true)).toEqual(launcher);
  });

  it("is null when nothing of Cif is on screen", () => {
    const { button } = mount();
    place(button, { top: 0, left: 0, width: 0, height: 0 });
    expect(locateCifHome(document, false)).toBeNull();
    expect(locateCifHome(undefined, true)).toBeNull();
  });
});
