<script lang="ts">
  import { onMount } from "svelte";
  import {
    autoUpdate,
    computePosition,
    flip,
    hide,
    offset,
    shift,
  } from "@floating-ui/dom";
  import { clearOfControls, type Box } from "./chip-placement";

  /** The Cif button the chip sits beside (plan D7). */
  const CIF_BUTTON = '[data-testid="help-assistant-button"]';
  const CONTROLS =
    'button, a[href], input, select, textarea, [role="button"], [role="tab"]';

  /** Visible controls the chip must not cover, other than itself and the Cif button. */
  function controlBoxes(chip: HTMLElement, anchor: HTMLElement): Box[] {
    return [...document.querySelectorAll<HTMLElement>(CONTROLS)]
      .filter((c) => c !== anchor && !chip.contains(c))
      .map((c) => c.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
  }

  /**
   * A single, dismissible "Cif has a tip" chip (spec 176). It never moves focus,
   * is announced once, and is removed by the store when a blocker appears.
   */
  let {
    label,
    onAct,
    onDismiss,
    anchorSelector = CIF_BUTTON,
  }: {
    /** The tip's fixed, plain-language label (at most 60 characters). */
    label: string;
    /** Asks Cif the tip's prompt. Only a tap sends anything. */
    onAct: () => void;
    onDismiss: () => void;
    /** Element the chip sits beside; the bottom corner is used when it is absent. */
    anchorSelector?: string;
  } = $props();

  let announcement = $state("");
  let root = $state<HTMLElement>();
  let anchored = $state(false);
  // Bumped on resize so a Cif button that mounts later is found (no timers).
  let lookupTick = $state(0);

  $effect(() => {
    const bump = () => lookupTick++;
    window.addEventListener("resize", bump);
    return () => window.removeEventListener("resize", bump);
  });

  // Keeps the chip beside the Cif button as the layout changes (scroll, resize,
  // the sidebar opening). With no button on screen the chip keeps its fixed corner.
  $effect(() => {
    void lookupTick;
    const el = root;
    if (!el) return;
    const anchor = document.querySelector<HTMLElement>(anchorSelector);
    anchored = false;
    if (!anchor) return;
    const beside = window.innerWidth >= 768;
    const update = () => {
      void computePosition(anchor, el, {
        placement: beside ? "right" : "top-start",
        middleware: [offset(8), flip(), shift({ padding: 8 }), hide()],
      }).then(({ x, y, middlewareData }) => {
        // A Cif button scrolled or clipped out of view (a short window can cut
        // off the bottom of the rail) is no anchor: use the corner instead.
        anchored = !middlewareData.hide?.referenceHidden;
        const { width, height } = el.getBoundingClientRect();
        const box = { x, y, width, height };
        // Rise above floating buttons, such as the graph's on phones (Story 3, scenario 5).
        const top = clearOfControls(box, controlBoxes(el, anchor)) ?? y;
        el.style.left = anchored ? `${x}px` : "";
        el.style.top = anchored ? `${top}px` : "";
      });
    };
    const stopAutoUpdate = autoUpdate(anchor, el, update);

    // Controls that render after the chip (the graph's buttons load late) move
    // it too. Batched to one update per frame, and only while a chip is showing.
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopAutoUpdate();
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  });

  onMount(() => {
    // One polite announcement; the chip itself takes no focus.
    announcement = `Cif has a tip: ${label}`;
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    const active = document.activeElement;
    // Escape dismisses the chip only while focus is inside it.
    if (!root || !active || !root.contains(active)) return;
    event.preventDefault();
    onDismiss();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={root}
  role="group"
  aria-label="Tip from Cif"
  data-testid="cif-tip-chip"
  class="fixed z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-theme-primary/40 bg-theme-surface/95 pl-3 pr-1 py-1 text-xs text-theme-text shadow-lg backdrop-blur-md motion-safe:transition-opacity motion-safe:duration-200 {anchored
    ? 'left-0 top-0'
    : 'bottom-24 right-4 sm:bottom-16'}"
>
  <span
    class="icon-[lucide--sparkles] h-3.5 w-3.5 shrink-0 text-theme-primary"
    aria-hidden="true"
  ></span>
  <span class="sr-only">Cif has a tip:</span>
  <button
    type="button"
    class="touch-target min-h-11 min-w-0 truncate rounded-full px-1 text-left font-medium text-theme-text hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
    data-testid="cif-tip-act"
    onclick={onAct}
  >
    {label}
  </button>
  <button
    type="button"
    class="touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-theme-text transition-colors hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
    aria-label="Dismiss tip"
    data-testid="cif-tip-dismiss"
    onclick={onDismiss}
  >
    <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
  </button>
  <p class="sr-only" aria-live="polite">{announcement}</p>
</div>
