<script lang="ts">
  import { mountGeneratorPage } from "./generator-page-mount";
  import { createCharacterDefaults } from "./generator-page-character-defaults";
  import { createSettingDefaults } from "./generator-page-setting-defaults";
  import { createAdventureDefaults } from "./generator-page-adventure-defaults";
  import type { OneShotProgressStep } from "generator-engine/one-shot-staged";
  import GeneratorPageOutputExtras from "./GeneratorPageOutputExtras.svelte";
  import QuickNamesPanel from "./QuickNamesPanel.svelte";
  import {
    FANTASY_NAME_THEME,
    askQuickNamesAi,
    culturesForTheme,
  } from "./quick-names";
  import { nameGeneratorConfig } from "#lib/services/seo/generator-config.js";
  import { onlineStatus } from "#lib/stores/online.svelte.js";
  import { onDestroy, onMount, untrack } from "svelte";
  import { browser } from "$app/env";
  import { page } from "$app/state";
  import { hubContext } from "#lib/stores/hub-context.svelte.js";
  import { publicThemeStore } from "#lib/stores/public-theme.svelte.js";
  import { sessionHubStore } from "#lib/stores/session-hub.svelte.js";
  import { UIPersistence } from "#lib/stores/ui/persistence.js";
  import SEOGeneratorLayout from "./SEOGeneratorLayout.svelte";
  import GeneratorPageFormFields from "./GeneratorPageFormFields.svelte";
  import {
    factionConfig,
    oneShotConfig,
    themeToQuestGenre,
  } from "#lib/services/seo/generator-config.js";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

  import { createGeneratorRemixLoader } from "./generator-page-remix";
  import {
    type SlugMetaEntry,
    type ValidSlug,
    slugMeta,
  } from "./generator-page-meta";
  import { slugDrafts } from "./generator-page-drafts";
  import { withCategoryRelatedLinks } from "#lib/content/generator-catalogue.js";
  import {
    createGenerate,
    createGeneratorHandlers,
    createOneShotRunControl,
    showsStagedProgress,
    isStreamableSlug,
  } from "./generator-page-generation";
  import { preloadLocalGenerator } from "./generator-page-local-generation.js";
  import { consumeGeneratorOutputAfterReload } from "./generator-output-reload.js";
  import {
    consumeGeneratorSetupState,
    saveGeneratorSetupState,
  } from "./generator-setup-recovery.js";
  import {
    initializeHandoffState,
    setupHandoffNavigation,
    openPlotTwistFromQuest,
    openRosterFromFaction,
    openMemberAsCharacter,
    applyPendingDevelopWorld as applyDevelopWorldHandoff,
    type GeneratorHandoffState,
  } from "./generator-page-handoffs";
  import {
    HUB_LABELS,
    HUB_SLUG_TO_THEME_ID,
    SOCIAL_HUB_GENRE_TO_THEME,
    mapAlienRaceGenreToTheme,
    mapStarSystemGenreToTheme,
    mapWorldGenreToTheme,
    mapOneShotGenreToTheme,
    resolveHubGeneratorGenre,
    shouldSyncGeneratorTheme,
  } from "./generator-theme-maps";
  import { syncGeneratorTheme } from "./generator-theme-sync";
  import { generatorShareService } from "#lib/services/sharing/GeneratorShareService.js";
  import {
    resolveInitialActiveTheme,
    resolveOneShotGenre,
  } from "./generator-page-hub-state";
  import { createPageGenreChangeHandlers } from "./generator-page-form-theme";

  let {
    slug,
    urlHubTheme = undefined,
    metaOverrides = undefined,
    initialDraftOverride = undefined,
    persistence = new UIPersistence(),

    /**
     * Page copy that differs from the slug's own, for routes that present the
     * same generator under a different URL and pitch.
     *
     * The `/tools/*` pages each hand-wired their own state, generate call and
     * form bindings to say the same thing this component already says for
     * their slug. They now render this and pass their title, description,
     * FAQs, related links and canonical here, so the generator wiring exists
     * once while the pages keep their distinct content and URLs.
     */
    /**
     * Replaces the slug's default initial draft (from slugDrafts) when provided.
     * Used by alternative routes that need a different default draft on first load.
     */
  }: {
    slug: ValidSlug;
    urlHubTheme?: string;
    metaOverrides?: Partial<SlugMetaEntry>;
    initialDraftOverride?: GeneratorOutput;
    persistence?: UIPersistence;
  } = $props();

  // When arriving via a themed URL, seed hubContext immediately so derived
  // values (backHref, initialHubGenre) compute correctly on first render.
  const _initialSlug = untrack(() => slug);
  const _initialUrlHubTheme = untrack(() => urlHubTheme);
  const _initialPublicThemeId = untrack(() => publicThemeStore.themeId);
  const initialPublicHub = Object.entries(HUB_SLUG_TO_THEME_ID).find(
    ([, id]) => id === _initialPublicThemeId,
  )?.[0];
  const initialHubTheme =
    _initialUrlHubTheme ?? initialPublicHub ?? hubContext.theme;

  // A themed generator URL also establishes browsing context, even for a
  // generator whose own genre is fixed and not user-customizable.
  $effect(() => {
    if (
      urlHubTheme &&
      Object.prototype.hasOwnProperty.call(HUB_SLUG_TO_THEME_ID, urlHubTheme)
    ) {
      publicThemeStore.setTheme(HUB_SLUG_TO_THEME_ID[urlHubTheme]);
    }
  });

  if (_initialUrlHubTheme) {
    hubContext.set(_initialUrlHubTheme);
  }

  const backHubTheme = $derived(
    urlHubTheme ??
      Object.entries(HUB_SLUG_TO_THEME_ID).find(
        ([, id]) => id === publicThemeStore.themeId,
      )?.[0] ??
      hubContext.theme,
  );
  const backHref = $derived(
    backHubTheme && HUB_LABELS[backHubTheme]
      ? `/generators/${backHubTheme}`
      : "/generators",
  );
  const backLabel = $derived(
    (backHubTheme && HUB_LABELS[backHubTheme]) ?? "All generators",
  );
  const initialHubGenre = resolveHubGeneratorGenre(initialHubTheme);
  const meta = $derived({ ...slugMeta[slug], ...(metaOverrides ?? {}) });
  const relatedLinks = $derived(
    withCategoryRelatedLinks(slug, meta.relatedLinks ?? []),
  );
  const _initialHandoff = initializeHandoffState(_initialSlug);
  let handoffState = $state<GeneratorHandoffState>({
    ..._initialHandoff,
    autoGeneratedForFactionContext: undefined,
  });
  let quickNamesPinned = $state<string[]>([]);

  const forms = $state({
    ...createCharacterDefaults(_initialSlug, _initialHandoff),
    ...createSettingDefaults(initialHubGenre),
    ...createAdventureDefaults(_initialHandoff),
  });

  let seoLayoutRef = $state<ReturnType<typeof SEOGeneratorLayout> | null>(null);
  let remixDraft = $state<GeneratorOutput | null>(null);

  // Drives the roster's auto-generation explicitly once handoff context
  // has actually settled, rather than have the child guess how long to wait
  // after a client-side navigation (SEOGeneratorLayout is reused across slug
  // navigations, so its own on-mount effects can fire before this page's
  // afterNavigate handler has set the handed-over context — see that
  // component's `triggerExplicitAutoGenerate` doc comment).
  $effect(() => {
    if (
      slug === "faction-roster" &&
      handoffState.factionContext &&
      handoffState.autoGeneratedForFactionContext !==
        handoffState.factionContext
    ) {
      handoffState.autoGeneratedForFactionContext = handoffState.factionContext;
      seoLayoutRef?.triggerExplicitAutoGenerate();
    }
  });

  // Dynamic generator routes reuse this component during client navigation.
  // Read the URL only in the browser so static prerendering remains valid.
  setupHandoffNavigation(
    () => slug,
    handoffState,
    (updates) => {
      Object.assign(handoffState, updates);

      if (updates.questPremise !== undefined)
        forms.plotTwist.premise = updates.questPremise;
      if (updates.factionContext !== undefined)
        forms.factionRoster.factionContext = updates.factionContext;
      if (updates.npcContext !== undefined)
        forms.npc.campaignContext = updates.npcContext;
    },
  );

  let activeTheme = $state(
    resolveInitialActiveTheme({
      urlHubTheme: _initialUrlHubTheme,
      publicThemeId: _initialPublicThemeId,
      slug: _initialSlug,
      persistence,
      browser: Boolean(browser),
      fallbackTheme: factionConfig.themes[0],
    }),
  );
  const setupRecovery = untrack(() =>
    browser
      ? consumeGeneratorSetupState<typeof forms>(meta.canonicalPath)
      : null,
  );
  if (setupRecovery) {
    for (const [key, value] of Object.entries(setupRecovery.forms)) {
      if (key in forms && value && typeof value === "object")
        Object.assign(forms[key as keyof typeof forms], value);
    }
    activeTheme = setupRecovery.activeTheme;
  }
  const setupRecoveryOutput = setupRecovery?.output ?? null;
  const setupRecoveryUseAI = setupRecovery?.useAI ?? true;
  const setupRecoveryPath = setupRecovery ? meta.canonicalPath : undefined;
  const setupRecoveryOutputForPath = $derived(
    meta.canonicalPath === setupRecoveryPath ? setupRecoveryOutput : null,
  );
  let lastSlug = $state(_initialSlug);

  // The one-shot genre drives its skin (see syncGeneratorTheme), so a hub URL
  // must seed the genre, otherwise the default genre overrides the hub theme.
  forms.oneShot.genre = resolveOneShotGenre(
    _initialSlug,
    activeTheme,
    oneShotConfig.genres,
    forms.oneShot.genre,
  );

  const setActiveTheme = (theme: string) => (activeTheme = theme);
  const genreHandlers = createPageGenreChangeHandlers(setActiveTheme);

  $effect(() => {
    if (slug !== lastSlug) {
      lastSlug = slug;
      forms.pantheon.mode =
        slug === "pantheon-generator" ? "pantheon" : "single";
    }
  });

  $effect(() => {
    syncGeneratorTheme({
      slug,
      activeTheme,
      setActiveTheme: (theme) => (activeTheme = theme),
      ...forms,
      mapOneShotGenre: mapOneShotGenreToTheme,
      themeToQuestGenre,
      mapSocialHubGenre: (genre) =>
        SOCIAL_HUB_GENRE_TO_THEME[genre] ?? "Classic Fantasy",
      mapWorldGenre: mapWorldGenreToTheme,
      mapStarSystemGenre: mapStarSystemGenreToTheme,
      mapAlienRaceGenre: mapAlienRaceGenreToTheme,
    });
  });

  // Consumes the "Develop this world" handoff from a generated star system
  // (#1935): a linked major body opens this page with its name, type, and
  // system context in the query string so the World Generator draft starts
  // pre-populated instead of blank. Cleans the URL after reading it.
  function applyPendingDevelopWorld(): void {
    const handoff = applyDevelopWorldHandoff();
    if (handoff) {
      forms.world.dominantFeature = handoff.dominantFeature;
    }
  }

  onMount(() => {
    const cleanup = mountGeneratorPage({
      slug,
      hubTheme: initialHubTheme,
      urlHubTheme,
      publicThemeId: _initialPublicThemeId,
      persistence,
      browser: Boolean(browser),
      forms,
      setActiveTheme,
      applyWorldHandoff: applyPendingDevelopWorld,
    });
    return cleanup;
  });

  const loadRemixDraft = createGeneratorRemixLoader({
    getShared: (id) => generatorShareService.get(id),
    onReset: () => (remixDraft = null),
    onLoaded: (result) => {
      remixDraft = result.draft;
      if (result.theme) activeTheme = result.theme;
      window.history.replaceState({}, "", window.location.pathname);
    },
  });

  $effect(() => {
    const remixId = page.url.searchParams.get("remix");
    void loadRemixDraft(browser ? remixId : null, meta.canonicalPath);
  });

  /** Live steps while a one-shot is generated in stages. */
  let oneShotProgress = $state<OneShotProgressStep[] | null>(null);
  let generationReady = $state(false);
  let generationSetupError = $state(false);
  let generationSetupRequest = 0;
  const oneShotRuns = createOneShotRunControl();
  onDestroy(oneShotRuns.dispose);

  async function prepareGeneratorEngine(targetSlug: ValidSlug = slug) {
    const request = ++generationSetupRequest;
    generationReady = false;
    generationSetupError = false;
    try {
      await preloadLocalGenerator(targetSlug);
      if (request === generationSetupRequest) generationReady = true;
    } catch {
      if (request === generationSetupRequest) generationSetupError = true;
    }
  }

  $effect(() => {
    const currentSlug = slug;
    void prepareGeneratorEngine(currentSlug);
  });

  const GENERATE_HANDLERS = createGeneratorHandlers({
    ...forms,
    getActiveTheme: () => activeTheme,
    getPlotTwistPremise: () => forms.plotTwist.premise,
    getHandoffQuestPremise: () => handoffState.questPremise,
    getSessionEntities: () => sessionHubStore.entities,
    onOneShotProgress: (steps) => (oneShotProgress = steps),
    oneShotRuns,
  });

  const generate = createGenerate({
    getSlug: () => slug,
    getHandlers: () => GENERATE_HANDLERS,
  });

  const isNamesPage = $derived(slug === "names" || slug === "fantasy-names");
  // The genre the names page is set to; the fantasy page is fixed.
  const namesTheme = $derived(
    slug === "names" ? activeTheme : FANTASY_NAME_THEME,
  );

  let reloadedOutput = $state<GeneratorOutput | null>(null);
  $effect(() => {
    const activeRecoveryKey = meta.canonicalPath;
    reloadedOutput = consumeGeneratorOutputAfterReload(activeRecoveryKey);
  });
  const initialDraft = $derived(
    setupRecoveryOutputForPath ??
      reloadedOutput ??
      remixDraft ??
      ((handoffState.questPremise && slug === "plot-twist-generator") ||
      (handoffState.factionContext && slug === "faction-roster") ||
      (handoffState.npcContext && slug === "npc")
        ? null
        : (initialDraftOverride ?? slugDrafts[slug] ?? null)),
  );

  // Recovery saves the route form, AI preference, and current output as one operation.
  // fallow-ignore-next-line complexity
  async function reloadAfterGeneratorSetupFailure(recovery?: {
    output?: GeneratorOutput;
    useAI: boolean;
  }) {
    const currentOutput =
      recovery?.output ??
      setupRecoveryOutputForPath ??
      reloadedOutput ??
      undefined;
    if (
      !saveGeneratorSetupState(meta.canonicalPath, {
        forms,
        activeTheme,
        useAI: recovery?.useAI ?? setupRecoveryUseAI,
        output: currentOutput,
      })
    ) {
      try {
        if (currentOutput)
          await navigator.clipboard.writeText(
            JSON.stringify(currentOutput, null, 2),
          );
        window.alert(
          currentOutput
            ? "The generated result was copied. Reload was cancelled."
            : "Could not preserve the form values. Reload was cancelled.",
        );
      } catch {
        window.alert(
          "Could not preserve this generated result. Copy it before reloading.",
        );
      }
      return;
    }
    window.location.reload();
  }
</script>

{#snippet quickNames()}
  <QuickNamesPanel
    generatorType={slug}
    bind:culture={forms.names.culture}
    gender={forms.names.gender}
    bind:nameType={forms.names.nameType}
    bind:pinned={quickNamesPinned}
    cultureChoices={culturesForTheme(namesTheme)}
    nameTypeChoices={nameGeneratorConfig.nameTypes}
    isOnline={onlineStatus.current}
    askAi={(query) =>
      askQuickNamesAi(
        async (options) =>
          (
            await import("#lib/services/seo/generator-engine.js")
          ).generatorEngine.generateNames(options),
        {
          ...forms.names,
          theme: namesTheme,
          query,
        },
      )}
  />
{/snippet}

<SEOGeneratorLayout
  bind:this={seoLayoutRef}
  pageTitle={meta.pageTitle}
  metaDescription={meta.metaDescription}
  introTitle={meta.introTitle}
  eyebrow={meta.eyebrow}
  introText={meta.introText}
  canonicalPath={meta.canonicalPath}
  recoveryKey={meta.canonicalPath}
  ogImage={meta.ogImage}
  ogImageAlt={meta.ogImageAlt}
  keywords={meta.keywords ?? []}
  labels={meta.labels ?? []}
  faqs={meta.faqs ?? []}
  {relatedLinks}
  bind:theme={activeTheme}
  isThemeCustomizable={shouldSyncGeneratorTheme(slug)}
  supportsStreaming={isStreamableSlug(slug)}
  {generationReady}
  {generationSetupError}
  onRetryGenerationSetup={reloadAfterGeneratorSetupFailure}
  {generate}
  progressSteps={showsStagedProgress(slug) ? oneShotProgress : null}
  {initialDraft}
  initialDraftIsUserGenerated={Boolean(
    remixDraft || reloadedOutput || setupRecoveryOutputForPath,
  )}
  initialUseAI={setupRecoveryUseAI}
  initialUseAIPath={setupRecoveryPath}
  {backHref}
  {backLabel}
  variant={slug === "names" || slug === "fantasy-names" ? "names" : "default"}
  onGeneratePlotTwist={slug === "quest" || slug === "villain-scheme-generator"
    ? openPlotTwistFromQuest
    : undefined}
  onGenerateRoster={slug === "faction" ? openRosterFromFaction : undefined}
  onOpenMemberAsCharacter={slug === "faction-roster"
    ? openMemberAsCharacter
    : undefined}
  autoGenerateExplicit={slug === "faction-roster"}
  outputLead={isNamesPage ? quickNames : undefined}
  generateLabel={isNamesPage ? "Generate names with notes" : undefined}
  aiToggleScope={isNamesPage
    ? "Applies to Generate names with notes. Quick names has its own Ask AI."
    : undefined}
>
  {#snippet outputExtras(output, replaceOutput, useAI)}
    <GeneratorPageOutputExtras
      {slug}
      recoveryKey={meta.canonicalPath}
      {output}
      {useAI}
      onReplace={replaceOutput}
    />
  {/snippet}
  {#snippet formFields(trigger, isBusy)}
    <GeneratorPageFormFields
      {slug}
      bind:activeTheme
      {urlHubTheme}
      {trigger}
      {isBusy}
      bind:npc={forms.npc}
      bind:settlement={forms.settlement}
      bind:magicItem={forms.magicItem}
      bind:minorMagicItem={forms.minorMagicItem}
      bind:artifact={forms.artifact}
      bind:faction={forms.faction}
      bind:factionRoster={forms.factionRoster}
      bind:quest={forms.quest}
      bind:personality={forms.personality}
      bind:rumour={forms.rumour}
      bind:encounter={forms.encounter}
      bind:puzzle={forms.puzzle}
      bind:councilVote={forms.councilVote}
      bind:heist={forms.heist}
      bind:holiday={forms.holiday}
      bind:secretSociety={forms.secretSociety}
      bind:kingdom={forms.kingdom}
      bind:nation={forms.nation}
      bind:socialHub={forms.socialHub}
      bind:tavern={forms.tavern}
      bind:vampireClan={forms.vampireClan}
      bind:nomadClan={forms.nomadClan}
      bind:darkFaction={forms.darkFaction}
      bind:urbanFantasyFaction={forms.urbanFantasyFaction}
      bind:names={forms.names}
      bind:dndNpc={forms.dndNpc}
      bind:pantheon={forms.pantheon}
      bind:ship={forms.ship}
      bind:language={forms.language}
      bind:newsSheet={forms.newsSheet}
      bind:dungeon={forms.dungeon}
      bind:adventure={forms.adventure}
      bind:plotTwist={forms.plotTwist}
      bind:villain={forms.villain}
      bind:comicBookEvent={forms.comicBookEvent}
      bind:origin={forms.origin}
      bind:villainScheme={forms.villainScheme}
      bind:oneShot={forms.oneShot}
      bind:pointCrawl={forms.pointCrawl}
      bind:business={forms.business}
      bind:world={forms.world}
      bind:starSystem={forms.starSystem}
      bind:constellation={forms.constellation}
      bind:alienRace={forms.alienRace}
      bind:creature={forms.creature}
      bind:tome={forms.tome}
      bind:mysteryInvestigation={forms.mysteryInvestigation}
      onPersonalityGenreChange={genreHandlers.personality}
      onBusinessGenreChange={genreHandlers.business}
      onRumourGenreChange={genreHandlers.rumour}
      onPuzzleGenreChange={genreHandlers.puzzle}
      onShipGenreChange={genreHandlers.ship}
      onWorldGenreChange={genreHandlers.world}
      onStarSystemGenreChange={genreHandlers.starSystem}
      onAlienRaceGenreChange={genreHandlers.alienRace}
      onCreatureGenreChange={genreHandlers.creature}
    />
  {/snippet}
</SEOGeneratorLayout>
