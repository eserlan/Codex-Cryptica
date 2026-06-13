<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { buildVaultContext } from "$lib/services/generators/generator-vault-context";
  import {
    CampaignGeneratorService,
    isSupportedGenerator,
    type GeneratedDraft,
    type GeneratorId,
    type GeneratorRunRequest,
    type GeneratorVaultGateway,
  } from "generator-engine";

  import GeneratorConfigForm from "./GeneratorConfigForm.svelte";
  import GeneratorDraftReview from "./GeneratorDraftReview.svelte";

  type Stage = "configure" | "generating" | "review" | "saving" | "error";

  const workflow = $derived(modalUIStore.generatorWorkflow);

  let stage = $state<Stage>("configure");
  let draft = $state<GeneratedDraft | null>(null);
  let errorMsg = $state<string | null>(null);
  let generatorId = $state<GeneratorId | null>(null);
  $effect(() => {
    const id = workflow.generatorId;
    generatorId = isSupportedGenerator(id ?? "") ? (id as GeneratorId) : null;
  });

  const vaultGateway: GeneratorVaultGateway = {
    canWrite: () => !vault.isGuest,
    createEntity: (type, title, data) => vault.createEntity(type, title, data),
    addConnection: (src, tgt, rel) => vault.addConnection(src, tgt, rel),
  };

  const svc = new CampaignGeneratorService({ vault: vaultGateway });

  function close() {
    modalUIStore.closeGeneratorWorkflow();
    stage = "configure";
    draft = null;
    errorMsg = null;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  async function onGenerate(
    req: Pick<GeneratorRunRequest, "generatorId" | "options" | "useAI">,
  ) {
    stage = "generating";
    errorMsg = null;
    try {
      const sourceEntityId = workflow.sourceEntityId;
      const sourceEntity = sourceEntityId
        ? vault.entities[sourceEntityId]
        : undefined;
      const vaultContext = buildVaultContext({
        themeId: themeStore.worldThemeId ?? "workspace",
        themeName: themeStore.worldThemeId,
        sourceEntity,
        allEntities: vault.entities,
        categoryLabels: categories.list.map((c) => ({
          id: c.id,
          label: c.label,
        })),
      });
      const result = svc.generateDraft({
        ...req,
        themeId: themeStore.worldThemeId ?? "workspace",
        vaultContext,
      });
      draft = result;
      stage = "review";
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      stage = "error";
    }
  }

  async function onSave(reviewed: GeneratedDraft, createRelationship: boolean) {
    stage = "saving";
    errorMsg = null;
    try {
      const result = await svc.saveDraft({
        draft: {
          ...reviewed,
          sourceEntityId: workflow.sourceEntityId ?? undefined,
          relationshipLabel:
            workflow.launchMode === "contextual" ? "related" : undefined,
        },
        createRelationship,
      });
      vault.selectedEntityId = result.entityId;
      close();
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      stage = "error";
    }
  }

  const title = $derived(
    stage === "configure"
      ? "Generate"
      : stage === "generating"
        ? "Generating…"
        : stage === "review" || stage === "saving"
          ? "Review Draft"
          : "Error",
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  role="dialog"
  aria-modal="true"
  aria-label="Campaign Generator"
  use:focusTrap
  {onkeydown}
  transition:fade={{ duration: 150 }}
>
  <div
    class="bg-surface-800 border-surface-600 relative w-full max-w-lg rounded-xl border p-6 shadow-xl"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <button
      class="text-surface-400 hover:text-surface-100 absolute right-4 top-4"
      onclick={close}
      aria-label="Close generator">✕</button
    >

    <h2 class="text-surface-100 mb-4 text-lg font-semibold">{title}</h2>

    {#if workflow.launchMode === "contextual" && workflow.sourceEntityId}
      <p class="text-surface-400 mb-3 text-xs" data-testid="contextual-hint">
        Generating related content for entity <span class="text-surface-200"
          >{workflow.sourceEntityId}</span
        >
      </p>
    {/if}

    {#if stage === "configure"}
      <GeneratorConfigForm
        bind:generatorId
        onsubmit={onGenerate}
        aiPolicy={svc.aiPolicy}
      />
    {:else if stage === "generating"}
      <p class="text-surface-400 text-sm">Generating your content…</p>
    {:else if stage === "review" && draft}
      <GeneratorDraftReview
        bind:draft
        categories={categories.list}
        saving={false}
        showRelationshipToggle={workflow.launchMode === "contextual" &&
          !!workflow.sourceEntityId}
        onsave={onSave}
        onback={() => {
          stage = "configure";
        }}
      />
    {:else if stage === "saving"}
      <p class="text-surface-400 text-sm">Saving to campaign…</p>
    {:else if stage === "error"}
      <p class="text-red-400 mb-4 text-sm">{errorMsg}</p>
      <button
        class="text-surface-300 hover:text-surface-100 text-sm"
        onclick={() => {
          stage = "configure";
          errorMsg = null;
        }}
      >
        Try again
      </button>
    {/if}
  </div>
</div>
