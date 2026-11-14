<!-- fallow-ignore-file complexity -- Existing full-screen play layout; discovery save wiring is covered by focused tests. -->
<!-- fallow-ignore-file css-broken-reference -- overflow-y-auto is a valid Tailwind utility; the class check misreads it. -->
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { KeyboardInset } from "#lib/services/help-assistant/keyboard-inset.svelte.js";
  import { bodyPortal, containTab } from "./adventure-phone-surface";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { AdventureSessionRepository } from "#lib/services/adventure/adventure-session-repository.js";
  import {
    formatWorldElapsedMinutes,
    type ProvisionalFact,
  } from "@codex/adventure-engine";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";
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
  import ArtworkSettings from "./artwork/ArtworkSettings.svelte";
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
  import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import { createDisplayService } from "#lib/services/adventure/artwork/create-display-service.js";
  import { defaultArtworkCatalogue } from "#lib/services/adventure/artwork/default-artwork-catalogue.js";
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
  let focusElement = $state<HTMLElement>();
  let fullscreenElement = $state<Element | null>(null);
  let fullscreenTransitioning = $state(false);
  let playViewport = $state<HTMLElement>();
  const isFullscreen = $derived(fullscreenElement === focusElement);
  const transcriptLength = $derived(manager.transcript?.turns.length ?? 0);
  const elapsedLabel = $derived(
    manager.session?.worldTime
      ? formatWorldElapsedMinutes(manager.session.worldTime.elapsedMinutes)
      : null,
  );
  const pendingRollId = $derived(manager.session?.pendingRoll?.id ?? null);
  const visibleEventVersion = $derived(
    `${transcriptLength}:${manager.phase}:${pendingRollId ?? ""}:${manager.streamedNarration?.length ?? 0}`,
  );

  type AdventurePortraitProp = {
    name: string;
    src: string | null | undefined;
    alt: string;
    aiLabel?: string;
    credits?: string;
    loadFull?: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
  };

  const artworkFlagEnabled = import.meta.env.VITE_ADVENTURE_ARTWORK === "true";
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

  onMount(() => {
    if (!artworkFlagEnabled) return;
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

  function closeTools(): void {
    utilitiesOpen = false;
    toolsButton?.focus();
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
<svelte:window
  onkeydown={(event) => utilitiesOpen && event.key === "Escape" && closeTools()}
/>

{#snippet utilities()}
  {#if import.meta.env.VITE_ADVENTURE_ARTWORK === "true"}
    <ArtworkSettings preferences={artworkPreferences} />
  {/if}
  <AdventureSituationSettings {manager} onAction={closeTools} />
  <AdventureCorrectionForm {manager} />
  <AdventureRollHistory {manager} />
  <AdventureResourceCounters {manager} />
  <AdventureArchive {repository} {vaultId} {onResume} {onResumeArchived} />
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
    class="flex shrink-0 items-center gap-2 border-b border-theme-border bg-theme-surface px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:flex-wrap sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <button
        type="button"
        class="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-theme-border text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
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
          title={manager.session?.title ?? "Adventure"}
        >
          {manager.session?.title ?? "Adventure"}
        </h2>
        <p
          class="truncate text-xs uppercase tracking-wide text-theme-text sm:text-sm sm:normal-case sm:tracking-normal"
        >
          {manager.readOnly
            ? "Read-only in this tab"
            : manager.phase === "offline"
              ? "Waiting for connection"
              : manager.phase}
          {#if elapsedLabel}
            <span
              class="ml-2 normal-case tracking-normal"
              title="Elapsed fictional time since the adventure began"
            >
              · {elapsedLabel} elapsed
            </span>
          {/if}
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      <AdventureProvisionalFacts
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
      <AdventureSituationsDialog {manager} />
      <button
        bind:this={toolsButton}
        class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-border px-2 text-theme-text transition sm:min-h-12 sm:px-3 hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        type="button"
        aria-label="Adventure tools"
        title="Adventure tools"
        aria-controls="adventure-utilities"
        aria-expanded={utilitiesOpen}
        onclick={() => (utilitiesOpen = !utilitiesOpen)}
      >
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true" class="icon-[lucide--panel-right] h-4 w-4"
          ></span>
          <span class="hidden sm:inline">Adventure tools</span>
        </span>
      </button>
      <button
        class="hidden min-h-12 items-center gap-2 rounded-md border border-theme-border px-3 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:inline-flex"
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
        onSwitch={onResume}
      />
    </div>
  </header>

  {#if manager.session && manager.recap}
    <!-- Narrow surfaces: the scene strip is pinned above the transcript. -->
    <div
      class="shrink-0 px-3 pt-3 @4xl:hidden"
      data-testid="adventure-scene-strip-wrap"
    >
      <AdventureStateSummary {manager} />
    </div>
  {/if}

  <div class="flex min-h-0 flex-1 flex-col @4xl:flex-row">
    {#if manager.session && manager.recap}
      <aside
        aria-label="Current scene"
        data-testid="adventure-artwork-panel"
        class="hidden @4xl:block @4xl:w-80 @4xl:shrink-0 @4xl:overflow-y-auto @4xl:border-r @4xl:border-theme-border @4xl:bg-theme-surface/40 @4xl:p-4 @6xl:w-96"
      >
        <AdventureStateSummary {manager} variant="panel">
          {#snippet media()}
            {#if import.meta.env.VITE_ADVENTURE_ARTWORK === "true"}
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
    <!-- fallow-ignore-next-line css-broken-reference -->
    <main
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-4 @4xl:p-6"
      bind:this={playViewport}
      data-testid="adventure-play-viewport"
    >
      <div class="mx-auto max-w-3xl space-y-4">
        <AdventureScenarioControls {manager} />
        <AdventurePlay {manager} showComposer={false} />
        <AdventureRollPrompt {manager} />
      </div>
    </main>
  </div>

  <!-- The composer stays outside the story scroll, visible above the keyboard
       and mobile safe area. Never remount it across generation/roll phases. -->
  <AdventureComposer
    {manager}
    {phone}
    keyboardOpen={keyboard.keyboardOpen}
    suggestionChips={!phone}
  />

  <AdventureArtworkLightbox controller={artworkLightbox} />

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
    <aside
      class="absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-y-auto rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
      id="adventure-utilities"
      aria-label="Adventure tools"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="font-header text-base font-bold text-theme-text">
          Adventure tools
        </h3>
        <button
          type="button"
          class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-border text-theme-text transition hover:bg-theme-primary/10"
          aria-label="Close adventure tools"
          onclick={closeTools}
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>
      <div class="space-y-4">{@render utilities()}</div>
    </aside>
  {/if}
</section>
