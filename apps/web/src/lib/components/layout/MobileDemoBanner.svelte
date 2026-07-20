<script lang="ts">
  import { demoService } from "$lib/services/demo";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let isSaving = $state(false);

  const handleSave = async () => {
    if (isSaving) return;
    isSaving = true;
    try {
      await demoService.convertToWorld();
    } catch (error) {
      console.error(`Failed to save ${themeStore.jargon.vault}:`, error);
      notificationStore.notify(
        `Failed to save ${themeStore.jargon.vault}. Please try again.`,
        "error",
      );
    } finally {
      isSaving = false;
    }
  };
</script>

<!-- Mobile-only demo banner: on small screens the demo Save/Exit controls in
     VaultControls are buried in the hamburger drawer, so surface them here. -->
<div
  class="md:hidden flex items-center gap-2 px-3 py-2 bg-chrome-surface border-b border-chrome-accent/40"
  data-testid="mobile-demo-banner"
>
  <div class="sr-only" role="status">
    Demo mode active. Save as {themeStore.jargon.vault} or exit.
  </div>
  <span
    class="shrink-0 px-1.5 py-0.5 border border-chrome-accent bg-chrome-accent/10 text-chrome-accent rounded text-[9px] font-bold tracking-tighter"
  >
    DEMO
  </span>
  <button
    type="button"
    class="flex-1 min-h-[36px] flex items-center justify-center gap-2 rounded bg-chrome-accent text-chrome-bg font-bold text-[11px] tracking-widest uppercase transition active:scale-95 disabled:opacity-60"
    onclick={handleSave}
    disabled={isSaving}
    aria-busy={isSaving}
    data-testid="mobile-save-as-campaign-button"
    aria-label={`Save as ${themeStore.jargon.vault}`}
  >
    {#if isSaving}
      <span
        class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin"
        aria-hidden="true"
      ></span>
    {:else}
      <span aria-hidden="true" class="icon-[lucide--save] w-3.5 h-3.5"></span>
    {/if}
    {isSaving ? "SAVING…" : `SAVE AS ${themeStore.jargon.vault.toUpperCase()}`}
  </button>
  <button
    class="shrink-0 min-h-[36px] px-3 flex items-center gap-1.5 rounded border border-chrome-border text-chrome-muted font-bold text-[11px] tracking-widest uppercase transition active:scale-95 disabled:opacity-60"
    onclick={() => demoService.exitDemo()}
    disabled={isSaving}
    data-testid="mobile-exit-demo-button"
    aria-label="Exit Demo"
  >
    <span class="icon-[lucide--log-out] w-3.5 h-3.5"></span>
    EXIT
  </button>
</div>
