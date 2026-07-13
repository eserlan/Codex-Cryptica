<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import {
    buildVaultContext,
    latestTemporalYear,
  } from "$lib/services/generators/generator-vault-context";
  import {
    CampaignGeneratorService,
    getDefaultInstruction,
    isSupportedGenerator,
    resolveEntityType,
    type GeneratedDraft,
    type GeneratorId,
    type GeneratorRunRequest,
    type GeneratorVaultGateway,
  } from "generator-engine";
  import type {
    AIGeneratorCompleteResult,
    GeneratorPromptMetrics,
  } from "generator-engine";
  import { aiGeneratorGateway } from "$lib/services/generators/ai-generator-gateway";
  import { generatorSessionManager } from "$lib/services/generators/generator-session-manager";
  import { interactionSessions } from "$lib/services/ai/interaction-session";
  import { entityTemplateService } from "$lib/services/EntityTemplateService.svelte";
  import { searchService } from "@codex/search-orchestrator";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { focusEntity } from "$lib/stores/ui/navigation";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

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
    onInteractionResult(result: AIGeneratorCompleteResult) {
      if (result.interactionId) {
        generatorSessionManager.commitInteraction(
          result.interactionId,
          result.replayed,
        );
      }
    },
    onPromptMetrics(metrics: GeneratorPromptMetrics) {
      generatorSessionManager.recordPromptMetrics(metrics);
    },
    get aiPolicy() {
      return aiPolicy;
    },
  };
  const svc = new CampaignGeneratorService(svcDeps);

  function close(options: { preserveSession?: boolean } = {}) {
    modalUIStore.closeGeneratorWorkflow();
    if (!options.preserveSession) generatorSessionManager.reset();
    stage = "configure";
    draft = null;
    errorMsg = null;
  }

  async function onGenerate(
    req: Pick<
      GeneratorRunRequest,
      "generatorId" | "options" | "useAI" | "instructions"
    >,
  ) {
    if (stage === "generating" || stage === "saving") return;
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
      // Resolve the entity template following the normal selection rules
      // (local vault override → theme default → generic) so the AI shapes its
      // output to match the template the user would get from manual creation.
      const targetEntityType = resolveEntityType(
        req.generatorId,
        categories.list.map((c) => c.id),
      );
      let templateOutline = "";
      try {
        const folderHandle = await vault.getActiveFolderHandle();
        const vaultHandle = await vault.getActiveVaultHandle();
        const customTemplatesDirHandle = folderHandle ?? vaultHandle;
        templateOutline = await entityTemplateService.resolveTemplate(
          targetEntityType,
          themeStore.worldThemeId,
          customTemplatesDirHandle,
        );
      } catch {
        // Fall back to system defaults if the vault handle is unavailable.
        templateOutline = await entityTemplateService.resolveTemplate(
          targetEntityType,
          themeStore.worldThemeId,
        );
      }

      // Use the non-AI search engine to find vault entities relevant to the
      // user's request, so the world-grounding context is about what they asked
      // for (e.g. "plains of shas") rather than a blind type sample.
      let relevantIds: string[] = [];
      const searchQuery = (
        req.instructions?.trim() ||
        sourceEntity?.title ||
        ""
      ).trim();
      if (searchQuery) {
        try {
          const hits = await searchService.search(searchQuery, { limit: 8 });
          relevantIds = hits.map((h) => h.id);
        } catch {
          // Search index unavailable — fall back to type-based sampling.
        }
      }

      // Pass the in-world campaign date so generated content fits the current
      // point in the timeline. Prefer the calendar's explicit present year;
      // otherwise fall back to the latest structured event year in the vault.
      const cal = calendarStore.config;
      const presentYear =
        typeof cal.presentYear === "number" && cal.presentYear !== 0
          ? cal.presentYear
          : latestTemporalYear(vault.entities);
      const currentDate =
        presentYear !== undefined
          ? `${presentYear}${cal.epochLabel ? ` ${cal.epochLabel}` : ""}`
          : undefined;

      const vaultContext = buildVaultContext({
        themeId: themeStore.worldThemeId ?? "workspace",
        themeName: themeStore.activeTheme?.name,
        currentDate,
        sourceEntity,
        allEntities: vault.entities,
        connectedIds: sourceConnectedIds,
        categoryLabels: categories.list.map((c) => ({
          id: c.id,
          label: c.label,
        })),
        targetEntityType,
        templateOutline: templateOutline || undefined,
        applyTemplate: !!templateOutline,
        relevantIds,
      });
      // When the user gives no instructions, fall back to the category's
      // default brief so the model always has direction.
      const instructions =
        req.instructions?.trim() || getDefaultInstruction(req.generatorId);
      const interactionTurn =
        req.useAI &&
        aiPolicy.isEnabled &&
        aiPolicy.isAvailable &&
        interactionSessions.enabled &&
        generatorSessionManager.enabled
          ? generatorSessionManager.prepare({
              instruction: instructions,
              vaultContext,
            })
          : null;
      const result = await svc.generateDraft({
        ...req,
        instructions,
        themeId: themeStore.worldThemeId ?? "workspace",
        vaultContext,
        interaction: interactionTurn
          ? {
              input: interactionTurn.input,
              previousInteractionId: interactionTurn.previousInteractionId,
              store: true,
            }
          : undefined,
      });
      draft = result;
      stage = "review";
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      stage = "error";
    }
  }

  async function onSave(reviewed: GeneratedDraft, createRelationship: boolean) {
    if (stage === "saving") return;
    stage = "saving";
    errorMsg = null;
    try {
      // Create the entity skeleton (title + type + labels, no content yet).
      const result = await svc.saveDraft({
        draft: {
          ...reviewed,
          summary: "",
          lore: "",
          sourceEntityId: workflow.sourceEntityId ?? undefined,
          relationshipLabel:
            workflow.launchMode === "contextual" ? "related" : undefined,
        },
        createRelationship,
        ...(workflow.prefillDate ? { start_date: workflow.prefillDate } : {}),
      });
      // Auto-wire the AI's suggested connections to existing entities (matched
      // by exact, case-insensitive title). These live on the skeleton, so they
      // are removed too if the user discards the draft.
      if (reviewed.connections?.length) {
        const sourceId = workflow.sourceEntityId ?? undefined;
        const byTitle = new Map<string, string>();
        for (const [id, e] of Object.entries(vault.entities)) {
          byTitle.set(e.title.trim().toLowerCase(), id);
        }
        for (const conn of reviewed.connections) {
          const targetId = byTitle.get(conn.targetTitle.trim().toLowerCase());
          // Skip self and the source (the source link is created above).
          if (
            targetId &&
            targetId !== result.entityId &&
            targetId !== sourceId
          ) {
            try {
              await vault.addConnection(
                result.entityId,
                targetId,
                conn.relationship || "related",
              );
            } catch {
              // Skip connections that fail (e.g. already exist).
            }
          }
        }
      }
      // Push generated content as a pending draft so zen mode shows the
      // proposal diff — user accepts or discards from the editor.
      revisionService.pendingDraft = {
        entityId: result.entityId,
        source: "revise",
        chronicle: reviewed.summary || "",
        lore: reviewed.lore || "",
        timestamp: Date.now(),
        deleteOnDiscard: true,
        generatorSessionCommit: true,
      };
      close({ preserveSession: true });
      // Review where the user launched from: stay in zen if already in zen (or
      // on mobile, where zen is the better surface), otherwise show the draft
      // in the entity sidebar without yanking the user into zen.
      if (layoutUIStore.mainViewMode === "focus" || layoutUIStore.isMobile) {
        focusEntity(result.entityId);
      } else {
        vault.selectedEntityId = result.entityId;
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
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

  const useContextualTheme = $derived(workflow.launchMode === "contextual");
  const contextualThemeVars = $derived(
    useContextualTheme
      ? [
          "--color-chrome-bg: var(--color-theme-bg)",
          "--color-chrome-surface: var(--color-theme-surface)",
          "--color-chrome-border: var(--color-theme-border)",
          "--color-chrome-text: var(--color-theme-text)",
          "--color-chrome-muted: var(--color-theme-muted)",
          "--color-chrome-accent: var(--color-theme-primary)",
        ].join("; ")
      : undefined,
  );
</script>

<ModalShell
  open={true}
  onClose={() => close()}
  labelledBy="generator-modal-title"
  backdropClass="bg-black/80 backdrop-blur-sm"
  zIndexClass="z-[210]"
  class="flex flex-col rounded-xl border border-chrome-border bg-chrome-surface"
  maxWidthClass="max-w-lg md:max-w-2xl"
  closeAriaLabel="Close generator"
  fadeDuration={150}
  scaleDuration={180}
  scaleStart={0.96}
  style={contextualThemeVars}
  data-themed={useContextualTheme ? "theme" : "chrome"}
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
        <p class="mt-1 text-xs text-chrome-muted" data-testid="contextual-hint">
          Generating related content for
          <span class="text-chrome-text">{workflow.sourceEntityId}</span>
        </p>
      {:else}
        <p class="mt-1 text-xs text-chrome-muted">Campaign content generator</p>
      {/if}
    </div>
    <button
      type="button"
      onclick={() => close()}
      class="flex h-8 w-8 items-center justify-center rounded border border-chrome-border text-chrome-muted transition hover:border-chrome-accent hover:text-chrome-accent"
      aria-label="Close"
    >
      <span class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>

  <!-- Body -->
  <div class="px-5 py-4 overflow-y-auto max-h-[70vh] md:max-h-[85vh]">
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
</ModalShell>
