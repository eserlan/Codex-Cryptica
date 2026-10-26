<script lang="ts">
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { entityId } = $props<{ entityId: string }>();
</script>

<button
  type="button"
  onclick={() => modalUIStore.openGeneratorWorkflowForEntity(entityId)}
  data-help-target="generate-related-button"
  class="touch-target text-xs font-bold uppercase tracking-widest bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
>
  <span aria-hidden="true" class="icon-[lucide--sparkles] w-4 h-4"></span>
  Generate Related
</button>
