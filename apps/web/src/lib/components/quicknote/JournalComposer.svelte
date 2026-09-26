<script lang="ts">
  import type { SessionJournalStore } from "$lib/stores/session-journal.svelte";
  import type { SessionJournal } from "session-journal-engine";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  /**
   * The bottom of the Session Journal while a journal is running (#3402 slice
   * 1, #3406): add a typed note, choose the section new entries go into,
   * create sections and rename them. Split out of the journal view so the view
   * only decides what to show.
   */
  let {
    store,
    journal,
  }: { store: SessionJournalStore; journal: SessionJournal } = $props();

  let noteText = $state("");
  let isAddingNote = $state(false);
  let newSectionName = $state("");
  let isCreatingSection = $state(false);
  let sectionError = $state<string | null>(null);
  let renamingSectionId = $state<string | null>(null);
  let renameValue = $state("");
  let renameError = $state<string | null>(null);

  async function submitNote() {
    const content = noteText.trim();
    if (!content || isAddingNote) return;
    isAddingNote = true;
    try {
      // The current section lives in the store, so typed notes and captured
      // rolls land in the same place (spec 163, FR-032).
      const sectionId = store.activeSectionId;
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
      await store.createSection(name);
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
</script>

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

  {#if journal.sections.length > 0}
    <select
      value={store.activeSectionId ?? ""}
      onchange={(e) =>
        store.setActiveSection(e.currentTarget.value || undefined)}
      aria-label="Section for next journal note"
      class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
      data-testid="journal-note-section"
    >
      <option value="">No section</option>
      {#each journal.sections as section (section.id)}
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

  {#if journal.sections.length}
    {@render sectionChips(journal.sections)}
  {/if}
</div>

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
