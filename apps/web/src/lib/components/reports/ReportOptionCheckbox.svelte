<script lang="ts">
  let {
    checked = $bindable(),
    label,
    hint,
    disabled = false,
    small = false,
  }: {
    checked: boolean;
    label: string;
    /** Why the option can't be changed, shown under the label. */
    hint?: string;
    disabled?: boolean;
    small?: boolean;
  } = $props();

  const muted = $derived(disabled || !!hint);
</script>

<div>
  <label
    class="flex items-center gap-2 {small ? 'text-xs' : 'text-sm'} {muted
      ? 'text-theme-muted'
      : 'text-theme-text'}"
  >
    <input type="checkbox" bind:checked disabled={disabled || !!hint} />
    {label}
  </label>
  {#if hint}
    <p class="ml-6 text-[11px] text-theme-muted">{hint}</p>
  {/if}
</div>
