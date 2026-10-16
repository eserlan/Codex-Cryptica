import type { HighlightRect, HighlightState } from "./help-highlight.svelte";

/**
 * - `idle`: Cif is at home, in the chat header (or not shown at all).
 * - `outbound`: flying from home to the highlighted control.
 * - `perched`: beside the control, tracking it while the highlight lasts.
 * - `returning`: flying back home after the highlight ends.
 */
export type CifFlightPhase = "idle" | "outbound" | "perched" | "returning";

export interface CifFlightDeps {
  /**
   * Where Cif lives on screen right now: his place in the chat header, or the
   * button that opens him when the chat is closed. Null when neither shows.
   */
  findHome: () => HighlightRect | null;
  reducedMotion: () => boolean;
  /** How long one flight takes; matches the CSS transition. */
  flightMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

export const CIF_FLIGHT_MS = 650;

/**
 * Sends Cif from his home to whatever the highlight points at, and back again
 * when it ends. It only tracks phases and positions; the pointer component
 * draws them. With reduced motion there is no flight either way: Cif appears
 * beside the control and is simply back home when the highlight ends.
 */
export class CifFlight {
  phase = $state<CifFlightPhase>("idle");
  /** The control Cif points at; kept through the return flight. */
  target = $state.raw<HighlightRect | null>(null);
  /** Where the outbound flight starts. Null: no home on screen. */
  from = $state.raw<HighlightRect | null>(null);
  /** Where the return flight ends. */
  home = $state.raw<HighlightRect | null>(null);
  /** New for every departure, so the view restarts its animation. */
  flightId = $state(0);

  private readonly flightMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;
  private highlightId: number | null = null;
  private timer: unknown = null;
  private seq = 0;

  constructor(private readonly deps: CifFlightDeps) {
    this.flightMs = deps.flightMs ?? CIF_FLIGHT_MS;
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer =
      deps.clearTimer ??
      ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  }

  /** True while Cif is out of the header, so the header leaves his spot empty. */
  get away(): boolean {
    return this.phase !== "idle";
  }

  /** Follows the highlight: a new one sends Cif out, none brings him back. */
  follow(highlight: HighlightState | null): void {
    if (highlight) {
      if (highlight.id === this.highlightId) this.target = highlight.rect;
      else this.depart(highlight);
      return;
    }
    if (this.highlightId !== null) this.recall();
  }

  /**
   * Cif's home went away (the chat closed). A return flight heads for the new
   * home if there is one, or ends on the spot.
   */
  homeLost(): void {
    if (this.phase !== "returning") return;
    const home = this.deps.findHome();
    if (home) this.home = home;
    else this.land();
  }

  /** Back home, or nowhere to go: nothing of the flight stays on screen. */
  land(): void {
    this.cancelTimer();
    this.highlightId = null;
    this.phase = "idle";
    this.target = null;
    this.from = null;
    this.home = null;
  }

  private depart(highlight: HighlightState): void {
    this.cancelTimer();
    this.highlightId = highlight.id;
    this.target = highlight.rect;
    this.from = this.deps.findHome();
    this.home = null;
    this.flightId = ++this.seq;
    if (this.deps.reducedMotion()) {
      this.phase = "perched";
      return;
    }
    this.phase = "outbound";
    this.timer = this.setTimer(() => {
      this.timer = null;
      this.phase = "perched";
    }, this.flightMs);
  }

  private recall(): void {
    this.cancelTimer();
    this.highlightId = null;
    const home = this.deps.reducedMotion() ? null : this.deps.findHome();
    if (!home) {
      this.land();
      return;
    }
    this.home = home;
    this.phase = "returning";
    this.timer = this.setTimer(() => this.land(), this.flightMs);
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }
}

const AVATAR = "[data-cif-avatar]";
const LAUNCHERS =
  '[data-testid="help-assistant-button"], [data-testid="map-cif-button"]';

const onScreen = (el: Element): HighlightRect | null => {
  // A closing panel is marked aria-hidden while it slides away.
  if (el.closest("[hidden], [aria-hidden='true']")) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/**
 * Finds Cif's home: the avatar in the chat header while the chat is open,
 * otherwise the first visible button that opens Cif.
 */
export function locateCifHome(
  doc: Document | undefined,
  chatOpen: boolean,
): HighlightRect | null {
  if (!doc) return null;
  const selectors = chatOpen ? [AVATAR, LAUNCHERS] : [LAUNCHERS];
  for (const selector of selectors) {
    for (const el of doc.querySelectorAll(selector)) {
      const rect = onScreen(el);
      if (rect) return rect;
    }
  }
  return null;
}
