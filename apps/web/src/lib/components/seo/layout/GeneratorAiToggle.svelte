<script lang="ts">
  let {
    isOnline,
    useAI = $bindable(true),
  }: { isOnline: boolean; useAI?: boolean } = $props();
</script>

<div class="flex flex-col gap-1 pt-1">
  <div class="flex items-center gap-2">
    <input
      type="checkbox"
      id="ai-toggle"
      bind:checked={useAI}
      disabled={!isOnline}
      aria-describedby="ai-toggle-hint"
      class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <label
      for="ai-toggle"
      class="text-micro font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1 {isOnline
        ? 'cursor-pointer'
        : 'opacity-50 cursor-not-allowed'}"
    >
      <span class="icon-[lucide--sparkles] text-theme-primary w-3.5 h-3.5"
      ></span>
      AI Lore Co-Author Mode
    </label>
  </div>
  <p
    id="ai-toggle-hint"
    class="text-nano text-theme-muted/70 leading-snug pl-6"
  >
    {#if !isOnline}
      Offline: using fast local tables. Reconnect to enable AI Lore Co-Author
      mode.
    {:else if useAI}
      AI writes unique, rich lore on each generate.
    {:else}
      Fast offline mode — local tables only, no AI.
    {/if}
  </p>
</div>
