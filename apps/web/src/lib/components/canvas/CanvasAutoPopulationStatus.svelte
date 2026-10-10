<script lang="ts">
  let {
    isPopulating,
    completed,
    total,
    message,
  }: {
    isPopulating: boolean;
    completed: number;
    total: number;
    message: string | null;
  } = $props();
</script>

{#if isPopulating}
  <div
    class="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-theme-primary/40 bg-theme-bg/95 px-4 py-2 text-xs font-mono text-theme-text shadow-xl"
    role="status"
    aria-live="polite"
  >
    <span
      class="icon-[lucide--sparkles] h-4 w-4 animate-pulse text-theme-primary"
      aria-hidden="true"
    ></span>
    Populating Areas with Location-aware AI…
    <span class="text-theme-primary">
      {completed}/{total}
    </span>
  </div>
{:else if message}
  <div
    class="absolute bottom-5 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-theme-bg/95 px-4 py-2 text-xs text-amber-300 shadow-xl"
    role="status"
  >
    {message}
  </div>
{/if}
