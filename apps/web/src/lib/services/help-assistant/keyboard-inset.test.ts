import { describe, expect, it } from "vitest";
import {
  KEYBOARD_THRESHOLD_PX,
  KeyboardInset,
  type InsetWindow,
  type ViewportLike,
} from "./keyboard-inset.svelte";

class FakeViewport extends EventTarget implements ViewportLike {
  constructor(
    public height: number,
    public offsetTop = 0,
  ) {
    super();
  }
  set(height: number, offsetTop = 0) {
    this.height = height;
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event("resize"));
  }
  /** The visual viewport moving within the page, as pinch-zoom or the keyboard pushing the page does. */
  scrollTo(offsetTop: number, height = this.height) {
    this.height = height;
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event("scroll"));
  }
}

const setup = (innerHeight = 800, vvHeight = 800) => {
  const vv = new FakeViewport(vvHeight);
  const win: InsetWindow = { innerHeight, visualViewport: vv };
  return { vv, tracker: new KeyboardInset(win) };
};

describe("KeyboardInset", () => {
  it("reports no inset while the keyboard is closed", () => {
    const { tracker } = setup();
    tracker.start();
    expect(tracker.inset).toBe(0);
    expect(tracker.keyboardOpen).toBe(false);
  });

  it("reports the covered height when the keyboard opens, and clears it when it closes", () => {
    const { vv, tracker } = setup();
    tracker.start();
    vv.set(480); // a 320px keyboard
    expect(tracker.inset).toBe(320);
    expect(tracker.visibleHeight).toBe(480);
    expect(tracker.keyboardOpen).toBe(true);
    vv.set(800);
    expect(tracker.inset).toBe(0);
    expect(tracker.keyboardOpen).toBe(false);
  });

  it("allows for the visual viewport being resized with an offset", () => {
    const { vv, tracker } = setup();
    tracker.start();
    vv.set(480, 100);
    expect(tracker.inset).toBe(220);
  });

  it("follows the visual viewport scrolling, with no resize event", () => {
    const { vv, tracker } = setup();
    tracker.start();
    vv.set(480); // keyboard up, nothing scrolled
    expect(tracker.inset).toBe(320);

    vv.scrollTo(100); // only a scroll event is fired
    expect(tracker.inset).toBe(220);

    vv.scrollTo(0);
    expect(tracker.inset).toBe(320);
  });

  it("does not treat browser chrome moving as a keyboard", () => {
    const { vv, tracker } = setup();
    tracker.start();
    vv.set(800 - (KEYBOARD_THRESHOLD_PX - 20)); // address bar shows
    expect(tracker.inset).toBeGreaterThan(0);
    expect(tracker.keyboardOpen).toBe(false);
  });

  it("never reports a negative inset", () => {
    const { vv, tracker } = setup();
    tracker.start();
    vv.set(900);
    expect(tracker.inset).toBe(0);
  });

  it("stops listening to both resize and scroll, and resets, when stopped", () => {
    const { vv, tracker } = setup();
    const stop = tracker.start();
    vv.set(480);
    stop();
    expect(tracker.inset).toBe(0);
    vv.set(300);
    expect(tracker.inset).toBe(0);
    vv.scrollTo(50, 300);
    expect(tracker.inset).toBe(0);
  });

  it("does nothing, without error, where there is no visual viewport", () => {
    const tracker = new KeyboardInset({
      innerHeight: 800,
      visualViewport: null,
    });
    expect(() => tracker.start()()).not.toThrow();
    expect(tracker.keyboardOpen).toBe(false);
    expect(() => new KeyboardInset(null).start()()).not.toThrow();
  });
});
