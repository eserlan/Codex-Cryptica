<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import { browser } from "$app/env";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
  import type { OneShotProgressStep } from "generator-engine";
  import type { MarkdownSectionForCopy } from "#lib/components/seo/markdown-sections.js";
  import { splitMarkdownForCopy } from "#lib/components/seo/markdown-sections.js";
  import { getGeneratorDocumentLayout } from "#lib/components/seo/generator-document-layout.js";
  import {
    GENERATOR_CANVAS_CLASS,
    getGeneratorColumnClasses,
  } from "./generator-column-classes";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { onlineStatus } from "#lib/stores/online.svelte.js";
  import { sessionHubStore } from "#lib/stores/session-hub.svelte.js";
  import { getContextSelection, type SessionEntity } from "generator-engine";
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "#lib/services/ClipboardService.js";
  import { when } from "#lib/utils/when.js";
  import { registerShellCtaHandler } from "./marketing-shell";
  import {
    resolveWorldThemeId,
    resolveGeneratorType,
    resolveGeneratedNoun,
    resolveGeneratedSingular,
  } from "./generator-page-identity";
  import FaqSection from "./FaqSection.svelte";
  import RelatedLinksSection from "./RelatedLinksSection.svelte";
  import GeneratorOutputCard from "./GeneratorOutputCard.svelte";
  import SEOGeneratorHead from "./SEOGeneratorHead.svelte";
  import GeneratorFormPanel from "./layout/GeneratorFormPanel.svelte";
  import GeneratorDiagrams from "./layout/GeneratorDiagrams.svelte";
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
    explainerText = undefined,
    showGeneratorSwitcher = true,
    aiModeRequired = false,
    aiDataNotice = undefined,
    offlineMessage = undefined,
    wideForm = false,
    singleColumn = false,
    showSubmitButton = true,

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
    theme?: string;
    isThemeCustomizable?: boolean;
    supportsStreaming?: boolean;
    generate: (opts: {
      useAI: boolean;
      onPreview?: (preview: GeneratorOutput) => void;
    }) => Promise<GeneratorOutput>;
    formFields: Snippet<[() => void]>;
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
    explainerText?: string;
    showGeneratorSwitcher?: boolean;
    aiModeRequired?: boolean;
    aiDataNotice?: string;
    offlineMessage?: string;
    wideForm?: boolean;
    singleColumn?: boolean;
    showSubmitButton?: boolean;
    backHref?: string;
    backLabel?: string;
  } = $props();

  // The Quick Names lead changes DOM position at the same breakpoint as the
  // visual layout, keeping keyboard focus order aligned on phones and desktop.
  let isNarrowViewport = $state(false);
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
  let diagrams = $state<ReturnType<typeof GeneratorDiagrams> | null>(null);
  let selectedHubEntity = $state<SessionEntity | null>(null);

  // Offline awareness (#1494): generator pages still work offline using local
  // tables, but AI Lore Co-Author mode requires the network. Network status
  // comes from the shared `onlineStatus` store (seeded at module load, so no
  // post-mount "assumed online" flash).
  const isOnline = $derived(onlineStatus.current);
  const activeThemeId = $derived(resolveWorldThemeId(theme));
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

  const documentLayout = $derived(
    getGeneratorDocumentLayout(session.generatedData),
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
    if (isThemeCustomizable && browser) {
      if (themeStore.worldThemeId !== activeThemeId) {
        void themeStore.setTheme(activeThemeId);
      }
    }
  });

  // The shell renders the header CTA now, so this page registers its tracking
  // rather than binding it to a button it no longer owns.
  $effect(() => registerShellCtaHandler(save.trackHeaderOpenCodex));
</script>

{#snippet outputCardBlock()}
  <GeneratorOutputCard
    generatedData={session.generatedData}
    aiFallbackDismissed={session.aiFallbackDismissed}
    isBusy={session.showOutputLoading}
    isExampleDraft={session.isExampleDraft}
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
        class="text-xs font-bold text-theme-text uppercase tracking-widest font-header"
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
    <div class="{columnClasses.form} space-y-6 order-1">
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
        onGenerate={() => void session.handleGenerate()}
        isBusy={session.isBusy}
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
        <GeneratorDiagrams
          bind:this={diagrams}
          generatedData={session.generatedData}
          useAI={session.useAI}
          onReplaceOutput={!session.isExampleDraft
            ? session.replaceOutput
            : undefined}
          onCopy={clipboard.trackDiagramCopy}
        />
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
            session.useAI,
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

  <FaqSection {introTitle} {faqs} />
  <RelatedLinksSection {relatedLinks} />

  <GeneratorModals
    {selectedHubEntity}
    onCloseHubEntity={() => (selectedHubEntity = null)}
    {save}
    {refinement}
    {handoffs}
    {clipboard}
    {sharing}
  />
</div>
