<script lang="ts">
  import ZenModeRevisionAction from "../entity/ZenModeRevisionAction.svelte";

  /** The Zen mode toggle (and, inside Zen mode, its close/revision actions). */
  let {
    isZenMode,
    onToggle: toggleZenMode,
  }: { isZenMode: boolean; onToggle: () => void } = $props();
</script>

<div class="flex gap-1">
  {#if isZenMode}
    <ZenModeRevisionAction />
    <button
      type="button"
      onclick={toggleZenMode}
      class="px-3 py-1 flex items-center gap-2 text-micro font-bold text-theme-accent border border-theme-accent/30 hover:border-theme-accent/50 transition-all uppercase font-header tracking-widest bg-theme-accent/10 rounded"
      title="Close Zen Mode"
      aria-label="Close Zen Mode"
    >
      <span class="icon-[lucide--x] w-3.5 h-3.5" aria-hidden="true"></span>
      Close Zen Mode
    </button>
    <div class="w-px bg-theme-border/50 mx-1"></div>
  {/if}

  <button
    type="button"
    onclick={toggleZenMode}
    class="toolbar-btn {isZenMode ? 'active' : ''}"
    title={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (Cmd+Shift+F)"}
    aria-label={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (Cmd+Shift+F)"}
    aria-pressed={isZenMode}
  >
    {#if isZenMode}
      <span class="icon-[lucide--minimize] w-4 h-4" aria-hidden="true"></span>
    {:else}
      <span class="icon-[lucide--maximize] w-4 h-4" aria-hidden="true"></span>
    {/if}
  </button>
</div>
