<script lang="ts">
  import { tick } from "svelte";
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
  <AdventureSituationSettings {manager} onAction={closeTools} />
  <AdventureCorrectionForm {manager} />
  <AdventureRollHistory {manager} />
  <AdventureResourceCounters {manager} />
  <AdventureArchive {repository} {vaultId} {onResume} {onResumeArchived} />
{/snippet}

<section
  bind:this={focusElement}
  use:bodyPortal={phone}
  class="fixed inset-0 z-[100] flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-theme-bg sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:min-h-[65vh] sm:flex-1"
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
        {existingTitles}
        onAdd={onAddProvisionalFact}
        onAddAll={onAddAllProvisionalFacts}
      />
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

  <div class="flex min-h-0 flex-1 flex-col">
    <!-- fallow-ignore-next-line css-broken-reference -->
    <main
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-4 lg:p-6"
      bind:this={playViewport}
      data-testid="adventure-play-viewport"
    >
      <div class="mx-auto max-w-3xl space-y-4">
        <AdventureStateSummary {manager} />
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

  <!-- A bottom sheet rather than a side-by-side aside: this surface is often
       hosted in the app's own (already-narrow) sidebar panel, where a lg:
       viewport breakpoint still fires even though the actual container is
       far from lg-wide, splitting the layout into two cramped columns. A
       sheet anchored to this section's own bounds is correct regardless of
       how wide the host container actually is. -->
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
