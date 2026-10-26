<script lang="ts">
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

  let {
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: string;
  } = $props();

  /** A business is anchored to a place, a person or an organisation (FR-012). */
  const ANCHOR_TYPES = ["location", "character", "faction"];
  const visible = $derived(ANCHOR_TYPES.includes(entityType));
</script>

{#if visible}
  <button
    type="button"
    onclick={() =>
      modalUIStore.openGeneratorWorkflowForEntity(entityId, "business")}
    data-help-target="generate-business-button"
    class="touch-target text-xs font-bold uppercase tracking-widest bg-theme-surface text-theme-text border border-theme-border hover:border-theme-primary px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
  >
    <span aria-hidden="true" class="icon-[lucide--store] w-4 h-4"></span>
    Generate a business here
  </button>
{/if}
