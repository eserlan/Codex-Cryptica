<script lang="ts">
  import {
    sessionJournalStore,
    type SessionJournalStore,
  } from "$lib/stores/session-journal.svelte";
  import type { SessionJournal } from "session-journal-engine";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  /**
   * Session Journal (#3402 slice 1, #3406): a persistent, chronological
   * record of play, distinct from Quicknote/Scratchpad's transient notes
   * (FR-015) — a separate view within the same panel, never the same one.
   */
  let { store = sessionJournalStore }: { store?: SessionJournalStore } =
    $props();

  let noteText = $state("");
  let isAddingNote = $state(false);
  let newSectionName = $state("");
  let isCreatingSection = $state(false);
  let sectionError = $state<string | null>(null);
  let renamingSectionId = $state<string | null>(null);
  let renameValue = $state("");
  let renameError = $state<string | null>(null);
  let showHistory = $state(false);
  let pastJournals = $state<SessionJournal[]>([]);
  let selectedPastJournalId = $state<string | null>(null);
  let activeSectionId = $state<string | undefined>(undefined);
  let isEndingSession = $state(false);
  const displayedJournal = $derived(
    (selectedPastJournalId
      ? store.allJournals.find(
          (journal) => journal.id === selectedPastJournalId,
        )
      : undefined) ?? store.current,
  );

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

  async function submitNote() {
    const content = noteText.trim();
    if (!content || isAddingNote) return;
    isAddingNote = true;
    try {
      const sectionId = displayedJournal?.sections.some(
        (section) => section.id === activeSectionId,
      )
        ? activeSectionId
        : undefined;
      await store.appendEntry({
        type: "manual-note",
        content,
        ...(sectionId ? { sectionId } : {}),
      });
      noteText = "";
    } catch {
      notificationStore.notify("That note could not be added.", "error");
    } finally {
      isAddingNote = false;
    }
  }

  async function submitSection() {
    const name = newSectionName.trim();
    if (!name || isCreatingSection) return;
    isCreatingSection = true;
    try {
      const section = await store.createSection(name);
      activeSectionId = section.id;
      newSectionName = "";
      sectionError = null;
    } catch {
      sectionError = "A section needs a name.";
    } finally {
      isCreatingSection = false;
    }
  }

  function startRename(sectionId: string, currentName: string) {
    renamingSectionId = sectionId;
    renameValue = currentName;
    renameError = null;
  }

  async function submitRename() {
    if (!renamingSectionId) return;
    try {
      await store.renameSection(renamingSectionId, renameValue);
      renamingSectionId = null;
      renameError = null;
    } catch {
      renameError = "A section needs a name.";
    }
  }

  async function endSession() {
    if (isEndingSession) return;
    isEndingSession = true;
    try {
      await store.end();
      notificationStore.notify("Session ended.", "success");
    } catch {
      notificationStore.notify("That session could not be ended.", "error");
    } finally {
      isEndingSession = false;
    }
  }

  async function toggleHistory() {
    showHistory = !showHistory;
    if (showHistory) pastJournals = await store.listJournals();
  }
</script>

<div class="flex h-full flex-col gap-3 p-5" data-testid="session-journal-view">
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

  {#if (store.controlState === "start" || store.controlState === "resume") && !selectedPastJournalId}
    <div
      class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--book-open] h-10 w-10 text-theme-accent opacity-50"
      ></span>
      <button
        type="button"
        onclick={handleControlClick}
        class="rounded-lg bg-theme-primary px-4 py-2 font-header text-xs font-bold uppercase tracking-widest text-theme-bg transition-colors hover:bg-theme-secondary"
        data-testid="session-journal-control"
      >
        {controlLabel}
      </button>
    </div>
  {:else}
    <div
      class="flex items-center justify-between border-b border-theme-border/40 pb-2"
    >
      <h4
        class="font-header text-xs font-bold uppercase tracking-widest text-theme-primary"
      >
        {displayedJournal?.title ?? "Session Journal"}
      </h4>
      {#if displayedJournal?.status === "active"}
        <button
          type="button"
          onclick={endSession}
          disabled={isEndingSession}
          class="text-[10px] font-bold uppercase tracking-wider text-theme-danger transition-colors hover:underline"
          data-testid="end-session"
        >
          End Session
        </button>
      {:else}
        <button
          type="button"
          onclick={() => (selectedPastJournalId = null)}
          class="text-[10px] text-theme-muted transition-colors hover:text-theme-primary"
          data-testid="back-to-current-journal"
        >
          Back
        </button>
      {/if}
    </div>

    <!-- Tailwind provides this utility; Fallow cannot resolve generated v4 classes here. -->
    <!-- fallow-ignore-next-line css-broken-reference -->
    <div class="flex flex-1 flex-col gap-2 overflow-y-auto">
      {@render entryList()}
    </div>

    {#if displayedJournal?.status === "active"}
      <div class="flex flex-col gap-2 border-t border-theme-border/40 pt-3">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={noteText}
            aria-label="Journal note"
            placeholder="Add a note..."
            onkeydown={(e) => e.key === "Enter" && submitNote()}
            class="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            data-testid="journal-note-input"
          />
          <button
            type="button"
            onclick={submitNote}
            disabled={isAddingNote}
            class="rounded bg-theme-primary px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-bg transition-colors hover:bg-theme-secondary"
            data-testid="journal-note-submit"
          >
            Add
          </button>
        </div>

        {#if displayedJournal.sections.length > 0}
          <select
            bind:value={activeSectionId}
            aria-label="Section for next journal note"
            class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            data-testid="journal-note-section"
          >
            <option value={undefined}>No section</option>
            {#each displayedJournal.sections as section (section.id)}
              <option value={section.id}>{section.name}</option>
            {/each}
          </select>
        {/if}

        <div class="flex gap-2">
          <input
            type="text"
            bind:value={newSectionName}
            aria-label="New section name"
            placeholder="New section name..."
            onkeydown={(e) => e.key === "Enter" && submitSection()}
            class="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            data-testid="journal-section-input"
          />
          <button
            type="button"
            onclick={submitSection}
            disabled={isCreatingSection}
            class="rounded border border-theme-border px-3 py-1.5 font-header text-[10px] uppercase text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
            data-testid="journal-section-submit"
          >
            New Section
          </button>
        </div>
        {#if sectionError}
          <p class="text-[10px] text-theme-danger" data-testid="section-error">
            {sectionError}
          </p>
        {/if}

        {#if displayedJournal.sections.length}
          {@render sectionChips(displayedJournal.sections)}
        {/if}
      </div>
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
    <div
      class="rounded border border-theme-border/30 p-2 text-xs"
      data-testid="journal-entry"
    >
      <div
        class="flex items-center justify-between text-[9px] text-theme-muted"
      >
        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
        {#if sectionName(entry.sectionId)}
          <span class="text-theme-accent">{sectionName(entry.sectionId)}</span>
        {/if}
      </div>
      <p class="text-theme-text">{entry.content}</p>
    </div>
  {/each}
{/snippet}

{#snippet sectionChips(sections: SessionJournal["sections"])}
  <div class="flex flex-wrap gap-2">
    {#each sections as section (section.id)}
      <div
        class="flex flex-col items-start gap-0.5 rounded-full border border-theme-border/40 px-2 py-0.5"
      >
        {#if renamingSectionId === section.id}
          <input
            type="text"
            bind:value={renameValue}
            aria-label="Rename section"
            onkeydown={(e) => e.key === "Enter" && submitRename()}
            onblur={submitRename}
            class="w-24 bg-transparent text-[9px] text-theme-text focus:outline-none"
            data-testid="journal-section-rename-input"
          />
        {:else}
          <button
            type="button"
            onclick={() => startRename(section.id, section.name)}
            class="text-[9px] text-theme-text transition-colors hover:text-theme-primary"
            data-testid="journal-section-name"
          >
            {section.name}
          </button>
        {/if}
      </div>
    {/each}
  </div>
  {#if renameError}
    <p class="text-[10px] text-theme-danger" data-testid="rename-error">
      {renameError}
    </p>
  {/if}
{/snippet}

<style>
  @reference "../../../app.css";
</style>
