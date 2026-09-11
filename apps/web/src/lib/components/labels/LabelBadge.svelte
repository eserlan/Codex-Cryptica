<script lang="ts">
  let {
    label,
    removable = false,
    onRemove = () => {},
  }: {
    label: string;
    removable?: boolean;
    onRemove?: () => void;
  } = $props();
</script>

<div
  class="group inline-flex max-w-full min-w-0 items-start gap-1 rounded border border-theme-accent/30 bg-theme-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-theme-accent font-header"
  data-testid="label-badge"
>
  <span class="min-w-0 break-words">{label}</span>
  {#if removable}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      class="-mr-1 flex shrink-0 items-center justify-center p-0.5 transition-colors hover:text-theme-primary"
      aria-label="Remove label {label}"
    >
      <span aria-hidden="true" class="icon-[heroicons--x-mark] w-3 h-3"></span>
    </button>
  {/if}
</div>
