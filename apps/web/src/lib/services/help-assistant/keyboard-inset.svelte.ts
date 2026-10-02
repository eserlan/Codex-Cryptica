/**
 * How much of the bottom of the page an on-screen keyboard is covering.
 *
 * On Android Chrome and iOS Safari the keyboard sits over the page instead of
 * resizing it, so a `position: fixed; bottom: …` element stays where it was and
 * ends up underneath. The visual viewport is the part of the page actually
 * visible; the gap between it and the layout viewport is the keyboard.
 *
 * Browsers that resize the layout viewport for the keyboard report no gap, and
 * fixed elements already move out of the way there, so nothing special is done.
 */
export interface ViewportLike extends EventTarget {
  height: number;
  offsetTop: number;
}

export interface InsetWindow {
  innerHeight: number;
  visualViewport: ViewportLike | null;
}

/** Below this the "keyboard" is just browser chrome (address bar) moving. */
export const KEYBOARD_THRESHOLD_PX = 120;

export class KeyboardInset {
  /** Pixels at the bottom of the layout viewport that are covered. */
  inset = $state(0);
  /** Height of the part of the page that is visible. */
  visibleHeight = $state(0);

  constructor(
    private readonly win: InsetWindow | null = typeof window === "undefined"
      ? null
      : window,
  ) {}

  get keyboardOpen(): boolean {
    return this.inset > KEYBOARD_THRESHOLD_PX;
  }

  /** Starts tracking. Returns a function that stops it. */
  start(): () => void {
    const win = this.win;
    const vv = win?.visualViewport;
    if (!win || !vv) return () => {};

    const update = () => {
      this.visibleHeight = vv.height;
      this.inset = Math.max(0, win.innerHeight - vv.height - vv.offsetTop);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      this.inset = 0;
    };
  }
}
