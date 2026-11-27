import { tick } from "svelte";
import { KeyboardInset } from "#lib/services/help-assistant/keyboard-inset.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import {
  exitAdventureFullscreen,
  requestAdventureFullscreen,
} from "./adventure-fullscreen";

/** Browser viewport sizing, native fullscreen and focus ownership for the play surface. */
export class AdventureFocusViewport {
  phone = $state(false);
  element = $state<HTMLElement>();
  fullscreenElement = $state<Element | null>(null);
  fullscreenTransitioning = $state(false);

  constructor(
    readonly keyboard = new KeyboardInset(),
    private readonly notifications: Pick<
      typeof notificationStore,
      "notify"
    > = notificationStore,
  ) {
    $effect(() => this.watchPhoneWidth());
    $effect(() => {
      if (this.phone) return this.keyboard.start();
    });
    $effect(() => this.focusPhoneSurface());
  }

  private get keyboardOverlays(): boolean {
    return (
      this.phone && this.keyboard.visibleHeight > 0 && this.keyboard.inset > 0
    );
  }

  get keyboardStyle(): string | undefined {
    // Resizing browsers already place 100dvh above the keyboard. Pin only when
    // the visual viewport leaves an overlay gap, including small chrome gaps.
    return this.keyboardOverlays
      ? `top: ${this.keyboard.offsetTop}px; height: ${this.keyboard.visibleHeight}px; bottom: auto;`
      : undefined;
  }

  get sceneDetailsMaxHeightPx(): number | undefined {
    return this.keyboardOverlays
      ? Math.min(
          256,
          Math.max(80, Math.floor(this.keyboard.visibleHeight * 0.28)),
        )
      : undefined;
  }

  get isFullscreen(): boolean {
    return this.fullscreenElement === this.element;
  }

  hasNestedModal(): boolean {
    return Boolean(
      this.element?.querySelector('[role="dialog"][aria-modal="true"]'),
    );
  }

  focusComposer(): void {
    void tick().then(() =>
      this.element?.querySelector<HTMLElement>("textarea")?.focus(),
    );
  }

  toggleFullscreen = async (): Promise<void> => {
    if (this.fullscreenTransitioning) return;
    this.fullscreenTransitioning = true;
    try {
      if (this.isFullscreen) {
        await exitAdventureFullscreen(document);
      } else if (!(await requestAdventureFullscreen(this.element))) {
        this.notifications.notify(
          "Fullscreen is not available in this browser.",
          "info",
        );
      }
    } finally {
      this.fullscreenTransitioning = false;
    }
  };

  private watchPhoneWidth(): (() => void) | undefined {
    const query = window.matchMedia?.("(max-width: 639px)");
    if (!query) return;
    this.phone = query.matches;
    const onChange = (event: MediaQueryListEvent) =>
      (this.phone = event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }

  private focusPhoneSurface(): (() => void) | undefined {
    if (!this.phone || !this.element) return;
    const surface = this.element;
    const previous = document.activeElement;
    // Re-parenting through the body portal drops focus; wait for that move.
    void tick().then(() => {
      if (this.phone && !surface.contains(document.activeElement)) {
        surface.querySelector<HTMLElement>("button")?.focus();
      }
    });
    return () => {
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        (surface.contains(document.activeElement) ||
          document.activeElement === document.body)
      ) {
        previous.focus();
      }
    };
  }
}
