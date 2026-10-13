<script lang="ts">
  import { onMount } from "svelte";
  import {
    autoUpdate,
    computePosition,
    flip,
    offset,
    shift,
  } from "@floating-ui/dom";

  /** The Cif button the chip sits beside (plan D7). */
  const CIF_BUTTON = '[data-testid="help-assistant-button"]';

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

  // Keeps the chip beside the Cif button as the layout changes (scroll, resize,
  // the sidebar opening). With no button on screen the chip keeps its fixed corner.
  $effect(() => {
    const el = root;
    if (!el) return;
    const anchor = document.querySelector<HTMLElement>(anchorSelector);
    anchored = !!anchor;
    if (!anchor) return;
    const beside = window.innerWidth >= 768;
    return autoUpdate(anchor, el, () => {
      void computePosition(anchor, el, {
        placement: beside ? "right" : "top-start",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      });
    });
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
    : 'bottom-24 right-4 sm:bottom-6'}"
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
    class="touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
    aria-label="Dismiss tip"
    data-testid="cif-tip-dismiss"
    onclick={onDismiss}
  >
    <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
  </button>
  <p class="sr-only" aria-live="polite">{announcement}</p>
</div>
