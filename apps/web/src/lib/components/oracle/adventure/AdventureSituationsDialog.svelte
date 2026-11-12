<!-- fallow-ignore-file complexity -- Situations dialog with trigger, empty state, and drawer. -->
<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import {
    describeScenarioMutationError,
    extractHeardScenarios,
  } from "#lib/stores/oracle/adventure-scenarios.js";
  import { containTab } from "./adventure-phone-surface.js";
  import AdventureScenarioControls from "./AdventureScenarioControls.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  let expanded = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);

  let triggerButton = $state<HTMLButtonElement>();
  let closeButton = $state<HTMLButtonElement>();
  let dialogPanel = $state<HTMLElement>();

  const scenarios = $derived(extractHeardScenarios(manager.session));

  const focusedId = $derived(
    manager.session?.scenarioCollection?.focusedScenarioId ?? "",
  );

  const focusedScenario = $derived(
    scenarios.find((item) => item.id === focusedId) ?? null,
  );

  const locked = $derived(
    manager.readOnly ||
      manager.phase === "generating" ||
      !!manager.session?.pendingRoll ||
      busy,
  );

  function openDialog(): void {
    expanded = true;
    void tick().then(() => {
      closeButton?.focus();
    });
  }

  function closeDialog(): void {
    expanded = false;
    triggerButton?.focus();
  }

  async function lookForRumours(): Promise<void> {
    if (locked) return;
    busy = true;
    error = null;
    try {
      await manager.submitAction("Ask around for local rumours and news.");
      if (manager.phase === "generating") {
        closeDialog();
      }
    } catch (cause) {
      error = describeScenarioMutationError(cause);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (expanded && event.key === "Escape") {
      event.preventDefault();
      closeDialog();
    }
  }}
/>

<button
  bind:this={triggerButton}
  type="button"
  class="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-theme-border px-2.5 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:gap-2 sm:px-3 sm:text-sm"
  aria-label={scenarios.length > 0
    ? `Adventure situations (${scenarios.length} known)`
    : "Adventure situations"}
  aria-expanded={expanded}
  aria-controls="adventure-situations-dialog"
  onclick={openDialog}
>
  <span class="icon-[lucide--compass] h-4 w-4" aria-hidden="true"></span>
  {#if scenarios.length > 0}
    <span
      class="rounded-full bg-theme-primary/10 px-1.5 py-0.5 tabular-nums font-semibold"
    >
      {scenarios.length}
    </span>
  {/if}
  <span class="hidden sm:inline">Situations</span>
</button>

{#if expanded}
  <div class="absolute inset-0 z-40" data-testid="adventure-situations-overlay">
    <button
      type="button"
      class="absolute inset-0 w-full bg-theme-bg/75"
      aria-label="Dismiss situations backdrop"
      onclick={closeDialog}
    ></button>
    <div
      bind:this={dialogPanel}
      id="adventure-situations-dialog"
      tabindex="-1"
      class="absolute inset-0 z-10 flex min-h-0 w-full flex-col overflow-hidden bg-theme-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-lg sm:border-l sm:border-theme-border"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adventure-situations-title"
      onkeydown={(event) => {
        if (dialogPanel) containTab(event, dialogPanel);
      }}
    >
      <header
        class="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:p-4"
      >
        <div class="min-w-0">
          <h3
            id="adventure-situations-title"
            class="font-header text-lg font-bold text-theme-text"
          >
            Situations & Rumours
          </h3>
          <p class="truncate text-xs text-theme-text">
            {#if scenarios.length > 0}
              {scenarios.length}
              {scenarios.length === 1 ? "situation" : "situations"} known
              {#if focusedScenario}
                · Following: {focusedScenario.playerVisible.lead}
              {/if}
            {:else}
              No situations heard yet
            {/if}
          </p>
        </div>
        <button
          bind:this={closeButton}
          type="button"
          class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-border text-theme-text hover:bg-theme-primary/10"
          aria-label="Close situations"
          onclick={closeDialog}
        >
          <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {#if error}
          <p
            role="alert"
            class="rounded-md border border-theme-danger/30 bg-theme-danger/10 p-2 text-xs text-theme-danger"
          >
            {error}
          </p>
        {/if}

        {#if scenarios.length > 0}
          <div
            class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-bg/50 p-3"
          >
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-theme-text">
                Gather Rumours
              </p>
              <p class="text-[11px] text-theme-text">
                Ask locals, bartenders, or travellers about recent happenings.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-theme-border px-3 text-xs font-medium text-theme-text hover:bg-theme-primary/10 disabled:opacity-50"
              disabled={locked}
              onclick={() => void lookForRumours()}
            >
              <span class="icon-[lucide--ear] h-3.5 w-3.5" aria-hidden="true"
              ></span>
              {busy ? "Asking…" : "Look for local rumours"}
            </button>
          </div>

          <AdventureScenarioControls {manager} />
        {:else}
          <div
            class="space-y-3 rounded-lg border border-theme-border/60 bg-theme-bg/40 p-6 text-center"
          >
            <span
              class="icon-[lucide--compass] mx-auto block h-8 w-8 text-theme-text"
              aria-hidden="true"
            ></span>
            <p class="text-sm font-medium text-theme-text">
              No situations heard yet
            </p>
            <p class="mx-auto max-w-xs text-xs text-theme-text">
              Ask around for rumours, explore unfamiliar landmarks, or question
              locals to uncover ongoing events in this region.
            </p>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md bg-theme-primary px-3 py-2 text-xs font-semibold text-theme-on-primary hover:bg-theme-primary/90 disabled:opacity-50"
              disabled={locked}
              onclick={() => void lookForRumours()}
            >
              <span class="icon-[lucide--ear] h-3.5 w-3.5" aria-hidden="true"
              ></span>
              Look for local rumours
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
