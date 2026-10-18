<script lang="ts">
  import { fade } from "svelte/transition";

  let {
    isOnline,
    aiModeRequired,
    offlineMessage = undefined,
  }: {
    isOnline: boolean;
    aiModeRequired: boolean;
    offlineMessage?: string;
  } = $props();
</script>

{#if !isOnline}
  <div
    transition:fade={{ duration: 150 }}
    class="mb-5 p-3 border border-theme-primary/30 bg-theme-primary/10 rounded-xl flex gap-2.5"
    role="status"
    aria-live="polite"
  >
    <span
      class="icon-[lucide--wifi-off] w-4 h-4 text-theme-primary shrink-0 mt-0.5"
      aria-hidden="true"
    ></span>
    <div class="flex flex-col gap-1">
      <p
        class="text-micro font-bold uppercase tracking-wider font-header text-theme-primary"
      >
        {aiModeRequired ? "AI required" : "Local Mode"}
      </p>
      <p class="text-micro text-theme-text/70 leading-snug">
        {offlineMessage ??
          "You're offline. Codex will generate from built-in tables and save drafts locally. Reconnect to use AI Lore Co-Author mode again."}
      </p>
    </div>
  </div>
{/if}
