<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import {
    buildVaultContext,
    detectVaultLanguages,
    findSingleQuestHook,
    latestTemporalYear,
    suggestPrimaryLanguageId,
  } from "$lib/services/generators/generator-vault-context";
  import {
    CampaignGeneratorService,
    composeDraftVaultFields,
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
  import { interactionSessions } from "@codex/ai-engine";
  import { getThemeLoadingMessages } from "generator-engine";
  import { entityTemplateService } from "$lib/services/EntityTemplateService.svelte";
  import StarSystemDiagram from "$lib/components/seo/StarSystemDiagram.svelte";
  import { blobToFile } from "$lib/utils/svg-export";
  import { entityMapLinkingService } from "$lib/services/entity-map-linking";
  import {
    buildPlotTwistPremise,
    isQuestHookDraft,
  } from "$lib/services/seo/generator-handoffs";

  let loadingIndex = $state(0);
  let activeLoadingMessages = $derived(
    getThemeLoadingMessages(themeStore.worldThemeId),
  );

  $effect(() => {
    if (stage !== "generating") {
      loadingIndex = 0;
      return;
    }
    const interval = setInterval(() => {
      loadingIndex = (loadingIndex + 1) % activeLoadingMessages.length;
    }, 4200);
    return () => clearInterval(interval);
  });
  import { searchService } from "@codex/search-orchestrator";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { focusEntity } from "$lib/stores/ui/navigation";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

  import GeneratorConfigForm from "./GeneratorConfigForm.svelte";
  import GeneratorDraftReview from "./GeneratorDraftReview.svelte";
  import { systemClock } from "$lib/utils/runtime-deps";

  type Stage = "configure" | "generating" | "review" | "saving" | "error";

  const workflow = $derived(modalUIStore.generatorWorkflow);
  const singleQuestHook = $derived(findSingleQuestHook(vault.entities));
  const languageChoices = $derived(
    detectVaultLanguages(
      vault.entities,
      categories.list.map((category) => ({
        id: category.id,
        label: category.label,
      })),
    ),
  );
  const suggestedLanguageId = $derived.by(() => {
    const sourceId = workflow.sourceEntityId;
    const sourceEntity = sourceId ? vault.entities[sourceId] : undefined;
    if (!sourceEntity) return undefined;
    const connectedIds = new Set<string>();
    for (const connection of sourceEntity.connections ?? []) {
      connectedIds.add(connection.target);
    }
    for (const [id, entity] of Object.entries(vault.entities)) {
      if (
        id !== sourceId &&
        entity.connections?.some((connection) => connection.target === sourceId)
      ) {
        connectedIds.add(id);
      }
    }
    return suggestPrimaryLanguageId(
      languageChoices,
      sourceEntity,
      connectedIds,
    );
  });

  let stage = $state<Stage>("configure");
  let draft = $state<GeneratedDraft | null>(null);
  // Progressive preview while streaming (#2423): populated field-by-field as
  // the model's response streams in, discarded once the fully validated
  // draft replaces it — this is never itself offered for Save.
  let streamedFields = $state<Record<string, string>>({});
  // Multi-pass generators (council-vote, and later dungeon/language — #2423
  // multi-pass follow-up) emit a `phase` event before each pass/turn. Shown
  // in place of the decorative rotating loading message when set; null for
  // every generic single-call generator, which never emits `phase`.
  let currentPhase = $state<string | null>(null);
  let generationAbortController = $state<AbortController | null>(null);
  let starSystemDiagramRef = $state<ReturnType<
    typeof StarSystemDiagram
  > | null>(null);
  let errorMsg = $state<string | null>(null);
  let generatorId = $state<GeneratorId | null>(null);
  $effect(() => {
    const id = workflow.generatorId;
    generatorId = isSupportedGenerator(id ?? "") ? (id as GeneratorId) : null;
  });

  // Guided Mode intent-first `+ Create` (#1909): skip configure and generate
  // immediately with default options once, so the flow is Generate → Evaluate
  // → Customize instead of Configure → Generate.
  let hasAutoGenerated = $state(false);
  $effect(() => {
    if (
      workflow.open &&
      workflow.autoGenerate &&
      !hasAutoGenerated &&
      stage === "configure" &&
      generatorId
    ) {
      hasAutoGenerated = true;
      const initialPrompt = workflow.initialPrompt?.trim();
      void onGenerate({
        generatorId,
        options: initialPrompt ? { name: initialPrompt } : {},
        instructions: initialPrompt || undefined,
        useAI: aiPolicy.isEnabled && aiPolicy.isAvailable,
      });
    }
    if (!workflow.open) hasAutoGenerated = false;
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

  function openPlotTwistFromQuestHook() {
    if (!singleQuestHook) return;
    modalUIStore.openGeneratorWorkflowForEntity(
      singleQuestHook.id,
      "plot-twist",
    );
  }

  function openPlotTwistFromDraft() {
    if (!draft) return;
    const premise = buildPlotTwistPremise(draft);
    stage = "configure";
    draft = null;
    errorMsg = null;
    modalUIStore.openIntentGeneratorWorkflow("plot-twist", null, premise);
  }

  function close(options: { preserveSession?: boolean } = {}) {
    generationAbortController?.abort();
    generationAbortController = null;
    modalUIStore.closeGeneratorWorkflow();
    if (!options.preserveSession) generatorSessionManager.reset();
    stage = "configure";
    draft = null;
    errorMsg = null;
    streamedFields = {};
    currentPhase = null;
  }

  function cancelGeneration() {
    generationAbortController?.abort();
    generationAbortController = null;
    streamedFields = {};
    currentPhase = null;
    stage = "configure";
    errorMsg = null;
  }

  async function onGenerate(
    req: Pick<
      GeneratorRunRequest,
      "generatorId" | "options" | "useAI" | "instructions" | "primaryLanguageId"
    >,
  ) {
    if (stage === "generating" || stage === "saving") return;
    stage = "generating";
    errorMsg = null;
    streamedFields = {};
    currentPhase = null;
    const abortController = new AbortController();
    generationAbortController = abortController;
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
        primaryLanguageId: req.primaryLanguageId,
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
      const runRequest: GeneratorRunRequest = {
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
      };

      for await (const event of svc.generateDraftStream(
        runRequest,
        abortController.signal,
      )) {
        if (abortController.signal.aborted) break;
        if (event.type === "phase") {
          // A new pass/turn is starting — the previous pass's preview may
          // never make it into the final draft, so discard it rather than
          // let stale content from a discarded pass linger on screen.
          streamedFields = {};
          currentPhase = event.label;
        } else if (event.type === "field" && typeof event.value === "string") {
          streamedFields = { ...streamedFields, [event.key]: event.value };
        } else if (event.type === "draft") {
          // A `draft` event is always the terminal outcome of
          // generateDraftStream() — including after an `error` event, which
          // it falls back from to local generation — so it always
          // supersedes any earlier error state, and there's never a
          // trailing `error` event after this without a `draft` following.
          draft = event.draft;
          errorMsg = null;
          stage = "review";
        }
        // `error` events are non-terminal here: generateDraftStream() always
        // falls through to a local-generation `draft` event after one, so
        // there's nothing to surface to the user — the spinner just keeps
        // showing until that draft arrives. A truly fatal failure surfaces
        // as a thrown exception, caught below.
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      errorMsg = err instanceof Error ? err.message : String(err);
      stage = "error";
    } finally {
      if (generationAbortController === abortController) {
        generationAbortController = null;
      }
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
          content: undefined,
          lore: "",
          sourceEntityId: workflow.sourceEntityId ?? undefined,
          relationshipLabel:
            workflow.launchMode === "contextual" ? "related" : undefined,
        },
        createRelationship,
        ...(workflow.prefillDate ? { start_date: workflow.prefillDate } : {}),
      });
      // Link the star-system generator's rasterized orbital diagram to the
      // new entity's Map tab (#1935 follow-up). Best-effort: a rasterization
      // or upload failure must never block the save that already succeeded.
      if (reviewed.bodies?.length && starSystemDiagramRef) {
        try {
          const blob = await starSystemDiagramRef.exportPng();
          if (blob) {
            const file = blobToFile(blob, `${reviewed.title}.png`);
            await entityMapLinkingService.linkImageToEntity(
              file,
              `${reviewed.title} Map`,
              result.entityId,
            );
          }
        } catch (err) {
          console.error("Failed to link generated map image:", err);
        }
      }
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
      const vaultFields = composeDraftVaultFields(reviewed);
      revisionService.pendingDraft = {
        entityId: result.entityId,
        source: "revise",
        chronicle: vaultFields.content,
        lore: vaultFields.lore,
        timestamp: systemClock.now(),
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
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>

  <!-- Body -->
  <div class="px-5 py-4 overflow-y-auto max-h-[70vh] md:max-h-[85vh]">
    {#if stage === "configure"}
      {#if singleQuestHook && generatorId !== "plot-twist"}
        <div
          class="mb-4 rounded-lg border border-chrome-accent/30 bg-chrome-accent/5 p-3"
          data-testid="plot-twist-from-quest-hook"
        >
          <div class="flex items-start gap-3">
            <span
              aria-hidden="true"
              class="icon-[lucide--sparkles] mt-0.5 h-4 w-4 shrink-0 text-chrome-accent"
            ></span>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-chrome-text">
                One quest hook is in your campaign memory
              </p>
              <p class="mt-1 truncate text-xs text-chrome-muted">
                {singleQuestHook.title}
              </p>
              <button
                type="button"
                class="mt-2 inline-flex items-center gap-2 rounded border border-chrome-accent/50 px-2.5 py-1.5 text-xs font-semibold text-chrome-accent transition hover:bg-chrome-accent/10"
                onclick={openPlotTwistFromQuestHook}
              >
                <span
                  aria-hidden="true"
                  class="icon-[lucide--shuffle] h-3.5 w-3.5"
                ></span>
                Turn it into a Plot Twist
              </button>
            </div>
          </div>
        </div>
      {/if}
      <GeneratorConfigForm
        bind:generatorId
        onsubmit={onGenerate}
        aiPolicy={svc.aiPolicy}
        themeId={themeStore.worldThemeId ?? "workspace"}
        categoryLabels={categories.list.map((c) => ({
          id: c.id,
          label: c.label,
        }))}
        languages={languageChoices}
        {suggestedLanguageId}
      />
    {:else if stage === "generating"}
      <div class="py-4">
        <div class="flex items-center gap-3 text-sm text-chrome-muted">
          <span
            class="icon-[lucide--loader-circle] h-4 w-4 animate-spin text-chrome-accent"
          ></span>
          {currentPhase ??
            activeLoadingMessages[loadingIndex] ??
            "Generating your content…"}
        </div>
        {#if streamedFields.title || streamedFields.summary || streamedFields.lore}
          <div
            class="mt-4 space-y-2 rounded-lg border border-chrome-border bg-chrome-bg/40 p-3"
            data-testid="generator-stream-preview"
          >
            {#if streamedFields.title}
              <p class="text-sm font-bold text-chrome-text">
                {streamedFields.title}
              </p>
            {/if}
            {#if streamedFields.summary}
              <p class="text-xs italic text-chrome-muted">
                {streamedFields.summary}
              </p>
            {/if}
            {#if streamedFields.lore}
              <p
                class="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-chrome-muted"
              >
                {streamedFields.lore}
              </p>
            {/if}
          </div>
        {/if}
        <button
          type="button"
          class="mt-4 px-3 py-1.5 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors"
          onclick={cancelGeneration}
        >
          Cancel
        </button>
      </div>
    {:else if (stage === "review" || stage === "saving") && draft}
      {#if errorMsg}
        <p
          class="mb-3 rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400"
        >
          {errorMsg}
        </p>
      {/if}
      {#if draft.bodies?.length}
        <!-- Rendered off-screen and not otherwise shown in this review UI —
             its only purpose here is to give exportPng() a live <svg> to
             rasterize into the entity's linked map when the draft is saved
             (#1935 follow-up). -->
        <div
          class="absolute h-px w-px overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <StarSystemDiagram
            bind:this={starSystemDiagramRef}
            bodies={draft.bodies}
            starType={draft.starType}
            title={draft.title}
          />
        </div>
      {/if}
      <GeneratorDraftReview
        bind:draft
        categories={categories.list}
        saving={stage === "saving"}
        themeId={themeStore.worldThemeId ?? "workspace"}
        showRelationshipToggle={workflow.launchMode === "contextual" &&
          !!workflow.sourceEntityId}
        backLabel={workflow.autoGenerate ? "Customize" : "Back"}
        onsave={onSave}
        onback={() => {
          stage = "configure";
          errorMsg = null;
        }}
        onGeneratePlotTwist={draft.sourceGeneratorId === "quest" &&
        isQuestHookDraft(draft.labels)
          ? openPlotTwistFromDraft
          : undefined}
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
