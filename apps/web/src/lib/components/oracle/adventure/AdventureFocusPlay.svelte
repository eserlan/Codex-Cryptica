<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import type { AdventureSessionRepository } from "$lib/services/adventure/adventure-session-repository";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";
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

  let focusMode = $state(false);
  let utilitiesOpen = $state(true);
  let focusElement = $state<HTMLElement>();
  let fullscreenElement = $state<Element | null>(null);
  let fullscreenTransitioning = $state(false);
  const isFullscreen = $derived(fullscreenElement === focusElement);

  async function enterFullscreen(): Promise<void> {
    const entered = await requestAdventureFullscreen(focusElement);
    if (!entered) {
      notificationStore.notify(
        "Fullscreen is not available in this browser. Focus Mode is still on.",
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

  async function leaveFocusMode(): Promise<void> {
    if (fullscreenTransitioning) return;
    fullscreenTransitioning = true;

    try {
      await exitAdventureFullscreen(document);
      focusMode = false;
    } finally {
      fullscreenTransitioning = false;
    }
  }
</script>

<svelte:document bind:fullscreenElement />

{#snippet utilities()}
  <AdventureStateSummary {manager} />
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

{#if focusMode}
  <section
    bind:this={focusElement}
    class="flex min-h-0 flex-1 flex-col bg-theme-bg"
    aria-labelledby="adventure-focus-heading"
    data-testid="adventure-focus-mode"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-theme-border bg-theme-surface px-4 py-3"
    >
      <div>
        <h2
          id="adventure-focus-heading"
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
        <button
          class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
          type="button"
          disabled={fullscreenTransitioning}
          onclick={() => void leaveFocusMode()}
        >
          <span class="inline-flex items-center gap-2">
            <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
            Exit Focus Mode
          </span>
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <main class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div class="mx-auto max-w-3xl space-y-4">
          <AdventurePlay {manager} showHeader={false} />
          <AdventureRollPrompt {manager} />
        </div>
      </main>
      <aside
        id="adventure-utilities"
        class="border-t border-theme-border bg-theme-surface/70 p-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l {utilitiesOpen
          ? 'block'
          : 'hidden'}"
        aria-label="Adventure tools"
      >
        <div class="space-y-4">{@render utilities()}</div>
      </aside>
    </div>
  </section>
{:else}
  <AdventureStateSummary {manager} />
  <AdventureCorrectionForm {manager} />
  <AdventurePlay {manager} onEnterFocus={() => (focusMode = true)} />
  <AdventureRollPrompt {manager} />
  <AdventureRollHistory {manager} />
  <AdventureResourceCounters {manager} />
  <AdventureProvisionalFacts
    facts={manager.session?.provisionalFacts ?? []}
    {existingTitles}
    onAdd={onAddProvisionalFact}
  />
  <AdventureArchive {repository} {vaultId} {onResume} {onResumeArchived} />
{/if}
