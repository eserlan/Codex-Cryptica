<script lang="ts">
  /** Shown when the AI could not draft a hex: retry, or roll on terrain tables instead. */
  let {
    busy,
    onRetry,
    onRollTables,
  }: {
    busy: boolean;
    onRetry: () => void;
    onRollTables: () => void;
  } = $props();
</script>

<div class="space-y-2 rounded-lg border border-red-500/40 p-3">
  <p class="text-sm text-theme-text">The AI couldn't draft this hex.</p>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      disabled={busy}
      onclick={onRetry}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40 disabled:opacity-50"
    >
      Try again
    </button>
    <button
      type="button"
      onclick={onRollTables}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
    >
      Roll on terrain tables
    </button>
  </div>
</div>
