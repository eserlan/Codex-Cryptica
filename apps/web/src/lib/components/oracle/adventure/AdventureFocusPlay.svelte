<!-- fallow-ignore-file complexity -- Existing full-screen play layout; discovery save wiring is covered by focused tests. -->
<!-- fallow-ignore-file css-broken-reference -- overflow-y-auto is a valid Tailwind utility; the class check misreads it. -->
<script lang="ts">
  import { tick } from "svelte";
  import { featureFlags } from "#lib/stores/feature-flags.svelte.js";
  import { KeyboardInset } from "#lib/services/help-assistant/keyboard-inset.svelte.js";
  import { bodyPortal, containTab } from "./adventure-phone-surface";
  import {
    deriveAdventureHeaderStatus,
    derivePhoneToolsSummary,
  } from "./adventure-header-state.js";
  import { batchFilterPromotableFacts } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import { extractActiveHeardScenarios } from "#lib/stores/oracle/adventure-scenarios.js";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type {
    AdventureListResult,
    AdventureSessionRepository,
  } from "#lib/services/adventure/adventure-session-repository.js";
  import {
    formatWorldElapsedMinutes,
    selectPendingAdventureCompletion,
    type ProvisionalFact,
  } from "@codex/adventure-engine";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureCompletionPanel from "./AdventureCompletionPanel.svelte";
  import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";
  import AdventurePackageAudit from "./AdventurePackageAudit.svelte";
  import AdventurePackageProgress from "./AdventurePackageProgress.svelte";
  import AdventureManagementMenu from "./AdventureManagementMenu.svelte";
  import AdventurePlay from "./AdventurePlay.svelte";
  import AdventureComposer from "./AdventureComposer.svelte";
  import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";
  import AdventureResourceCounters from "./AdventureResourceCounters.svelte";
  import AdventureRollHistory from "./AdventureRollHistory.svelte";
  import AdventureRollPrompt from "./AdventureRollPrompt.svelte";
  import AdventureSituationSettings from "./AdventureSituationSettings.svelte";
  import AdventureStateSummary from "./AdventureStateSummary.svelte";
  import AdventureScenarioControls from "./AdventureScenarioControls.svelte";
  import AdventureSituationsDialog from "./AdventureSituationsDialog.svelte";
  import AdventureArtworkFeature from "./artwork/AdventureArtworkFeature.svelte";
  import AdventureArtworkLightbox from "./artwork/AdventureArtworkLightbox.svelte";
  import {
    AdventureLightboxController,
    setAdventureLightbox,
  } from "./artwork/adventure-artwork-lightbox.svelte.js";
  import AdventureArtworkCueDetails from "./artwork/AdventureArtworkCueDetails.svelte";
  import ArtworkSettings from "./artwork/ArtworkSettings.svelte";
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
  import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import { createDisplayService } from "#lib/services/adventure/artwork/create-display-service.js";
  import { defaultArtworkCatalogue } from "#lib/services/adventure/artwork/default-artwork-catalogue.js";
  import { summarizeArtworkCues } from "#lib/services/adventure/artwork/artwork-cue-summary.js";
  import { artworkDemandReporter } from "#lib/services/adventure/artwork/artwork-demand-reporter.js";
  import { selectPresentNpcPortrait } from "#lib/services/adventure/artwork/npc-portrait-selection.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import {
    exitAdventureFullscreen,
    requestAdventureFullscreen,
  } from "./adventure-fullscreen";

  let {
    manager,
    existingTitles,
    onAddProvisionalFact,
    onAddAllProvisionalFacts,
    repository,
    vaultId,
    onResume,
    onResumeArchived,
  }: {
    manager: AdventureManager;
    existingTitles: string[];
    onAddProvisionalFact: (fact: ProvisionalFact) => Promise<void>;
    onAddAllProvisionalFacts?: (facts: ProvisionalFact[]) => Promise<void>;
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume: (sessionId: string) => Promise<void>;
    onResumeArchived: (sessionId: string) => Promise<void>;
  } = $props();

  // The archive and inline management controls mount together in the phone
  // sheet. Share their in-flight full listing so opening the sheet reads each
  // adventure file only once.
  let archiveListRequest: {
    vaultId: string;
    promise: Promise<AdventureListResult>;
  } | null = null;
  function listAdventureSessions(requestedVaultId: string, forceFresh = false) {
    if (!forceFresh && archiveListRequest?.vaultId === requestedVaultId)
      return archiveListRequest.promise;
    const promise = repository.list(requestedVaultId);
    archiveListRequest = { vaultId: requestedVaultId, promise };
    return promise;
  }

  function invalidateAdventureSessions(): void {
    archiveListRequest = null;
  }

  // Matches the surface's own `sm:` breakpoint for full-screen phone play.
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia?.("(max-width: 639px)");
    if (!query) return;
    phone = query.matches;
    const onChange = (event: MediaQueryListEvent) => (phone = event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  });
  // On Android Chrome and iOS Safari the keyboard overlays the page and
  // `100dvh` does not shrink, so pin the surface to the visible viewport.
  const keyboard = new KeyboardInset();
  $effect(() => {
    if (!phone) return;
    return keyboard.start();
  });
  // Android Chrome resizes the page for the keyboard itself
  // (`interactive-widget=resizes-content` in app.html), so `100dvh` already
  // ends above the keyboard and its toolbar and there is no gap to correct.
  // Browsers that still overlay the keyboard (iOS Safari) leave a gap between
  // the layout and visual viewports; pin to the visible area only then, even
  // when the gap is too small to count as a keyboard. Never apply a measured
  // height without a gap: a stale measurement would override the browser.
  const keyboardStyle = $derived(
    phone && keyboard.visibleHeight > 0 && keyboard.inset > 0
      ? `top: ${keyboard.offsetTop}px; height: ${keyboard.visibleHeight}px; bottom: auto;`
      : undefined,
  );
  const sceneDetailsMaxHeightPx = $derived(
    phone && keyboard.visibleHeight > 0 && keyboard.inset > 0
      ? Math.min(256, Math.max(80, Math.floor(keyboard.visibleHeight * 0.28)))
      : undefined,
  );

  // Phone play covers the app chrome: move focus in, keep it in, and give it
  // back on exit.
  $effect(() => {
    if (!phone || !focusElement) return;
    const surface = focusElement;
    const previous = document.activeElement;
    // Wait for the body portal to move the surface: re-parenting a focused
    // element drops its focus.
    void tick().then(() => {
      if (phone && !surface.contains(document.activeElement)) {
        surface.querySelector<HTMLElement>("button")?.focus();
      }
    });
    return () => {
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        (surface.contains(document.activeElement) ||
          document.activeElement === document.body)
      ) {
        previous.focus();
      }
    };
  });

  const artworkLightbox = setAdventureLightbox(
    new AdventureLightboxController(),
  );
  let utilitiesOpen = $state(false);
  let toolsButton = $state<HTMLButtonElement>();
  let toolsCloseButton = $state<HTMLButtonElement>();
  let utilitiesSheet = $state<HTMLElement>();
  let focusElement = $state<HTMLElement>();
  let fullscreenElement = $state<Element | null>(null);
  let fullscreenTransitioning = $state(false);
  let playViewport = $state<HTMLElement>();
  let dismissedCompletionIds = $state<string[]>([]);
  let completionActionBusy = $state(false);
  const rawPendingCompletion = $derived(
    manager.session &&
      manager.phase !== "generating" &&
      !manager.streamedNarration &&
      !manager.session.pendingRoll
      ? selectPendingAdventureCompletion(manager.session)
      : null,
  );
  const pendingCompletion = $derived(
    rawPendingCompletion &&
      !dismissedCompletionIds.includes(rawPendingCompletion.eventId)
      ? rawPendingCompletion
      : null,
  );

  async function dismissCompletion(eventId: string): Promise<void> {
    if (!dismissedCompletionIds.includes(eventId)) {
      dismissedCompletionIds = [...dismissedCompletionIds, eventId];
    }
    if (manager.readOnly) return;
    try {
      await manager.acknowledgeCompletion(eventId);
    } catch {
      // Dismissal remains non-destructive in the current view even if a concurrent save occurred.
    }
  }

  async function handleFindAnotherFromCompletion(
    eventId: string,
  ): Promise<void> {
    if (completionActionBusy) return;
    completionActionBusy = true;
    try {
      await dismissCompletion(eventId);
      await manager.close();
    } finally {
      completionActionBusy = false;
    }
  }

  async function handleFinishFromCompletion(eventId: string): Promise<void> {
    if (completionActionBusy) return;
    completionActionBusy = true;
    try {
      await dismissCompletion(eventId);
      await manager.end();
    } finally {
      completionActionBusy = false;
    }
  }
  const isFullscreen = $derived(fullscreenElement === focusElement);
  const transcriptLength = $derived(manager.transcript?.turns.length ?? 0);
  const elapsedLabel = $derived(
    manager.session?.worldTime
      ? formatWorldElapsedMinutes(manager.session.worldTime.elapsedMinutes)
      : null,
  );
  const adventureTitle = $derived(manager.session?.title ?? "Adventure");
  const pendingDiscoveriesCount = $derived(
    batchFilterPromotableFacts(
      manager.session?.provisionalFacts ?? [],
      existingTitles,
      manager.session?.dismissedProvisionalFactIds ?? [],
    ).length,
  );
  const activeSituationsCount = $derived(
    extractActiveHeardScenarios(manager.session).length,
  );
  const headerStatus = $derived(
    deriveAdventureHeaderStatus({
      readOnly: manager.readOnly,
      phase: manager.phase,
      pendingRoll: manager.session?.pendingRoll,
      elapsedLabel,
    }),
  );
  const phoneToolsSummary = $derived(
    derivePhoneToolsSummary({
      discoveriesCount: pendingDiscoveriesCount,
      situationsCount: activeSituationsCount,
      readOnly: manager.readOnly,
    }),
  );
  const pendingRollId = $derived(manager.session?.pendingRoll?.id ?? null);
  const oocEventVersion = $derived(
    (manager.oocExchanges ?? manager.session?.oocExchanges ?? [])
      .map((item) => `${item.id}:${item.status}`)
      .join(","),
  );
  const visibleEventVersion = $derived(
    `${transcriptLength}:${manager.phase}:${pendingRollId ?? ""}:${manager.streamedNarration?.length ?? 0}:${oocEventVersion}:${manager.oocGenerating ? "1" : "0"}`,
  );

  type AdventurePortraitProp = {
    name: string;
    src: string | null | undefined;
    alt: string;
    aiLabel?: string;
    credits?: string;
    description?: string;
    loadFull?: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
  };

  const artworkFlagEnabled = $derived(
    featureFlags.isEnabled("adventureArtwork"),
  );
  let artworkEnabled = $state(artworkPreferences.enabled);
  let artworkCatalogue = $state<readonly ArtworkAsset[]>([]);
  let artworkDisplay = $state<ArtworkDisplayService>();
  let npcPortrait = $state<AdventurePortraitProp | null>(null);

  $effect(() => {
    artworkEnabled = artworkPreferences.enabled;
    return artworkPreferences.subscribe((value) => {
      artworkEnabled = value;
    });
  });

  $effect(() => {
    if (!artworkFlagEnabled) {
      artworkDisplay = undefined;
      artworkCatalogue = [];
      return;
    }
    let active = true;
    let resources: ReturnType<typeof createDisplayService> | undefined;
    try {
      resources = createDisplayService(artworkPreferences);
      artworkDisplay = resources.display;
    } catch {
      /* Private Vault images still work. */
    }
    void defaultArtworkCatalogue.get().then((assets) => {
      if (active && assets) artworkCatalogue = assets;
    });
    return () => {
      active = false;
      resources?.destroy();
    };
  });

  const selectedNpcPortrait = $derived(
    artworkFlagEnabled
      ? selectPresentNpcPortrait(
          manager.session,
          vault.activeVaultId,
          vault.entities,
          artworkEnabled,
          themeStore.worldThemeId,
          artworkCatalogue,
        )
      : null,
  );

  const cueSummary = $derived(
    artworkFlagEnabled
      ? summarizeArtworkCues(
          manager.session,
          vault.activeVaultId,
          vault.entities,
          artworkEnabled,
          themeStore.worldThemeId,
          artworkCatalogue,
        )
      : null,
  );

  $effect(() => {
    artworkDemandReporter.reportFromSummary(
      cueSummary,
      manager.session?.id ?? null,
    );
  });

  $effect(() => {
    const selection = selectedNpcPortrait;
    const display = artworkDisplay;
    if (!selection) {
      npcPortrait = null;
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let owned: ArtworkBlobHandle | null = null;
    npcPortrait = null;

    if (selection.kind === "vault") {
      void vault
        .resolveImageUrl(selection.image)
        .then((url) => {
          if (cancelled || !url) return;
          npcPortrait = {
            name: selection.name,
            src: url,
            alt: selection.alt,
            description: selection.description,
          };
        })
        .catch(() => {});
    } else if (display) {
      void display
        .load(selection.asset, controller.signal, "preview")
        .then((handle) => {
          if (cancelled || controller.signal.aborted) {
            handle?.release();
            return;
          }
          if (!handle) return;
          owned = handle;
          npcPortrait = {
            name: selection.name,
            src: handle.url,
            alt: selection.alt,
            aiLabel: selection.aiLabel,
            credits: selection.credits,
            description: selection.description,
            loadFull: (signal) =>
              display.load(selection.asset, signal, "display"),
          };
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      controller.abort();
      owned?.release();
    };
  });

  $effect.pre(() => {
    // These are the player-visible events that can add content below the
    // current viewport: a new turn, generation state, or a pending roll.
    const _event = visibleEventVersion;
    if (!playViewport) return;
    void tick().then(() => {
      if (!playViewport) return;
      const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches
        ? "auto"
        : "smooth";
      playViewport.scrollTo?.({ top: playViewport.scrollHeight, behavior });
    });
  });

  function openTools(): void {
    utilitiesOpen = true;
    void tick().then(() => toolsCloseButton?.focus());
  }

  function closeTools(): void {
    utilitiesOpen = false;
    archiveListRequest = null;
    toolsButton?.focus();
  }

  function toggleTools(): void {
    if (utilitiesOpen) {
      closeTools();
    } else {
      openTools();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (!utilitiesOpen || event.key !== "Escape" || event.defaultPrevented) {
      return;
    }
    // ui-check-ignore: The full-screen phone surface already traps Tab with containTab.
    if (focusElement?.querySelector('[role="dialog"][aria-modal="true"]')) {
      return;
    }
    event.preventDefault();
    closeTools();
  }

  async function enterFullscreen(): Promise<void> {
    const entered = await requestAdventureFullscreen(focusElement);
    if (!entered) {
      notificationStore.notify(
        "Fullscreen is not available in this browser.",
        "info",
      );
    }
  }

  async function toggleFullscreen(): Promise<void> {
    if (fullscreenTransitioning) return;
    fullscreenTransitioning = true;

    try {
      if (isFullscreen) {
        await exitAdventureFullscreen(document);
        return;
      }
      await enterFullscreen();
    } finally {
      fullscreenTransitioning = false;
    }
  }
</script>

<svelte:document bind:fullscreenElement />
<svelte:window onkeydown={handleWindowKeydown} />

{#snippet adventureControls(inToolsSheet: boolean)}
  <AdventureProvisionalFacts
    variant={inToolsSheet ? "sheet" : "header"}
    overlayHost={inToolsSheet ? focusElement : undefined}
    facts={manager.session?.provisionalFacts ?? []}
    dismissedIds={manager.session?.dismissedProvisionalFactIds ?? []}
    onDismiss={(ids) => manager.dismissDiscoveries(ids).then(() => {})}
    canDismiss={!manager.readOnly &&
      manager.phase !== "generating" &&
      !manager.session?.pendingRoll}
    {existingTitles}
    onAdd={onAddProvisionalFact}
    onAddAll={onAddAllProvisionalFacts}
  />
  <AdventureSituationsDialog
    variant={inToolsSheet ? "sheet" : "header"}
    overlayHost={inToolsSheet ? focusElement : undefined}
    {manager}
    onAction={inToolsSheet ? closeTools : undefined}
  />
{/snippet}

{#snippet utilities()}
  {#if artworkFlagEnabled}
    <ArtworkSettings preferences={artworkPreferences} />
    <AdventureArtworkCueDetails summary={cueSummary} />
  {/if}
  <AdventurePackageProgress {manager} />
  <AdventurePackageAudit {manager} />
  <AdventureSituationSettings {manager} onAction={closeTools} />
  <AdventureCorrectionForm {manager} />
  <AdventureRollHistory {manager} />
  <AdventureResourceCounters {manager} />
  <AdventureArchive
    {repository}
    {vaultId}
    {onResume}
    {onResumeArchived}
    listEntries={listAdventureSessions}
  />
{/snippet}

<section
  bind:this={focusElement}
  use:bodyPortal={phone}
  class="@container fixed inset-0 z-[100] flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-theme-bg sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:min-h-[65vh] sm:flex-1"
  style={keyboardStyle}
  role={phone ? "dialog" : undefined}
  aria-modal={phone ? "true" : undefined}
  aria-labelledby="adventure-heading"
  data-testid="adventure-play-surface"
  onkeydown={(event) => {
    if (phone && focusElement) containTab(event, focusElement);
  }}
>
  <header
    class="flex shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <button
        type="button"
        class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:min-h-10 sm:min-w-10"
        onclick={() => void manager.close()}
        title="Leave adventure (saves automatically)"
        aria-label="Leave adventure"
      >
        <span aria-hidden="true" class="icon-[lucide--arrow-left] h-4 w-4"
        ></span>
      </button>
      <div class="min-w-0 flex-1">
        <h2
          id="adventure-heading"
          class="font-header truncate text-base font-bold leading-tight text-theme-text sm:text-lg"
          title={adventureTitle}
          aria-label={adventureTitle}
        >
          {adventureTitle}
        </h2>
        <p
          class={[
            "flex items-center gap-1.5 truncate text-xs font-medium sm:block sm:text-sm sm:font-normal",
            phone && headerStatus.tone === "danger"
              ? "text-theme-text"
              : "text-theme-text",
          ]}
          data-testid="adventure-header-status"
        >
          {#if phone}
            <span
              class={[
                "inline-flex min-w-0 items-center gap-1.5 truncate",
                headerStatus.tone === "primary"
                  ? "rounded bg-theme-primary/15 px-1.5 py-0.5 font-semibold"
                  : "",
              ]}
            >
              {#if headerStatus.icon}
                <span
                  aria-hidden="true"
                  class={[
                    headerStatus.icon,
                    "h-3.5 w-3.5 shrink-0",
                    headerStatus.busy
                      ? "animate-spin motion-reduce:animate-none"
                      : "",
                  ]}
                ></span>
              {/if}
              <span class="min-w-0 truncate">{headerStatus.phoneLabel}</span>
            </span>
          {:else}
            {headerStatus.desktopLabel}
            {#if elapsedLabel}
              <span
                class="ml-2 normal-case tracking-normal"
                title="Elapsed fictional time since the adventure began"
              >
                · {elapsedLabel} elapsed
              </span>
            {/if}
          {/if}
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      {#if !phone}
        <div class="hidden sm:contents">
          {@render adventureControls(false)}
        </div>
      {/if}
      <button
        bind:this={toolsButton}
        class="relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text px-2 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:min-h-12 sm:px-3"
        type="button"
        aria-label={phone ? phoneToolsSummary.ariaLabel : "Adventure tools"}
        title={phone ? phoneToolsSummary.ariaLabel : "Adventure tools"}
        aria-controls="adventure-utilities"
        aria-expanded={utilitiesOpen}
        onclick={toggleTools}
      >
        <span class="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            class={[
              phone
                ? "icon-[lucide--more-vertical]"
                : "icon-[lucide--panel-right]",
              "h-4 w-4",
            ]}
          ></span>
          <span class="hidden sm:inline">Adventure tools</span>
        </span>
        {#if phone && phoneToolsSummary.badgeText}
          <span
            aria-hidden="true"
            data-testid="adventure-tools-badge"
            class={[
              "pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold leading-none tabular-nums",
              phoneToolsSummary.badgeTone === "danger"
                ? "border border-theme-border-interactive bg-theme-surface text-theme-text"
                : "bg-theme-primary text-theme-on-primary",
            ]}
          >
            {phoneToolsSummary.badgeText}
          </span>
        {:else if phone && phoneToolsSummary.badgeTone === "danger"}
          <span
            aria-hidden="true"
            data-testid="adventure-tools-urgent-dot"
            class="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full border border-theme-text bg-theme-danger"
          ></span>
        {/if}
      </button>
      {#if !phone}
        <div class="hidden sm:contents">
          <button
            class="hidden min-h-12 items-center gap-2 rounded-md border border-theme-text px-3 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:inline-flex"
            type="button"
            aria-label={isFullscreen ? "Fullscreen active" : "Fullscreen"}
            aria-pressed={isFullscreen}
            disabled={fullscreenTransitioning}
            onclick={() => void toggleFullscreen()}
          >
            <span class="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                class={isFullscreen
                  ? "icon-[lucide--minimize-2] h-4 w-4"
                  : "icon-[lucide--maximize-2] h-4 w-4"}
              ></span>
              {isFullscreen ? "Fullscreen active" : "Fullscreen"}
            </span>
          </button>
          <AdventureManagementMenu
            {manager}
            {repository}
            {vaultId}
            listEntries={listAdventureSessions}
            onSwitch={onResume}
            onAction={invalidateAdventureSessions}
          />
        </div>
      {/if}
    </div>
    {#if phone}
      <div
        class="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="adventure-phone-live-status"
      >
        {phoneToolsSummary.liveAnnouncement}
      </div>
    {/if}
  </header>

  {#if manager.session && manager.recap}
    <!-- Narrow surfaces: the scene strip is pinned above the transcript. -->
    <div class="shrink-0 @4xl:hidden" data-testid="adventure-scene-strip-wrap">
      <AdventureStateSummary
        {manager}
        maxExpandedHeightPx={sceneDetailsMaxHeightPx}
      />
    </div>
  {/if}

  <div class="flex min-h-0 flex-1 flex-col @4xl:flex-row">
    {#if manager.session && manager.recap}
      <aside
        aria-label="Current scene"
        data-testid="adventure-artwork-panel"
        class="adventure-scrollbar hidden @4xl:block @4xl:w-80 @4xl:shrink-0 @4xl:overflow-y-auto @4xl:border-r @4xl:border-theme-border @4xl:bg-theme-surface/40 @4xl:p-4 @6xl:w-96"
      >
        <AdventureStateSummary {manager} variant="panel">
          {#snippet media()}
            {#if artworkFlagEnabled}
              <AdventureArtworkFeature
                session={manager.session}
                entities={vault.entities}
                activeVaultId={vault.activeVaultId}
                resolve={(path) => vault.resolveImageUrl(path)}
                readOnly={manager.readOnly ||
                  (manager.phase !== "ready" && manager.phase !== "offline")}
                theme={themeStore.worldThemeId}
                mutate={(...args) => manager.mutateLocalArtwork(...args)}
                portrait={npcPortrait}
              />
            {/if}
          {/snippet}
        </AdventureStateSummary>
      </aside>
    {/if}
    <div
      class="flex min-h-0 min-w-0 flex-1 flex-col"
      data-testid="adventure-play-column"
    >
      <!-- fallow-ignore-next-line css-broken-reference -->
      <main
        class="adventure-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-4 @4xl:p-6"
        bind:this={playViewport}
        data-testid="adventure-play-viewport"
      >
        <div class="mx-auto max-w-3xl space-y-4">
          <AdventureScenarioControls {manager} />
          <AdventurePlay {manager} showComposer={false} />
          <AdventureRollPrompt {manager} />
          {#if pendingCompletion}
            <AdventureCompletionPanel
              completion={pendingCompletion}
              readOnly={manager.readOnly}
              busy={completionActionBusy}
              onContinue={() => dismissCompletion(pendingCompletion.eventId)}
              onFindAnother={() =>
                handleFindAnotherFromCompletion(pendingCompletion.eventId)}
              onFinish={() =>
                handleFinishFromCompletion(pendingCompletion.eventId)}
            />
          {/if}
        </div>
      </main>
      <!-- The composer stays outside the story scroll, visible above the keyboard
         and mobile safe area. Never remount it across generation/roll phases. -->
      <AdventureComposer
        {manager}
        {phone}
        keyboardOpen={keyboard.keyboardOpen}
        suggestionChips={!phone}
        overlayHost={focusElement}
      />
    </div>
  </div>

  <!-- Portaled to <body> so the fixed lightbox always covers the viewport and
       never depends on the surface (a size container) as an ancestor. -->
  <div class="contents" use:bodyPortal={true}>
    <AdventureArtworkLightbox controller={artworkLightbox} />
  </div>

  <!-- No viewport breakpoints for side-by-side layout: this surface is often
       hosted in the app's own (already-narrow) sidebar panel, where a viewport
       breakpoint still fires. The scene panel uses a container query on the
       surface's own width; the tools stay a bottom sheet anchored to this
       section's bounds, correct however wide the host is. -->
  {#if utilitiesOpen}
    <button
      type="button"
      class="absolute inset-0 z-20 bg-theme-bg/70"
      aria-label="Close adventure tools"
      onclick={closeTools}
    ></button>
    <!-- fallow-ignore-next-line css-broken-reference -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <aside
      bind:this={utilitiesSheet}
      class="adventure-scrollbar absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-y-auto rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
      id="adventure-utilities"
      aria-label="Adventure tools"
      onkeydown={(event) => {
        if (phone && utilitiesSheet) containTab(event, utilitiesSheet);
      }}
    >
      <div class="mb-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-header text-base font-bold text-theme-text">
            Adventure tools
          </h3>
          {#if phone}
            <p
              class="mt-0.5 break-words text-xs text-theme-text"
              data-testid="adventure-tools-full-title"
            >
              {adventureTitle}
            </p>
          {/if}
        </div>
        <button
          bind:this={toolsCloseButton}
          type="button"
          class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
          aria-label="Close adventure tools"
          onclick={closeTools}
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>
      {#if phone}
        <div
          class="mb-4 space-y-2 border-b border-theme-border pb-4"
          data-testid="adventure-tools-mobile-controls"
        >
          {@render adventureControls(true)}
          <button
            class="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-theme-text px-3 py-2 text-sm font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
            type="button"
            aria-label={isFullscreen ? "Fullscreen active" : "Fullscreen"}
            aria-pressed={isFullscreen}
            disabled={fullscreenTransitioning}
            onclick={() => void toggleFullscreen()}
          >
            <span class="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                class={[
                  isFullscreen
                    ? "icon-[lucide--minimize-2]"
                    : "icon-[lucide--maximize-2]",
                  "h-4 w-4 shrink-0",
                ]}
              ></span>
              <span>{isFullscreen ? "Fullscreen active" : "Fullscreen"}</span>
            </span>
          </button>
          <AdventureManagementMenu
            variant="inline"
            {manager}
            {repository}
            {vaultId}
            listEntries={listAdventureSessions}
            onSwitch={onResume}
            onAction={closeTools}
          />
        </div>
      {/if}
      <div class="space-y-4">{@render utilities()}</div>
    </aside>
  {/if}
</section>

<style>
  /* Native, theme-aware scrollbars for independently scrolling Adventure panes.
     Keep this scoped to play rather than overriding scrollbars across the app. */
  .adventure-scrollbar {
    --adventure-scrollbar-track: var(--color-bg-primary);
    --adventure-scrollbar-thumb: color-mix(
      in srgb,
      var(--color-accent-primary) 80%,
      var(--color-bg-surface)
    );
    --adventure-scrollbar-thumb-hover: color-mix(
      in srgb,
      var(--color-accent-primary) 90%,
      var(--color-bg-surface)
    );

    scrollbar-width: thin;
    scrollbar-color: var(--adventure-scrollbar-thumb)
      var(--adventure-scrollbar-track);
  }

  /* Fallback for engines without the standard scrollbar properties. */
  .adventure-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .adventure-scrollbar::-webkit-scrollbar-track {
    background: var(--adventure-scrollbar-track);
  }

  .adventure-scrollbar::-webkit-scrollbar-thumb {
    background: var(--adventure-scrollbar-thumb);
    border-radius: 9999px;
  }

  .adventure-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--adventure-scrollbar-thumb-hover);
  }

  @media (forced-colors: active) {
    .adventure-scrollbar {
      scrollbar-color: auto;
      scrollbar-width: auto;
    }

    .adventure-scrollbar::-webkit-scrollbar,
    .adventure-scrollbar::-webkit-scrollbar-track,
    .adventure-scrollbar::-webkit-scrollbar-thumb,
    .adventure-scrollbar::-webkit-scrollbar-thumb:hover {
      all: revert;
    }
  }
</style>
