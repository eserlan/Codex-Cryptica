<script lang="ts">
  let {
    isSaving = false,
    isDirty = false,
    isValid = true,
    onCancel,
    onSave,
  }: {
    isSaving?: boolean;
    isDirty?: boolean;
    isValid?: boolean;
    onCancel: () => void;
    onSave: () => void;
  } = $props();
</script>

<div
  class="p-3 md:p-4 border-t border-theme-border flex justify-between items-center bg-theme-surface"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="flex gap-2 w-full justify-end items-center">
    {#if isDirty}
      <span
        class="text-nano text-theme-text font-bold font-header animate-pulse mr-auto"
      >
        • Unsaved changes
      </span>
    {/if}
    <button
      onclick={onCancel}
      class="text-theme-text text-xs font-bold px-4 py-2 rounded transition disabled:opacity-50"
      disabled={isSaving}
    >
      Cancel
    </button>
    <button
      type="button"
      onclick={onSave}
      class="text-xs font-bold px-6 py-2 rounded transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border"
      style:background-color="var(--theme-action-bg)"
      style:border-color="var(--theme-selected-border)"
      style:color="var(--theme-action-text)"
      disabled={isSaving || !isValid}
      aria-busy={isSaving}
    >
      {#if isSaving}
        <span
          class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
          aria-hidden="true"
        ></span>
        <span>Saving…</span>
      {:else}
        Save changes
      {/if}
    </button>
  </div>
</div>
