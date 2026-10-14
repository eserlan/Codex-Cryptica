<script lang="ts">
  import type { HighlightRect } from "$lib/services/help-assistant/help-highlight.svelte";
  import { CIF_POINTER_SIZE, placeCifPointer } from "./cif-pointer-placement";
  import CifSprite from "./CifSprite.svelte";

  let { rect }: { rect: HighlightRect } = $props();

  /** The flight takes this long; after it Cif just tracks the control. */
  const FLIGHT_MS = 650;

  const readViewport = () =>
    typeof window === "undefined"
      ? { width: 1024, height: 768 }
      : { width: window.innerWidth, height: window.innerHeight };

  // Reduced motion: no flight at all. Cif is placed beside the control on his
  // first frame and only fades in, rather than moving across the screen.
  const reducedMotion =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);

  let viewport = $state(readViewport());
  let launched = $state(reducedMotion);
  let landed = $state(reducedMotion);

  const target = $derived(placeCifPointer(rect, viewport));
  // Before take-off Cif waits in the bottom-right corner, where the chat
  // buttons live, so the first move is a flight rather than a pop-in.
  const position = $derived(
    launched
      ? target
      : {
          left: viewport.width - CIF_POINTER_SIZE.width - 16,
          top: viewport.height - CIF_POINTER_SIZE.height - 16,
          flip: false,
        },
  );

  $effect(() => {
    const onResize = () => (viewport = readViewport());
    window.addEventListener("resize", onResize);
    if (reducedMotion) {
      return () => window.removeEventListener("resize", onResize);
    }
    const start = requestAnimationFrame(() => (launched = true));
    const land = setTimeout(() => (landed = true), FLIGHT_MS);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(start);
      clearTimeout(land);
    };
  });
</script>

<!--
  Decorative: the ring, the text label and the live-region announcement already
  say where to look, so Cif is hidden from assistive tech and never takes
  pointer events. He is a flourish on top of the highlight, not the highlight.
-->
<div
  class="cif-pointer pointer-events-none fixed top-0 left-0 z-[97]"
  class:landed
  style:transform="translate({position.left}px, {position.top}px)"
  data-testid="cif-pointer"
  data-side={target.side}
  aria-hidden="true"
>
  <CifSprite mood="pointing" flip={launched && target.flip} class="h-12 w-11" />
</div>

<style>
  .cif-pointer {
    animation: cif-pointer-appear 180ms ease-out;
  }
  @keyframes cif-pointer-appear {
    from {
      opacity: 0;
    }
  }

  /* Reduced motion: no flight. He simply appears beside the control (the
     fade above is an opacity change, not movement). */
  @media (prefers-reduced-motion: no-preference) {
    .cif-pointer:not(.landed) {
      transition: transform 650ms cubic-bezier(0.22, 0.8, 0.2, 1);
    }
  }
</style>
