<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  let { isEditing, onCancel, onSave, onDelete, onStartEdit } = $props<{
    isEditing: boolean;
    onCancel: () => void;
    onSave: () => void;
    onDelete: () => void;
    onStartEdit: () => void;
  }>();
</script>

<div
  class="p-3 md:p-4 border-t border-theme-border flex justify-between items-center bg-theme-surface"
>
  {#if isEditing}
    <div class="flex gap-2 w-full justify-end">
      <button
        onclick={onCancel}
        class="text-theme-muted hover:text-theme-text text-xs font-bold px-4 py-2 rounded tracking-widest transition"
      >
        CANCEL
      </button>
      <button
        onclick={onSave}
        class="bg-theme-primary hover:bg-theme-secondary text-theme-bg text-xs font-bold px-6 py-2 rounded tracking-widest transition"
      >
        SAVE CHANGES
      </button>
    </div>
  {:else}
    <div></div>
    <!-- Spacer -->
    <div class="flex gap-2">
      {#if !vault.isGuest}
        <button
          onclick={onDelete}
          class="border border-red-900/50 text-red-700 hover:text-red-500 hover:border-red-700 text-[10px] font-bold px-3 py-2 rounded tracking-widest transition"
        >
          DELETE
        </button>
        <button
          onclick={onStartEdit}
          class="border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary text-xs font-bold px-4 py-2 rounded tracking-widest transition"
        >
          EDIT
        </button>
      {/if}
    </div>
  {/if}
</div>
