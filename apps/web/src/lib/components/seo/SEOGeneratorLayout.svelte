<!-- This layout keeps route-level slots and their recovery contracts together; SEOGeneratorLayout tests cover them. -->
<!-- fallow-ignore-file complexity -->
<script lang="ts">
  import { getCalendarPreviewLayout } from "./generator-calendar-twist-handoff";
  import { onMount, untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { browser } from "$app/env";
  import { saveGeneratorOutputForReload } from "./generator-output-reload.js";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
  import type { OneShotProgressStep } from "generator-engine/one-shot-staged";
  import type { MarkdownSectionForCopy } from "#lib/components/seo/markdown-sections.js";
  import { splitMarkdownForCopy } from "#lib/components/seo/markdown-sections.js";
  import {
    GENERATOR_CANVAS_CLASS,
    getGeneratorColumnClasses,
  } from "./generator-column-classes";
  import { publicThemeStore } from "#lib/stores/public-theme.svelte.js";
  import { onlineStatus } from "#lib/stores/online.svelte.js";
  import { sessionHubStore } from "#lib/stores/session-hub.svelte.js";
  import {
    getContextSelection,
    type SessionEntity,
  } from "generator-engine/session-hub-helpers";
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "#lib/services/ClipboardService.js";
  import { when } from "#lib/utils/when.js";
  import { themeBootstrapScript } from "#lib/theme/theme-bootstrap.js";
  import { preloadTurnstile } from "#lib/services/publishing/turnstile.js";
  import { registerShellCtaHandler } from "./marketing-shell";

  function prewarmTurnstileOnInteract(node: HTMLElement) {
    const prewarm = () => {
      if (effectiveUseAI) void preloadTurnstile();
    };
    node.addEventListener("focusin", prewarm, { passive: true });
    node.addEventListener("pointerenter", prewarm, { passive: true });
    return {
      destroy() {
        node.removeEventListener("focusin", prewarm);
        node.removeEventListener("pointerenter", prewarm);
      },
    };
  }
  import {
    resolveWorldThemeId,
    resolveGeneratorType,
    resolveGeneratedNoun,
    resolveGeneratedSingular,
  } from "./generator-page-identity";
  import FaqSection from "./FaqSection.svelte";
  import GeneratorGuideSection from "./GeneratorGuideSection.svelte";
  import RelatedLinksSection from "./RelatedLinksSection.svelte";
  import type { GeneratorGuide } from "./generator-page-guides";
  import GeneratorOutputCard from "./GeneratorOutputCard.svelte";
  import SEOGeneratorHead from "./SEOGeneratorHead.svelte";
  import GeneratorFormPanel from "./layout/GeneratorFormPanel.svelte";
  import GeneratorRail from "./layout/GeneratorRail.svelte";
  import GeneratorModals from "./layout/GeneratorModals.svelte";
  import { useGeneratorSession } from "./layout/use-generator-session.svelte";
  import { useGeneratorClipboard } from "./layout/use-generator-clipboard.svelte";
  import { useGeneratorSave } from "./layout/use-generator-save.svelte";
  import { useGeneratorRefinement } from "./layout/use-generator-refinement.svelte";
  import { useGeneratorSharing } from "./layout/use-generator-sharing.svelte";
  import { useGeneratorHandoffs } from "./layout/use-generator-handoffs.svelte";

  let {
    canonicalPath,
    recoveryKey = canonicalPath,
    pageTitle = "Free RPG Generator | Codex Cryptica",
    metaDescription = "Generate high-quality detailed campaign drafts using our interactive local-first generators.",
    eyebrow = "Free RPG Tool",
    introTitle = "RPG Generator",
    introText = "Customize options and instantly generate structured drafts to populate your campaign lore database.",
    ogImage = "https://assets.codexcryptica.com/screenshots/feature-connect.jpg",
    ogImageAlt = undefined,
    keywords = [],
    labels = [],
    relatedLinks = [],
    faqs = [],
    guide = undefined,
    theme = $bindable("Classic Fantasy"),
    isThemeCustomizable = false,
    supportsStreaming = false,
    generate,
    formFields,
    outputExtras = undefined,
    outputLead = undefined,
    aiToggleScope = undefined,
    progressSteps = null,
    worldTheme = "workspace",
    initialDraft = null,
    variant = "default",
    generateLabel = undefined,
    busyLabel = undefined,
    inputHint = undefined,
    backHref = undefined,
    backLabel = undefined,
    onGeneratePlotTwist = undefined,
    onGenerateRoster = undefined,
    onOpenMemberAsCharacter = undefined,
    clipboardService = defaultClipboardService,
    autoGenerateExplicit = false,
    initialDraftIsUserGenerated = false,
    initialUseAI = undefined,
    initialUseAIPath = undefined,
    explainerText = undefined,
    showGeneratorSwitcher = true,
    aiModeRequired = false,
    aiDataNotice = undefined,
    offlineMessage = undefined,
    wideForm = false,
    singleColumn = false,
    showSubmitButton = true,
    generationReady = true,
    generationSetupError = false,
    onRetryGenerationSetup = () => {},

    /** Public discovery labels (#2762). Chips linking to `/explore?label=X`. */
    /** Extra controls under the output card, e.g. per-part regeneration. */
    /**
     * Content above the output card, e.g. the Quick Names batch. It leads on
     * phones, and the sample draft folds away beneath it.
     */
    /** What the AI toggle covers, when the page has other AI controls. */
    /** Live steps of a staged generation, shown in the output card. */
    /** Enables actions when a public result was explicitly opened as a remix. */
    /** Replaces the generator-specific explainer strip for focused public tools. */
    /** Hides the local-mode toggle when the workflow cannot operate without AI. */
    /** Gives multi-step builders a wider form column; the side panel moves below. */
    /** Stacks form, output and table notes in one centred column on desktop. */
    /**
     * False when the form fields drive the flow themselves (e.g. a wizard) and
     * call the `submit` they are given. Hides the shared button and AI toggle,
     * and ignores implicit submits such as Enter in a single-input form.
     */
  }: {
    canonicalPath?: string;
    recoveryKey?: string;
    pageTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    keywords?: string[];
    labels?: string[];
    eyebrow?: string;
    introTitle?: string;
    introText?: string;
    relatedLinks?: { href: string; label: string }[];
    faqs?: { question: string; answer: string }[];
    guide?: GeneratorGuide;
    theme?: string;
    isThemeCustomizable?: boolean;
    supportsStreaming?: boolean;
    generate: (opts: {
      useAI: boolean;
      onPreview?: (preview: GeneratorOutput) => void;
    }) => Promise<GeneratorOutput>;
    formFields: Snippet<[() => void, boolean]>;
    outputExtras?: Snippet<
      [GeneratorOutput, (output: GeneratorOutput) => void, boolean]
    >;
    outputLead?: Snippet;
    aiToggleScope?: string;
    progressSteps?: OneShotProgressStep[] | null;
    worldTheme?: string;
    initialDraft?: GeneratorOutput | null;
    variant?: "default" | "names";
    generateLabel?: string;
    busyLabel?: string;
    inputHint?: string;
    onLinkToHub?: () => void;
    onGeneratePlotTwist?: (data: GeneratorOutput) => void;
    onGenerateRoster?: (data: GeneratorOutput) => void;
    onOpenMemberAsCharacter?: (
      section: MarkdownSectionForCopy,
      data: GeneratorOutput,
    ) => void;
    clipboardService?: ClipboardService;
    autoGenerateExplicit?: boolean;
    initialDraftIsUserGenerated?: boolean;
    initialUseAI?: boolean;
    initialUseAIPath?: string;
    explainerText?: string;
    showGeneratorSwitcher?: boolean;
    aiModeRequired?: boolean;
    aiDataNotice?: string;
    offlineMessage?: string;
    wideForm?: boolean;
    singleColumn?: boolean;
    showSubmitButton?: boolean;
    generationReady?: boolean;
    generationSetupError?: boolean;
    onRetryGenerationSetup?: (recovery?: {
      output?: GeneratorOutput;
      useAI: boolean;
    }) => void;
    backHref?: string;
    backLabel?: string;
  } = $props();

  // The Quick Names lead changes DOM position at the same breakpoint as the
  // visual layout, keeping keyboard focus order aligned on phones and desktop.
  let isNarrowViewport = $state(false);
  let diagramsRetryAttempt = $state(0);
  let diagramRecoveryError = $state(false);
  function loadGeneratorDiagrams(): Promise<
    typeof import("./layout/GeneratorDiagrams.svelte")
  > {
    return diagramsRetryAttempt === 0
      ? import("./layout/GeneratorDiagrams.svelte")
      : (import("./layout/GeneratorDiagrams.svelte?retry") as Promise<
          typeof import("./layout/GeneratorDiagrams.svelte")
        >);
  }
  function recoverDiagramLoad() {
    const currentOutput = session.generatedData;
    if (
      currentOutput &&
      saveGeneratorOutputForReload(recoveryKey ?? "", currentOutput)
    ) {
      window.location.reload();
    } else {
      diagramRecoveryError = true;
    }
  }
  async function copyDiagramOutputForRecovery() {
    const currentOutput = session.generatedData;
    if (!currentOutput) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(currentOutput, null, 2),
      );
      diagramRecoveryError = false;
    } catch {
      diagramRecoveryError = true;
    }
  }
  onMount(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => (isNarrowViewport = media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  });

  let outputCard = $state<HTMLElement | null>(null);
  type GeneratorDiagramsComponent =
    (typeof import("./layout/GeneratorDiagrams.svelte"))["default"];
  let diagrams = $state<ReturnType<GeneratorDiagramsComponent> | null>(null);
  let selectedHubEntity = $state<SessionEntity | null>(null);

  // Offline awareness (#1494): generator pages still work offline using local
  // tables, but AI Lore Co-Author mode requires the network. Network status
  // comes from the shared `onlineStatus` store (seeded at module load, so no
  // post-mount "assumed online" flash).
  const isOnline = $derived(onlineStatus.current);
  // Keep the supported output-shape checks explicit; covered by layout output tests.
  // fallow-ignore-next-line complexity
  const hasGeneratorDiagrams = $derived.by(() => {
    const output = session.generatedData;
    return Boolean(
      output &&
      ((output.bodies?.length ?? 0) > 0 ||
        (output.pattern?.stars?.length ?? 0) > 0 ||
        (output.pointCrawl?.nodes?.length ?? 0) > 0 ||
        output.mysteryGraph),
    );
  });
  const activeThemeId = $derived(resolveWorldThemeId(theme));
  // Pre-paint genre bootstrap (#5149): the prerendered head applies the
  // initial genre before the body parses, so the page does not flash the
  // workspace theme until the effect below runs on hydration.
  const themeBootstrap = themeBootstrapScript(
    untrack(() => (isThemeCustomizable ? activeThemeId : null)),
  );
  // Stable per-page generator identifier for analytics (#1796) — derived from
  // the page's own canonical path (or the eyebrow label as a fallback) so
  // it's available immediately, before any generation happens, unlike
  // generatedData.type which only exists after a successful generate() call.
  const generatorType = $derived(resolveGeneratorType(canonicalPath, eyebrow));
  const generatedNoun = $derived(resolveGeneratedNoun(eyebrow));
  const generatedSingular = $derived(resolveGeneratedSingular(eyebrow));
  const columnClasses = $derived(
    getGeneratorColumnClasses(singleColumn, wideForm),
  );
  const activeInputHint = $derived(
    inputHint ??
      (isNarrowViewport
        ? "Set your inputs — your draft updates below"
        : "Set your inputs — your draft updates to the right"),
  );
  const contextSelection = $derived(
    getContextSelection(sessionHubStore.entities),
  );

  const session = useGeneratorSession({
    getCanonicalPath: () => canonicalPath,
    getInitialDraft: () => initialDraft,
    getInitialDraftIsUserGenerated: () => initialDraftIsUserGenerated,
    getInitialUseAI: () =>
      initialUseAIPath === canonicalPath ? initialUseAI : undefined,
    getAutoGenerateExplicit: () => autoGenerateExplicit,
    getAiModeRequired: () => aiModeRequired,
    getSupportsStreaming: () => supportsStreaming,
    getSingleColumn: () => singleColumn,
    getGeneratorType: () => generatorType,
    getDocumentLayout: () => documentLayout,
    getContextSelection: () => contextSelection,
    getOutputCard: () => outputCard,
    generate: (opts) => generate(opts),
  });
  const effectiveUseAI = $derived(
    session.useAI &&
      isOnline &&
      (typeof navigator === "undefined" || navigator.onLine),
  );
  function retryGeneratorSetup() {
    onRetryGenerationSetup?.({
      output: session.userGenerationSucceeded
        ? (session.generatedData ?? undefined)
        : undefined,
      useAI: session.useAI,
    });
  }

  const documentLayout = $derived(
    getCalendarPreviewLayout(session.generatedData),
  );
  const documentSections = $derived(
    variant === "names" ? [] : splitMarkdownForCopy(documentLayout.content),
  );

  const clipboard = useGeneratorClipboard({
    getClipboardService: () => clipboardService,
    getGeneratorType: () => generatorType,
    getGeneratedData: () => session.generatedData,
    getDocumentLayout: () => documentLayout,
  });
  const save = useGeneratorSave({
    getGeneratorType: () => generatorType,
    getGeneratedData: () => session.generatedData,
    isGenerationInProgress: () => session.isBusy,
    getDocumentLayout: () => documentLayout,
    exportDiagramImage: () =>
      diagrams?.exportDataUrl() ?? Promise.resolve(undefined),
    getSelectedNodeIds: () => diagrams?.getSelectedPointCrawlNodeIds(),
    setError: (message) => (session.errorMessage = message),
  });
  const handoffs = useGeneratorHandoffs({
    getGeneratorType: () => generatorType,
    getDocumentLayout: () => documentLayout,
    setError: (message) => (session.errorMessage = message),
  });
  const sharing = useGeneratorSharing({
    getGeneratorType: () => generatorType,
    getTheme: () => theme,
    getWorldTheme: () => worldTheme,
    getCanonicalPath: () => canonicalPath,
    getOgImage: () => ogImage,
    getGeneratedData: () => session.generatedData,
    getDocumentLayout: () => documentLayout,
  });
  const refinement = useGeneratorRefinement({
    getGeneratorType: () => generatorType,
    getGeneratedData: () => session.generatedData,
    getDocumentLayout: () => documentLayout,
    getCurrentEntityId: () => session.currentEntityId,
    getContextSelection: () => contextSelection,
    canRefineCurrentOutput: () => session.userGenerationSucceeded,
    applyRefinedOutput: session.applyRefinedOutput,
    onOpenFromHub: () => (selectedHubEntity = null),
  });

  const canFollowUp = $derived(session.userGenerationSucceeded);
  const exampleWriteupLabel = $derived(
    variant === "names"
      ? "See example names with notes"
      : "See an example write-up",
  );

  export function triggerExplicitAutoGenerate() {
    session.triggerExplicitAutoGenerate();
  }

  $effect(() => {
    // Observe only the generator's own genre. Reading the public theme here
    // would make an outgoing generator overwrite a new page's explicit genre
    // during navigation when the public context changes.
    if (isThemeCustomizable && browser && activeThemeId !== "workspace") {
      publicThemeStore.setTheme(activeThemeId);
    }
  });

  // The shell renders the header CTA now, so this page registers its tracking
  // rather than binding it to a button it no longer owns.
  $effect(() => registerShellCtaHandler(save.trackHeaderOpenCodex));
  $effect(() => {
    if (session.isBusy) save.clearSaveError();
  });
</script>

{#snippet outputCardBlock()}
  <GeneratorOutputCard
    generatedData={session.generatedData}
    aiFallbackDismissed={session.aiFallbackDismissed}
    isBusy={session.showOutputLoading}
    isGenerationInProgress={session.isBusy}
    isExampleDraft={session.isExampleDraft}
    {generatorType}
    {canFollowUp}
    saveError={save.saveError}
    isSaving={save.isSaving}
    {generatedSingular}
    {variant}
    worldTheme={theme || worldTheme}
    documentContent={documentLayout.content}
    {documentSections}
    copied={clipboard.copied}
    copiedSectionId={clipboard.copiedSectionId}
    contextTrimmed={contextSelection.trimmed}
    onDismissAiFallback={session.dismissAiFallback}
    onRetryAi={() => void session.handleGenerate({ forceAI: true })}
    {progressSteps}
    onSaveToCodex={save.handleSaveToCodex}
    onRefine={when(canFollowUp, refinement.openForCurrentOutput)}
    onCopyMarkdown={clipboard.handleCopyMarkdown}
    onCopySection={(sectionId, markdown) =>
      void clipboard.handleCopySection(sectionId, markdown)}
    onPrepareShare={when(canFollowUp, sharing.prepareCurrentOutputShare)}
    {...sharing.currentOutputTracking}
    onContainerClick={clipboard.handleContainerClick}
    onContainerKeydown={clipboard.handleContainerKeydown}
    onSelectHubEntity={(entity) => (selectedHubEntity = entity)}
    onSaveHubToCodex={save.handleSaveHubToCodex}
    onBuildDelveCanvas={handoffs.handleBuildDelveCanvas}
    onBuildAdventureCanvas={handoffs.handleBuildAdventureCanvas}
    onGeneratePlotTwist={when(canFollowUp, onGeneratePlotTwist)}
    onGenerateRoster={when(canFollowUp, onGenerateRoster)}
    {onOpenMemberAsCharacter}
    onSendToMonsterLabs={when(canFollowUp, handoffs.handleSendToMonsterLabs)}
    isSendingToMonsterLabs={handoffs.monsterLabsFlow.state === "loading"}
  />
{/snippet}

<svelte:head>
  {#if themeBootstrap}
    <!-- Apply the page genre before the body is parsed to avoid a first-paint flash. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html themeBootstrap}
  {/if}
</svelte:head>

<SEOGeneratorHead
  title={pageTitle}
  description={metaDescription}
  {introTitle}
  {canonicalPath}
  image={ogImage}
  imageAlt={ogImageAlt}
  {keywords}
  {faqs}
  generatedData={session.generatedData}
/>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
  data-world-theme={activeThemeId}
>
  <!-- Marketing Header -->

  <!-- Compact Explainer Strip — no duplicate generate CTA (#1274) -->
  <!-- On phones a lead (Quick names) replaces it, so the tool starts higher. -->
  <div
    class="w-full border-b border-theme-border/30 bg-theme-surface/10 px-6 {outputLead
      ? 'hidden sm:block'
      : ''}"
  >
    <div
      class="{GENERATOR_CANVAS_CLASS} 2xl:max-w-[96rem] py-4 flex items-center justify-between gap-4"
    >
      <p
        class="text-sm md:text-xs font-bold text-theme-text uppercase tracking-widest font-header"
      >
        {explainerText ??
          `Generate campaign-ready ${generatedNoun} in seconds — no account required.`}
      </p>
      <span
        class="hidden md:inline-flex h-px flex-1 bg-gradient-to-r from-theme-primary/35 via-theme-border/30 to-transparent"
        aria-hidden="true"
      ></span>
    </div>
  </div>

  <div class={columnClasses.container}>
    <!--
      The lead moves before the form in both the mobile DOM and visual order;
      otherwise the columns retain their Parameters -> Output -> At the Table
      order for crawlers that read raw markup (#2320).
    -->
    {#if outputLead && isNarrowViewport}
      <div class="order-1 lg:hidden">{@render outputLead()}</div>
    {/if}
    <!-- Parameters Column: positioned on the left on desktop -->
    <div
      class="{columnClasses.form} space-y-6 order-1"
      use:prewarmTurnstileOnInteract
    >
      <GeneratorFormPanel
        {canonicalPath}
        {eyebrow}
        {showGeneratorSwitcher}
        {introTitle}
        {introText}
        {labels}
        inputHint={activeInputHint}
        {backHref}
        {backLabel}
        {formFields}
        onGenerate={() => {
          if (generationReady) void session.handleGenerate();
        }}
        isBusy={session.isBusy}
        {generationReady}
        {generationSetupError}
        onRetryGenerationSetup={retryGeneratorSetup}
        {isOnline}
        {aiModeRequired}
        {aiDataNotice}
        {aiToggleScope}
        {offlineMessage}
        {showSubmitButton}
        {busyLabel}
        {generateLabel}
        {generatedSingular}
        bind:useAI={session.useAI}
        errorMessage={session.errorMessage}
        copyError={clipboard.copyError}
      />
    </div>

    <!-- Output Card Column: middle column on desktop -->
    <div class="{columnClasses.output} flex flex-col order-2">
      {#if outputLead && !isNarrowViewport}
        {@render outputLead()}
      {/if}
      <!-- The scroll target after Generate: the result, not the lead. -->
      <div class="flex flex-col scroll-mt-20" bind:this={outputCard}>
        {#if hasGeneratorDiagrams}
          {#key diagramsRetryAttempt}
            {#await loadGeneratorDiagrams() then { default: GeneratorDiagrams }}
              <GeneratorDiagrams
                bind:this={diagrams}
                generatedData={session.generatedData}
                {recoveryKey}
                useAI={effectiveUseAI}
                onReplaceOutput={!session.isExampleDraft
                  ? session.replaceOutput
                  : undefined}
                onCopy={clipboard.trackDiagramCopy}
              />
            {:catch}
              <p class="text-sm text-theme-text" role="alert">
                The diagram tools could not load.
                {#if diagramsRetryAttempt === 0}
                  <button
                    class="underline"
                    onclick={() => (diagramsRetryAttempt += 1)}
                  >
                    Retry
                  </button>
                {:else if diagramRecoveryError}
                  <button
                    class="underline"
                    onclick={copyDiagramOutputForRecovery}
                  >
                    Copy result
                  </button>
                  <span role="status">
                    Could not preserve the result for reload.
                  </span>
                {:else}
                  <button class="underline" onclick={recoverDiagramLoad}>
                    Reload to recover
                  </button>
                {/if}
              </p>
            {/await}
          {/key}
        {/if}
        {#if outputLead && session.isExampleDraft}
          <details class="group rounded-2xl border border-theme-border/50">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-theme-text"
            >
              {exampleWriteupLabel}
              <span
                class="icon-[lucide--chevron-down] h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              ></span>
            </summary>
            {@render outputCardBlock()}
          </details>
        {:else}
          {@render outputCardBlock()}
        {/if}
        {#if outputExtras && session.generatedData && !session.isExampleDraft}
          {@render outputExtras(
            session.generatedData,
            session.replaceOutput,
            effectiveUseAI,
          )}
        {/if}
      </div>
    </div>

    <!-- At the Table Column: positioned on the right on desktop -->
    <div class="{columnClasses.table} order-3 lg:order-3">
      <GeneratorRail
        generatedData={session.generatedData}
        lore={documentLayout.lore}
        {variant}
        provenance={session.currentEntityId
          ? sessionHubStore.provenance[session.currentEntityId]
          : undefined}
        onSelectEntity={(entity) => (selectedHubEntity = entity)}
      />
    </div>
  </div>

  <GeneratorGuideSection {introTitle} {guide} />
  <FaqSection {introTitle} {faqs} />
  <RelatedLinksSection {relatedLinks} />

  <GeneratorModals
    {recoveryKey}
    recoveryOutput={session.generatedData}
    {selectedHubEntity}
    onCloseHubEntity={() => (selectedHubEntity = null)}
    {refinement}
    {handoffs}
    {clipboard}
    {sharing}
  />
</div>
