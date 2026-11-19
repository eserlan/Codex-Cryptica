<script lang="ts">
  let {
    isRetrying = false,
    onRetry,
    onDiscard,
  }: {
    isRetrying?: boolean;
    onRetry: () => void;
    onDiscard: () => void;
  } = $props();
</script>

<div
  role="alert"
  class="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-3 rounded-xl border border-theme-danger/40 bg-theme-surface p-4 text-sm text-theme-text shadow-xl"
>
  <div class="flex items-start gap-2">
    <span
      class="icon-[lucide--alert-circle] mt-0.5 h-4 w-4 shrink-0 text-theme-text"
      aria-hidden="true"
    ></span>
    <span
      >Your generated draft hasn't been added yet. It's still saved in this
      browser.</span
    >
  </div>
  <div class="flex justify-end gap-2">
    <button
      type="button"
      onclick={onDiscard}
      disabled={isRetrying}
      class="rounded-lg border border-theme-text px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-theme-surface/60 disabled:cursor-not-allowed disabled:opacity-100"
    >
      Discard
    </button>
    <button
      type="button"
      onclick={onRetry}
      disabled={isRetrying}
      class="rounded-lg bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-on-primary disabled:cursor-not-allowed disabled:opacity-100"
    >
      Retry
    </button>
  </div>
</div>
