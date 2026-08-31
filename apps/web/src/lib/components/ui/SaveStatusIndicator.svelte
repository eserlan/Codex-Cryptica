<script lang="ts">
  import { vault as defaultVault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";

  let {
    vault = defaultVault,
    status: explicitStatus,
    errorMessage: explicitErrorMessage,
    class: className = "",
  } = $props<{
    vault?: typeof defaultVault;
    status?:
      "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error";
    errorMessage?: string | null;
    class?: string;
  }>();

  const currentStatus = $derived(explicitStatus ?? vault.status);
  const currentErrorMessage = $derived(
    explicitErrorMessage ?? vault.errorMessage,
  );
</script>

{#if currentStatus === "saving"}
  <div
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono font-medium text-theme-muted bg-theme-primary/5 border border-theme-primary/10 tracking-wider shrink-0 {className}"
    role="status"
    aria-live="polite"
    aria-label="Saving changes"
    transition:fade={{ duration: 150 }}
    data-testid="save-indicator-saving"
  >
    <span
      class="icon-[lucide--loader-2] w-3 h-3 md:w-3.5 md:h-3.5 animate-spin text-theme-primary"
      aria-hidden="true"
    ></span>
    <span>Saving…</span>
  </div>
{:else if currentStatus === "saved"}
  <div
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 tracking-wider shrink-0 {className}"
    role="status"
    aria-live="polite"
    aria-label="All changes saved to disk"
    transition:fade={{ duration: 150 }}
    data-testid="save-indicator-saved"
  >
    <span
      class="icon-[lucide--check] w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500"
      aria-hidden="true"
    ></span>
    <span>Saved</span>
  </div>
{:else if currentStatus === "error"}
  <div
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono font-semibold text-theme-danger bg-red-500/10 border border-theme-danger/30 tracking-wider shrink-0 {className}"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    title={currentErrorMessage ||
      "Storage write error. Changes could not be saved to disk."}
    data-testid="save-indicator-error"
  >
    <span
      class="icon-[lucide--alert-triangle] w-3 h-3 md:w-3.5 md:h-3.5 text-theme-danger shrink-0"
      aria-hidden="true"
    ></span>
    <span class="truncate max-w-[120px] md:max-w-none">Save failed</span>
  </div>
{/if}
