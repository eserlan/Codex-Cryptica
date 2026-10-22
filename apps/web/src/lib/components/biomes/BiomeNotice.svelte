<script lang="ts">
  let {
    message,
    actionLabel = "Back to all biomes",
    onAction,
  }: { message: string; actionLabel?: string; onAction: () => void } = $props();
</script>

<div
  role="alert"
  class="rounded-xl border border-theme-border bg-theme-surface/40 px-6 py-8 text-center text-sm text-theme-text/80"
>
  <p class="mb-3">{message}</p>
  <button
    type="button"
    class="rounded border border-theme-border px-3 py-1 text-theme-primary hover:border-theme-primary"
    onclick={onAction}>{actionLabel}</button
  >
</div>
