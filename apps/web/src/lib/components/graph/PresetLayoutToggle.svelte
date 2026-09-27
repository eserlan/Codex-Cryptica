<script lang="ts">
  /**
   * The "Save current layout" option in the Saved Views save form (#3456). Off
   * unless the user turns it on, so a view is a filter-only view by default.
   * When a layout cannot be saved right now, it says why instead of silently
   * doing nothing.
   */
  let {
    checked = $bindable(false),
    unavailableReason,
    status = null,
  }: {
    checked?: boolean;
    unavailableReason?: string;
    /** The result of the last layout action, shown so the user can read it. */
    status?: { text: string; failed: boolean } | null;
  } = $props();
</script>

<div
  class="flex flex-col gap-0.5 border-t border-theme-border/40 px-1 py-2"
  data-testid="view-preset-layout-option"
>
  <label
    class="flex items-center gap-2 {unavailableReason
      ? 'text-theme-muted/60'
      : 'text-theme-text'}"
  >
    <input
      type="checkbox"
      bind:checked
      disabled={!!unavailableReason}
      class="accent-theme-primary"
      data-testid="view-preset-save-layout"
    />
    Save current layout
  </label>
  {#if unavailableReason}
    <p
      class="pl-6 text-[11px] text-theme-muted"
      data-testid="view-preset-layout-reason"
    >
      {unavailableReason}
    </p>
  {/if}
  {#if status}
    <p
      role="status"
      class="pl-6 text-[11px] {status.failed
        ? 'text-theme-danger'
        : 'text-theme-muted'}"
      data-testid="view-preset-layout-status"
    >
      {status.text}
    </p>
  {/if}
</div>
