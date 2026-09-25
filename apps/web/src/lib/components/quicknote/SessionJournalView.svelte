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
  let newSectionName = $state("");
  let sectionError = $state<string | null>(null);
  let renamingSectionId = $state<string | null>(null);
  let renameValue = $state("");
  let renameError = $state<string | null>(null);
  let showHistory = $state(false);
  let pastJournals = $state<SessionJournal[]>([]);

  const controlLabel = $derived(
    store.controlState === "start"
      ? "Start Session Journal"
      : "Resume Session Journal",
  );

  function sectionName(sectionId: string | undefined): string | undefined {
    if (!sectionId) return undefined;
    return store.current?.sections.find((s) => s.id === sectionId)?.name;
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
    if (!content) return;
    try {
      await store.appendEntry({ type: "manual-note", content });
      noteText = "";
    } catch {
      notificationStore.notify("That note could not be added.", "error");
    }
  }

  async function submitSection() {
    const name = newSectionName.trim();
    if (!name) return;
    try {
      await store.createSection(name);
      newSectionName = "";
      sectionError = null;
    } catch {
      sectionError = "A section needs a name.";
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
    try {
      await store.end();
      notificationStore.notify("Session ended.", "success");
    } catch {
      notificationStore.notify("That session could not be ended.", "error");
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
    <button
      type="button"
      onclick={toggleHistory}
      class="text-[10px] text-theme-muted transition-colors hover:text-theme-primary"
      data-testid="toggle-journal-history"
    >
      Past journals
    </button>
  </div>

  {#if showHistory}
    {@render journalHistory()}
  {/if}

  {#if store.controlState === "start" || store.controlState === "resume"}
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
        {store.current?.title ?? "Session Journal"}
      </h4>
      <button
        type="button"
        onclick={endSession}
        class="text-[10px] font-bold uppercase tracking-wider text-theme-danger transition-colors hover:underline"
        data-testid="end-session"
      >
        End Session
      </button>
    </div>

    <div
      class="flex flex-1 flex-col gap-2 overflow-y-auto"
      data-testid="journal-entries"
    >
      {@render entryList()}
    </div>

    <div class="flex flex-col gap-2 border-t border-theme-border/40 pt-3">
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={noteText}
          placeholder="Add a note..."
          onkeydown={(e) => e.key === "Enter" && submitNote()}
          class="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
          data-testid="journal-note-input"
        />
        <button
          type="button"
          onclick={submitNote}
          class="rounded bg-theme-primary px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-bg transition-colors hover:bg-theme-secondary"
          data-testid="journal-note-submit"
        >
          Add
        </button>
      </div>

      <div class="flex gap-2">
        <input
          type="text"
          bind:value={newSectionName}
          placeholder="New section name..."
          onkeydown={(e) => e.key === "Enter" && submitSection()}
          class="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
          data-testid="journal-section-input"
        />
        <button
          type="button"
          onclick={submitSection}
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

      {#if store.current?.sections.length}
        {@render sectionChips(store.current.sections)}
      {/if}
    </div>
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
      <div class="text-[10px] text-theme-muted" data-testid="past-journal">
        {journal.title} — {journal.status}
      </div>
    {/each}
  </div>
{/snippet}

{#snippet entryList()}
  {#if (store.current?.entries.length ?? 0) === 0}
    <p class="text-xs italic text-theme-muted/70">
      No entries yet — add your first note below.
    </p>
  {/if}
  {#each store.current?.entries ?? [] as entry (entry.id)}
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
