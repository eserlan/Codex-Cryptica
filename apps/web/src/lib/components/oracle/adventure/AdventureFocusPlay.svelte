<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import type { AdventureSessionRepository } from "$lib/services/adventure/adventure-session-repository";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";
  import AdventureManagementMenu from "./AdventureManagementMenu.svelte";
  import AdventurePlay from "./AdventurePlay.svelte";
  import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";
  import AdventureResourceCounters from "./AdventureResourceCounters.svelte";
  import AdventureRollHistory from "./AdventureRollHistory.svelte";
  import AdventureRollPrompt from "./AdventureRollPrompt.svelte";
  import AdventureStateSummary from "./AdventureStateSummary.svelte";
  import {
    exitAdventureFullscreen,
    requestAdventureFullscreen,
  } from "./adventure-fullscreen";

  let {
    manager,
    existingTitles,
    onAddProvisionalFact,
    repository,
    vaultId,
    onResume,
    onResumeArchived,
  }: {
    manager: AdventureManager;
    existingTitles: string[];
    onAddProvisionalFact: (fact: ProvisionalFact) => Promise<void>;
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume: (sessionId: string) => Promise<void>;
    onResumeArchived: (sessionId: string) => Promise<void>;
  } = $props();

  let utilitiesOpen = $state(false);
  let toolsButton = $state<HTMLButtonElement>();
  let focusElement = $state<HTMLElement>();
  let fullscreenElement = $state<Element | null>(null);
  let fullscreenTransitioning = $state(false);
  let playViewport = $state<HTMLElement>();
  const isFullscreen = $derived(fullscreenElement === focusElement);
  const transcriptLength = $derived(manager.transcript?.turns.length ?? 0);
  const pendingRollId = $derived(manager.session?.pendingRoll?.id ?? null);
  const visibleEventVersion = $derived(
    `${transcriptLength}:${manager.phase}:${pendingRollId ?? ""}`,
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
      playViewport.scrollTo({ top: playViewport.scrollHeight, behavior });
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
  <AdventureCorrectionForm {manager} />
  <AdventureRollHistory {manager} />
  <AdventureResourceCounters {manager} />
  <AdventureProvisionalFacts
    facts={manager.session?.provisionalFacts ?? []}
    {existingTitles}
    onAdd={onAddProvisionalFact}
  />
  <AdventureArchive {repository} {vaultId} {onResume} {onResumeArchived} />
{/snippet}

<section
  bind:this={focusElement}
  class="relative flex min-h-0 flex-1 flex-col bg-theme-bg"
  aria-labelledby="adventure-heading"
  data-testid="adventure-play-surface"
>
  <header
    class="flex flex-wrap items-center justify-between gap-3 border-b border-theme-border bg-theme-surface px-4 py-3"
  >
    <div>
      <h2
        id="adventure-heading"
        class="font-header text-lg font-bold text-theme-text"
      >
        {manager.session?.title ?? "Adventure"}
      </h2>
      <p class="text-sm text-theme-muted">
        {manager.readOnly
          ? "Read-only in this tab"
          : manager.phase === "offline"
            ? "Waiting for connection"
            : manager.phase}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        bind:this={toolsButton}
        class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        type="button"
        aria-controls="adventure-utilities"
        aria-expanded={utilitiesOpen}
        onclick={() => (utilitiesOpen = !utilitiesOpen)}
      >
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true" class="icon-[lucide--panel-right] h-4 w-4"
          ></span>
          Adventure tools
        </span>
      </button>
      <button
        class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        type="button"
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
      <AdventureManagementMenu {manager} />
    </div>
  </header>

  <div class="flex min-h-0 flex-1 flex-col">
    <main
      bind:this={playViewport}
      class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6"
      data-testid="adventure-play-viewport"
    >
      <div class="mx-auto max-w-3xl space-y-4">
        <AdventureStateSummary {manager} />
        <AdventurePlay {manager} />
        <AdventureRollPrompt {manager} />
      </div>
    </main>
  </div>

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
    <aside
      id="adventure-utilities"
      class="absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-y-auto rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
      aria-label="Adventure tools"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="font-header text-base font-bold text-theme-text">
          Adventure tools
        </h3>
        <button
          type="button"
          class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-border text-theme-primary transition hover:bg-theme-primary/10"
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
