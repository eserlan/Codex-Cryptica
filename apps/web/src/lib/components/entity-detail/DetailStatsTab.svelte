<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import StatSheetView from "$lib/components/stats/StatSheetView.svelte";
  import StatSheetEditor from "$lib/components/stats/StatSheetEditor.svelte";
  import StatSheetTemplateModal from "$lib/components/stats/StatSheetTemplateModal.svelte";

  let { entity } = $props<{ entity: Entity }>();

  let isEditingLayout = $state(false);
  let showTemplateModal = $state(false);

  const readOnly = $derived(vault.isGuest);
</script>

<div class="flex flex-col gap-3" data-testid="detail-stats-tab">
  <div class="flex items-center justify-between">
    <span
      class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
    >
      Stat Sheet
    </span>
    {#if !readOnly}
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => (showTemplateModal = true)}
          data-testid="stat-sheet-open-templates"
        >
          Templates
        </button>
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => (isEditingLayout = !isEditingLayout)}
          data-testid="stat-sheet-toggle-editor"
        >
          {isEditingLayout ? "Done Editing" : "Edit Layout"}
        </button>
      </div>
    {/if}
  </div>

  {#if isEditingLayout}
    <StatSheetEditor {entity} onClose={() => (isEditingLayout = false)} />
  {:else}
    <StatSheetView {entity} onOpenEditor={() => (isEditingLayout = true)} />
  {/if}
</div>

{#if showTemplateModal}
  <StatSheetTemplateModal
    {entity}
    onClose={() => (showTemplateModal = false)}
  />
{/if}
