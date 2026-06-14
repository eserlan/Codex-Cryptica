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

  const svcDeps = {
    vault: vaultGateway,
    aiGateway: aiGeneratorGateway,
    get aiPolicy() {
      return aiPolicy;
    },
  };
  const svc = new CampaignGeneratorService(svcDeps);

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
    req: Pick<
      GeneratorRunRequest,
      "generatorId" | "options" | "useAI" | "instructions"
    >,
  ) {
    stage = "generating";
    errorMsg = null;
    try {
      const sourceEntityId = workflow.sourceEntityId;
      const sourceEntity = sourceEntityId
        ? vault.entities[sourceEntityId]
        : undefined;
      // Collect both outbound connections and inbound (entities that link to source).
      const sourceConnectedIds = new Set<string>();
      if (sourceEntity) {
        for (const c of sourceEntity.connections ?? []) {
          sourceConnectedIds.add(c.target);
        }
        for (const [id, e] of Object.entries(vault.entities)) {
          if (
            id !== sourceEntityId &&
            e.connections?.some((c) => c.target === sourceEntityId)
          ) {
            sourceConnectedIds.add(id);
          }
        }
      }
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

<svelte:window {onkeydown} />

<!-- Backdrop -->
<div
  class="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 150 }}
>
  <button
    type="button"
    class="absolute inset-0 h-full w-full cursor-default focus:outline-none"
    aria-label="Close generator"
    onclick={close}
  ></button>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- Modal card -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="generator-modal-title"
    tabindex="-1"
    use:focusTrap
    class="relative w-full max-w-lg flex flex-col overflow-hidden rounded-xl border border-chrome-border bg-chrome-surface shadow-2xl"
    transition:scale={{ duration: 180, start: 0.96 }}
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Header -->
    <div
      class="flex items-start justify-between border-b border-chrome-border px-5 py-4"
    >
      <div>
        <h2
          id="generator-modal-title"
          class="text-sm font-bold uppercase tracking-wider text-chrome-accent"
        >
          {title}
        </h2>
        {#if workflow.launchMode === "contextual" && workflow.sourceEntityId}
          <p
            class="mt-1 text-xs text-chrome-muted"
            data-testid="contextual-hint"
          >
            Generating related content for
            <span class="text-chrome-text">{workflow.sourceEntityId}</span>
          </p>
        {:else}
          <p class="mt-1 text-xs text-chrome-muted">
            Campaign content generator
          </p>
        {/if}
      </div>
      <button
        type="button"
        onclick={close}
        class="flex h-8 w-8 items-center justify-center rounded border border-chrome-border text-chrome-muted transition hover:border-chrome-accent hover:text-chrome-accent"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4"></span>
      </button>
    </div>

    <!-- Body -->
    <div class="px-5 py-4">
      {#if stage === "configure"}
        <GeneratorConfigForm
          bind:generatorId
          onsubmit={onGenerate}
          aiPolicy={svc.aiPolicy}
          categoryLabels={categories.list.map((c) => ({
            id: c.id,
            label: c.label,
          }))}
        />
      {:else if stage === "generating"}
        <div class="flex items-center gap-3 py-6 text-sm text-chrome-muted">
          <span
            class="icon-[lucide--loader-circle] h-4 w-4 animate-spin text-chrome-accent"
          ></span>
          Generating your content…
        </div>
      {:else if (stage === "review" || stage === "saving") && draft}
        {#if errorMsg}
          <p
            class="mb-3 rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400"
          >
            {errorMsg}
          </p>
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
        <div class="py-4">
          <p class="mb-4 text-sm text-red-400">{errorMsg}</p>
          <button
            type="button"
            class="px-4 py-2 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors"
            onclick={() => {
              stage = "configure";
              errorMsg = null;
            }}
          >
            Try again
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
