<script lang="ts">
  import type { Snippet } from "svelte";
  import { browser } from "$app/environment";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import type { MarkdownSectionForCopy } from "$lib/components/seo/markdown-sections";
  import { splitMarkdownForCopy } from "$lib/components/seo/markdown-sections";
  import { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";
  import { getGeneratorColumnClasses } from "./generator-column-classes";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { onlineStatus } from "$lib/stores/online.svelte";
  import { sessionHubStore } from "$lib/stores/session-hub.svelte";
  import { getContextSelection, type SessionEntity } from "generator-engine";
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "$lib/services/ClipboardService";
  import { when } from "$lib/utils/when";
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
    worldTheme = "workspace",
    initialDraft = null,
    variant = "default",
    generateLabel = undefined,
    busyLabel = undefined,
    inputHint = "Set your inputs — your draft updates to the right",
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
  }: {
    canonicalPath?: string;
    pageTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    keywords?: string[];
    /** Public discovery labels (#2762). Chips linking to `/explore?label=X`. */
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
    /** Enables actions when a public result was explicitly opened as a remix. */
    initialDraftIsUserGenerated?: boolean;
    /** Replaces the generator-specific explainer strip for focused public tools. */
    explainerText?: string;
    showGeneratorSwitcher?: boolean;
    /** Hides the local-mode toggle when the workflow cannot operate without AI. */
    aiModeRequired?: boolean;
    aiDataNotice?: string;
    offlineMessage?: string;
    /** Gives multi-step builders a wider form column; the side panel moves below. */
    wideForm?: boolean;
    /** Stacks form, output and table notes in one centred column on desktop. */
    singleColumn?: boolean;
    /**
     * False when the form fields drive the flow themselves (e.g. a wizard) and
     * call the `submit` they are given. Hides the shared button and AI toggle,
     * and ignores implicit submits such as Enter in a single-input form.
     */
    showSubmitButton?: boolean;
    backHref?: string;
    backLabel?: string;
  } = $props();

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
  <div class="w-full border-b border-theme-border/30 bg-theme-surface/10 px-6">
    <div class="max-w-6xl mx-auto py-4 flex items-center justify-between gap-4">
      <p
        class="text-xs font-bold text-theme-text/75 uppercase tracking-widest font-header"
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

  <div
    class="max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8"
  >
    <!--
      DOM order matches visual order (Parameters -> Output -> At the Table)
      via order-1/2/3 below, so SEO/LLM crawlers that read raw markup instead
      of applying CSS grid order see the H1 and intro copy before the
      generator's empty-state placeholders (#2320).
    -->
    <!-- Parameters Column: positioned on the left on desktop -->
    <div class="{columnClasses.form} space-y-6 order-1 lg:order-1">
      <GeneratorFormPanel
        {canonicalPath}
        {eyebrow}
        {showGeneratorSwitcher}
        {introTitle}
        {introText}
        {labels}
        {inputHint}
        {backHref}
        {backLabel}
        {formFields}
        onGenerate={() => void session.handleGenerate()}
        isBusy={session.isBusy}
        {isOnline}
        {aiModeRequired}
        {aiDataNotice}
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
    <div
      class="{columnClasses.output} flex flex-col order-2 lg:order-2 scroll-mt-20"
      bind:this={outputCard}
    >
      <GeneratorDiagrams
        bind:this={diagrams}
        generatedData={session.generatedData}
        onCopy={clipboard.trackDiagramCopy}
      />
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
        onSendToMonsterLabs={when(
          canFollowUp,
          handoffs.handleSendToMonsterLabs,
        )}
        isSendingToMonsterLabs={handoffs.monsterLabsFlow.state === "loading"}
      />
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
