<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { evaluateEntityRecommendations } from "$lib/services/contextual-recommendations";
  import { INTENT_CATEGORY_GENERATOR_ID } from "./contextual-intent-helper";

  let { entityId }: { entityId: string } = $props();

  const recommendation = $derived.by(() => {
    const entity = vault.entities[entityId];
    if (!entity) return null;
    const recs = evaluateEntityRecommendations(entity, vault.entities);
    return (
      recs.find((r) => !guidedModeStore.isRecommendationDismissed(r.id)) ?? null
    );
  });

  function handleAction() {
    if (!recommendation) return;
    const generatorId =
      INTENT_CATEGORY_GENERATOR_ID[recommendation.targetCategory];
    if (generatorId) {
      modalUIStore.openIntentGeneratorWorkflow(
        generatorId,
        recommendation.parentEntityId,
      );
    } else {
      modalUIStore.openGeneratorWorkflowForEntity(
        recommendation.parentEntityId,
      );
    }
  }

  function handleDismiss() {
    if (recommendation) {
      guidedModeStore.dismissRecommendation(recommendation.id);
    }
  }
</script>

{#if recommendation}
  <div
    data-testid="structural-suggestion-banner"
    class="mt-3 flex items-center justify-between gap-3 rounded-lg border border-theme-primary/30 bg-theme-primary/5 px-3 py-2"
  >
    <div class="flex items-center gap-2 min-w-0">
      <span
        class="icon-[lucide--lightbulb] w-4 h-4 text-theme-primary shrink-0"
        aria-hidden="true"
      ></span>
      <span class="text-xs text-theme-text truncate"
        >{recommendation.promptText}</span
      >
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onclick={handleAction}
        data-testid="structural-suggestion-action"
        class="px-2.5 py-1 rounded-md bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all"
      >
        {recommendation.actionLabel}
      </button>
      <button
        type="button"
        onclick={handleDismiss}
        aria-label="Dismiss suggestion"
        data-testid="structural-suggestion-dismiss"
        class="p-1 rounded-md text-theme-muted hover:text-theme-text transition-colors"
      >
        <span class="icon-[lucide--x] w-3.5 h-3.5" aria-hidden="true"></span>
      </button>
    </div>
  </div>
{/if}
