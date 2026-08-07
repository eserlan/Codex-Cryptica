<script lang="ts">
  import { fade } from "svelte/transition";

  let {
    open,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (open && e.key === "Escape") onCancel();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-to-codex-modal-title"
      class="bg-theme-surface border border-theme-border max-w-md w-full p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        class="mx-auto w-12 h-12 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary mb-2"
      >
        <span class="icon-[lucide--check-circle-2] w-6 h-6"></span>
      </div>

      <h3
        id="save-to-codex-modal-title"
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary"
      >
        Saved to your local Codex vault.
      </h3>

      <p class="text-sm text-theme-text/70 leading-relaxed">
        Open Codex to link this draft to other NPCs, locations, maps, and
        campaign notes. Your vault lives in the browser — no account, no sync,
        no cloud.
      </p>

      <div class="flex flex-col gap-2 mt-4">
        <button
          type="button"
          onclick={onConfirm}
          class="w-full py-3 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span class="icon-[lucide--external-link] w-4 h-4"></span>
          Open Codex
        </button>

        <button
          type="button"
          onclick={onCancel}
          class="w-full py-3 bg-theme-surface/50 border border-theme-border/60 text-theme-text font-bold uppercase font-header tracking-widest text-xs rounded-xl hover:bg-theme-surface transition-all"
        >
          Back to Generator
        </button>
      </div>
    </div>
  </div>
{/if}
