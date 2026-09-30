import type { ControlId } from "help-engine";

export interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface HighlightState {
  target: ControlId;
  label: string;
  rect: HighlightRect;
}

export interface HighlightDeps {
  doc?: Document;
  win?: Window;
  /** How long a highlight stays before clearing itself. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Points at a real control on screen without touching it.
 *
 * It finds `[data-help-target="<id>"]`, scrolls it into view, and publishes
 * where it is so an overlay can draw a ring and a text label around it. It
 * never clicks, focuses, or fills anything, and it never restyles the control
 * itself, so there is nothing to undo on the control when it clears. A control
 * that is missing or hidden (renamed, removed, behind another tab) just means
 * no highlight: `show` returns false and nothing is raised at the user.
 */
export class HelpHighlightService {
  current = $state.raw<HighlightState | null>(null);
  /** Text for a polite live region, so the highlight is not visual-only. */
  announcement = $state("");

  private readonly doc?: Document;
  private readonly win?: Window;
  private readonly timeoutMs: number;
  private element: Element | null = null;
  private detach: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: HighlightDeps = {}) {
    this.doc =
      deps.doc ?? (typeof document === "undefined" ? undefined : document);
    this.win = deps.win ?? (typeof window === "undefined" ? undefined : window);
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private prefersReducedMotion(): boolean {
    return (
      this.win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
      false
    );
  }

  /** Hidden by an attribute, or by `display`/`visibility` on it or any ancestor. */
  private isRendered(el: Element): boolean {
    if (el.closest("[hidden], [aria-hidden='true']")) return false;
    // `display` is not inherited, so a control inside a hidden panel reports
    // its own display as normal. Walk up to be sure it is actually on screen.
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = this.win?.getComputedStyle?.(node);
      if (style?.display === "none" || style?.visibility === "hidden") {
        return false;
      }
    }
    return true;
  }

  private findVisible(target: ControlId): Element | null {
    const el =
      this.doc?.querySelector(`[data-help-target="${target}"]`) ?? null;
    return el?.isConnected && this.isRendered(el) ? el : null;
  }

  private measure(): void {
    if (!this.element || !this.current) return;
    if (!this.element.isConnected) {
      this.clear();
      return;
    }
    const r = this.element.getBoundingClientRect();
    this.current = {
      ...this.current,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    };
  }

  /** Returns true when the control was found and highlighted. */
  show(target: ControlId, label: string): boolean {
    this.clear();
    const el = this.findVisible(target);
    if (!el || !this.doc || !this.win) return false;

    this.element = el;
    const r = el.getBoundingClientRect();
    this.current = {
      target,
      label,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    };
    this.announcement = `${label} highlighted. Press Escape to clear.`;

    (el as HTMLElement).scrollIntoView?.({
      block: "center",
      behavior: this.prefersReducedMotion() ? "auto" : "smooth",
    });

    const doc = this.doc;
    const win = this.win;
    const onKey = (event: Event) => {
      if ((event as KeyboardEvent).key === "Escape") this.clear();
    };
    const onPointer = () => this.clear();
    const onMove = () => this.measure();
    doc.addEventListener("keydown", onKey);
    doc.addEventListener("pointerdown", onPointer, true);
    win.addEventListener("scroll", onMove, true);
    win.addEventListener("resize", onMove);
    this.detach = () => {
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("pointerdown", onPointer, true);
      win.removeEventListener("scroll", onMove, true);
      win.removeEventListener("resize", onMove);
    };
    this.timer = setTimeout(() => this.clear(), this.timeoutMs);
    return true;
  }

  clear(): void {
    this.detach?.();
    this.detach = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.element = null;
    if (this.current) this.announcement = "Highlight cleared.";
    this.current = null;
  }
}

export const helpHighlight = new HelpHighlightService();
