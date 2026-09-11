<script lang="ts">
  let {
    isDisabled = false,
    onCancel,
    onApply,
  }: {
    isDisabled?: boolean;
    onCancel: () => void;
    onApply: () => void;
  } = $props();
</script>

<div
  class="p-3 border-t border-theme-border flex gap-2 bg-theme-bg/30 shrink-0"
>
  <button
    type="button"
    class="flex-1 py-1.5 text-[10px] font-bold uppercase font-header tracking-widest border border-theme-border text-theme-muted hover:text-theme-text transition-colors rounded"
    onclick={onCancel}
  >
    Cancel
  </button>
  <button
    type="button"
    class="flex-1 py-1.5 text-[10px] font-bold uppercase font-header tracking-widest bg-theme-primary text-theme-bg hover:bg-theme-secondary transition-colors rounded"
    data-testid="apply-date-button"
    disabled={isDisabled}
    onclick={() => {
      if (!isDisabled) onApply();
    }}
  >
    Apply
  </button>
</div>
