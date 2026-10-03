<script lang="ts">
  import type { HelpHighlightService } from "$lib/services/help-assistant/help-highlight.svelte";

  let { highlight }: { highlight: HelpHighlightService } = $props();

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
