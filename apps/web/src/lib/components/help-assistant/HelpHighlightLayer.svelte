<script lang="ts">
  import { untrack } from "svelte";
  import type { CifFlight } from "#lib/services/help-assistant/cif-flight.svelte.js";
  import type { HelpHighlightService } from "#lib/services/help-assistant/help-highlight.svelte.js";
  import CifPointer from "./CifPointer.svelte";

  let {
    highlight,
    flight,
  }: { highlight: HelpHighlightService; flight: CifFlight } = $props();

  // Cif flies out with each new highlight and home again when it ends.
  // Only the highlight drives this; what the flight reads to find home does not.
  $effect(() => {
    const current = highlight.current;
    untrack(() => flight.follow(current));
  });
  // Torn down mid-flight (help turned off): bring Cif home, so the header does
  // not keep his spot empty the next time the chat opens.
  $effect(() => () => untrack(() => flight.land()));

  const PAD = 4;
</script>

<!-- Polite announcement so the highlight is never visual-only. -->
<div class="sr-only" role="status" aria-live="polite">
  {highlight.announcement}
</div>

{#if highlight.current}
  {@const { rect, label } = highlight.current}
  <div
    class="help-highlight pointer-events-none fixed z-[96]"
    data-testid="help-highlight"
    style:top="{rect.top - PAD}px"
    style:left="{rect.left - PAD}px"
    style:width="{rect.width + PAD * 2}px"
    style:height="{rect.height + PAD * 2}px"
    aria-hidden="true"
  >
    <span
      class="absolute -top-7 left-0 flex items-center gap-1 whitespace-nowrap rounded bg-chrome-accent px-2 py-1 text-meta font-bold uppercase tracking-wider text-chrome-bg shadow"
    >
      <span class="icon-[lucide--arrow-down] h-3 w-3" aria-hidden="true"></span>
      {label}
    </span>
  </div>
{/if}

<!-- Outside the highlight block: Cif is still on screen while he flies home.
     Keyed so each new highlight gets its own flight, even for the same control. -->
{#if flight.phase !== "idle" && flight.target}
  {#key flight.flightId}
    <CifPointer
      rect={flight.target}
      phase={flight.phase}
      from={flight.from}
      home={flight.home}
    />
  {/key}
{/if}

<style>
  /* A solid outline plus the text label above: never colour alone. */
  .help-highlight {
    border-radius: 0.375rem;
    outline: 3px solid var(--chrome-accent);
    outline-offset: 0;
    box-shadow: 0 0 0 6px
      color-mix(in srgb, var(--chrome-accent) 25%, transparent);
  }

  @media (prefers-reduced-motion: no-preference) {
    .help-highlight {
      animation: help-highlight-pulse 1.6s ease-in-out 3;
    }
  }

  @keyframes help-highlight-pulse {
    50% {
      box-shadow: 0 0 0 10px
        color-mix(in srgb, var(--chrome-accent) 10%, transparent);
    }
  }
</style>
