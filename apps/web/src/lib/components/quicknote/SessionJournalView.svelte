<script lang="ts">
  import {
    sessionJournalStore,
    type SessionJournalStore,
  } from "$lib/stores/session-journal.svelte";
  import { tick } from "svelte";
  import type { PromotionScope, SessionJournal } from "session-journal-engine";
  import {
    sessionJournalPromoter,
    type SessionJournalPromoter,
  } from "$lib/stores/session-journal-promoter";
  import JournalComposer from "./JournalComposer.svelte";
  import JournalEntryRow from "./JournalEntryRow.svelte";
  import JournalPromoteActions from "./JournalPromoteActions.svelte";
  import JournalPromoteToggle from "./JournalPromoteToggle.svelte";
  import JournalPromoteSheet from "./JournalPromoteSheet.svelte";
  import JournalHeader from "./JournalHeader.svelte";
  import JournalStartScreen from "./JournalStartScreen.svelte";
  import { JournalPromotionState } from "./journal-promotion.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  /**
   * Session Journal (#3402 slice 1, #3406): a persistent, chronological
   * record of play, distinct from Quicknote/Scratchpad's transient notes
   * (FR-015) — a separate view within the same panel, never the same one.
   */
  let {
    store = sessionJournalStore,
    promoter = sessionJournalPromoter,
  }: { store?: SessionJournalStore; promoter?: SessionJournalPromoter } =
    $props();

  let showHistory = $state(false);
  let pastJournals = $state<SessionJournal[]>([]);
  let selectedPastJournalId = $state<string | null>(null);
  let isEndingSession = $state(false);

  // Turning journal content into entities (slice 4, #3409).
  const promotion = new JournalPromotionState();
  let showPromote = $state(false);
  // Open by hand, or automatically while parts are being chosen.
  const promoteOpen = $derived(showPromote || promotion.selecting);
  let formJournalId = $state<string | null>(null);
  let justEndedId = $state<string | null>(null);
  // The form replaces the controls that opened it, so the opener itself is
  // gone when the form closes; remember enough to find its replacement.
  let formOpenerKey: { testId: string; label: string | null } | null = null;
  let viewRoot = $state<HTMLElement | null>(null);
  const formJournal = $derived(
    formJournalId
      ? store.allJournals.find((journal) => journal.id === formJournalId)
      : undefined,
  );
  const justEndedJournal = $derived(
    justEndedId
      ? store.allJournals.find((journal) => journal.id === justEndedId)
      : undefined,
  );

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  const displayedJournal = $derived(
    (selectedPastJournalId
      ? store.allJournals.find(
          (journal) => journal.id === selectedPastJournalId,
        )
      : undefined) ?? store.current,
  );

  $effect(() => {
    if (store.allJournals.length === 0) {
      pastJournals = [];
      selectedPastJournalId = null;
    }
  });

  // A different journal on screen starts from a clean slate.
  $effect(() => {
    void displayedJournal?.id;
    promotion.reset();
    showPromote = false;
    formJournalId = null;
  });

  const controlLabel = $derived(
    store.controlState === "start"
      ? "Start Session Journal"
      : "Resume Session Journal",
  );

  function sectionName(sectionId: string | undefined): string | undefined {
    if (!sectionId) return undefined;
    return displayedJournal?.sections.find((s) => s.id === sectionId)?.name;
  }

  async function handleControlClick() {
    if (store.controlState === "start") {
      await store.start();
    } else if (store.controlState === "resume") {
      store.open();
    }
  }

  async function endSession() {
    if (isEndingSession) return;
    isEndingSession = true;
    try {
      const endingId = store.current?.id ?? null;
      await store.end();
      justEndedId = endingId;
      notificationStore.notify("Session ended.", "success");
    } catch {
      notificationStore.notify("That session could not be ended.", "error");
    } finally {
      isEndingSession = false;
    }
  }

  /** Opens the type-and-name form for `scope` of `journal`, remembering what
   *  had focus so it can be given back when the form closes (FR-046). */
  function openForm(journal: SessionJournal, scope: PromotionScope) {
    if (!promotion.openForm(scope)) return;
    // Give the form the room the past-journals list was using.
    showHistory = false;
    const active = document.activeElement;
    formOpenerKey =
      active instanceof HTMLElement && active.dataset.testid
        ? {
            testId: active.dataset.testid,
            label: active.getAttribute("aria-label"),
          }
        : null;
    formJournalId = journal.id;
  }

  async function closeForm() {
    promotion.closeForm();
    formJournalId = null;
    const key = formOpenerKey;
    formOpenerKey = null;
    // Wait for the controls to come back, then give focus to the one that
    // matches the control the user pressed (FR-046).
    await tick();
    if (!key || !viewRoot) return;
    const candidates = viewRoot.querySelectorAll<HTMLElement>(
      `[data-testid="${key.testId}"]`,
    );
    [...candidates]
      .find((element) => element.getAttribute("aria-label") === key.label)
      ?.focus();
  }

  async function submitForm(type: string, title: string) {
    const scope = promotion.formScope;
    if (!formJournal || !scope) return { ok: false as const, error: "" };
    const result = await promoter.promote(formJournal, scope, {
      type,
      title,
      formatTime,
    });
    if (result.ok) closeForm();
    return result;
  }

  function chooseEndedParts() {
    if (!justEndedJournal) return;
    selectedPastJournalId = justEndedJournal.id;
    justEndedId = null;
    promotion.startSelecting();
  }

  async function toggleHistory() {
    showHistory = !showHistory;
    if (showHistory) pastJournals = await store.listJournals();
  }
</script>

<div
  class="flex h-full min-w-0 flex-1 flex-col gap-3 p-5"
  data-testid="session-journal-view"
  bind:this={viewRoot}
>
  <FeatureHint hintId="session-journal" />

  <div class="flex items-center justify-end">
    <!-- fallow-ignore-next-line complexity -->
    <button type="button" onclick={toggleHistory}>
      <span
        class="text-[10px] text-theme-muted transition-colors hover:text-theme-primary"
      >
        Past journals
      </span>
    </button>
  </div>

  {#if showHistory}
    {@render journalHistory()}
  {/if}

  {#if promotion.formScope && formJournal}
    <div class="flex-1 overflow-auto">
      <JournalPromoteSheet
        journal={formJournal}
        scope={promotion.formScope}
        {formatTime}
        onSubmit={submitForm}
        onCancel={closeForm}
      />
    </div>
  {:else if (store.controlState === "start" || store.controlState === "resume") && !selectedPastJournalId}
    <JournalStartScreen
      label={controlLabel}
      onStart={handleControlClick}
      endedJournal={justEndedJournal}
      onTurnIntoNote={() =>
        justEndedJournal && openForm(justEndedJournal, { kind: "journal" })}
      onChooseParts={chooseEndedParts}
      onDismiss={() => (justEndedId = null)}
    />
  {:else}
    <JournalHeader
      title={displayedJournal?.title ?? "Session Journal"}
      active={displayedJournal?.status === "active"}
      isEnding={isEndingSession}
      onEnd={endSession}
      onBack={() => (selectedPastJournalId = null)}
    >
      {#snippet extras()}
        <JournalPromoteToggle
          expanded={promoteOpen}
          onToggle={() => (showPromote = !showPromote)}
        />
      {/snippet}
    </JournalHeader>

    {#if displayedJournal && promoteOpen}
      <JournalPromoteActions
        journal={displayedJournal}
        {promotion}
        onOpenForm={(scope) => openForm(displayedJournal, scope)}
      />
    {/if}

    <!-- Tailwind provides this utility; Fallow cannot resolve generated v4 classes here. -->
    <!-- fallow-ignore-next-line css-broken-reference -->
    <div class="flex flex-1 flex-col gap-2 overflow-y-auto">
      {@render entryList()}
    </div>

    {#if displayedJournal?.status === "active"}
      <JournalComposer {store} journal={displayedJournal} />
    {/if}
  {/if}
</div>

{#snippet journalHistory()}
  <div
    class="flex flex-col gap-1 rounded border border-theme-border/40 p-2"
    data-testid="journal-history"
  >
    {#if pastJournals.length === 0}
      <p class="text-[10px] italic text-theme-muted">
        No past journals for this vault yet.
      </p>
    {/if}
    {#each pastJournals as journal (journal.id)}
      <button
        type="button"
        onclick={() => (selectedPastJournalId = journal.id)}
        class="w-full text-left text-[10px] text-theme-muted transition-colors hover:text-theme-primary"
        data-testid={`past-journal-${journal.id}`}
      >
        {journal.title} — {journal.status}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet entryList()}
  {#if (displayedJournal?.entries.length ?? 0) === 0}
    <p class="text-xs italic text-theme-muted/70">
      {displayedJournal?.status === "active"
        ? "No entries yet — add your first note below."
        : "This journal has no entries."}
    </p>
  {/if}
  {#each displayedJournal?.entries ?? [] as entry (entry.id)}
    <JournalEntryRow
      {entry}
      sectionName={sectionName(entry.sectionId)}
      onPromote={promotion.selecting || !displayedJournal
        ? undefined
        : () =>
            openForm(displayedJournal, { kind: "entry", entryId: entry.id })}
      selectable={promotion.selecting}
      selected={promotion.isEntrySelected(entry.id)}
      onToggleSelect={() => promotion.toggleEntry(entry.id)}
    />
  {/each}
{/snippet}

<style>
  @reference "../../../app.css";
</style>
