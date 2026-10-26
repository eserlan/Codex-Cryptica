<script lang="ts">
  import { untrack } from "svelte";
  import type { CifFlightPhase } from "#lib/services/help-assistant/cif-flight.svelte.js";
  import type { HighlightRect } from "#lib/services/help-assistant/help-highlight.svelte.js";
  import { CIF_POINTER_SIZE, placeCifPointer } from "./cif-pointer-placement";
  import CifSprite from "./CifSprite.svelte";

  let {
    rect,
    phase,
    from = null,
    home = null,
  }: {
    /** The highlighted control. */
    rect: HighlightRect;
    phase: Exclude<CifFlightPhase, "idle">;
    /** Where the outbound flight starts; the corner when null. */
    from?: HighlightRect | null;
    /** Where the return flight ends. */
    home?: HighlightRect | null;
  } = $props();

  const readViewport = () =>
    typeof window === "undefined"
      ? { width: 1024, height: 768 }
      : { width: window.innerWidth, height: window.innerHeight };

  let viewport = $state(readViewport());
  // The first frame draws Cif at home; the next one sets off, so the move is
  // a transition rather than a jump.
  let launched = $state(false);
  // Leaving the header he is already visible there, so there is nothing to
  // fade in. From the corner, or appearing in place, he fades in. Decided
  // once: adding the class later would replay the fade mid-flight.
  const appear = untrack(() => phase !== "outbound" || !from);

  /** Cif centred on a home spot (his header slot is the same size). */
  const centredOn = (spot: HighlightRect) => ({
    left: spot.left + spot.width / 2 - CIF_POINTER_SIZE.width / 2,
    top: spot.top + spot.height / 2 - CIF_POINTER_SIZE.height / 2,
  });
  // Without a home on screen he sets off from the bottom-right corner.
  const corner = $derived({
    left: viewport.width - CIF_POINTER_SIZE.width - 16,
    top: viewport.height - CIF_POINTER_SIZE.height - 16,
  });

  const target = $derived(placeCifPointer(rect, viewport));
  const homeSpot = $derived(home ? centredOn(home) : null);
  const position = $derived.by(() => {
    if (phase === "returning") return homeSpot ?? target;
    if (phase === "outbound" && !launched)
      return from ? centredOn(from) : corner;
    return target;
  });
  const moving = $derived(phase === "outbound" || phase === "returning");
  // He faces the control once he sets off, and faces home on the way back.
  const flip = $derived(
    phase === "returning"
      ? (homeSpot?.left ?? 0) > target.left
      : (launched || phase === "perched") && target.flip,
  );

  $effect(() => {
    const onResize = () => (viewport = readViewport());
    window.addEventListener("resize", onResize);
    const start = requestAnimationFrame(() => (launched = true));
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(start);
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
  class:appear
  class:moving
  class:landed={phase === "perched"}
  style:transform="translate({position.left}px, {position.top}px)"
  data-testid="cif-pointer"
  data-side={target.side}
  data-phase={phase}
  aria-hidden="true"
>
  <CifSprite
    mood={phase === "returning" ? "idle" : "pointing"}
    {flip}
    class="h-12 w-11"
  />
</div>

<style>
  .cif-pointer.appear {
    animation: cif-pointer-appear 180ms ease-out;
  }
  @keyframes cif-pointer-appear {
    from {
      opacity: 0;
    }
  }

  /* Reduced motion never reaches a moving phase, and this guard keeps a
     transition out even if it did. Once perched he tracks the control on
     scroll without lag. */
  @media (prefers-reduced-motion: no-preference) {
    .cif-pointer.moving {
      transition: transform 650ms cubic-bezier(0.22, 0.8, 0.2, 1);
    }
  }
</style>
