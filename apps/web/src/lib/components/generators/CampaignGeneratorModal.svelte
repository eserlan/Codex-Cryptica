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
  import { aiGeneratorGateway } from "$lib/services/generators/ai-generator-gateway";
  import { oracle } from "$lib/stores/oracle.svelte";

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

  const aiPolicy = $derived({
    isEnabled: oracle.isEnabled,
    isAvailable: !vault.isGuest,
  });

  const svc = $derived(
    new CampaignGeneratorService({
      vault: vaultGateway,
      aiPolicy,
      aiGateway: aiGeneratorGateway,
    }),
  );

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
      const sourceConnectedIds = sourceEntity
        ? new Set(sourceEntity.connections?.map((c) => c.target) ?? [])
        : new Set<string>();
      const vaultContext = buildVaultContext({
        themeId: themeStore.worldThemeId ?? "workspace",
        themeName: themeStore.activeTheme?.name,
        sourceEntity,
        allEntities: vault.entities,
        connectedIds: sourceConnectedIds,
        categoryLabels: categories.list.map((c) => ({
          id: c.id,
          label: c.label,
        })),
      });
      const result = await svc.generateDraft({
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
      // Return to review so the user can retry the save without losing edits.
      stage = "review";
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

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  role="dialog"
  aria-modal="true"
  aria-label="Campaign Generator"
  tabindex="-1"
  use:focusTrap
  {onkeydown}
  transition:fade={{ duration: 150 }}
>
  <div
    class="bg-surface-800 border-surface-600 relative w-full max-w-lg rounded-xl border p-6 shadow-xl"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <button
      type="button"
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
    {:else if (stage === "review" || stage === "saving") && draft}
      {#if errorMsg}
        <p class="text-red-400 mb-3 text-sm">{errorMsg}</p>
      {/if}
      <GeneratorDraftReview
        bind:draft
        categories={categories.list}
        saving={stage === "saving"}
        showRelationshipToggle={workflow.launchMode === "contextual" &&
          !!workflow.sourceEntityId}
        onsave={onSave}
        onback={() => {
          stage = "configure";
          errorMsg = null;
        }}
      />
    {:else if stage === "error"}
      <p class="text-red-400 mb-4 text-sm">{errorMsg}</p>
      <button
        type="button"
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
