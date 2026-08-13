<script lang="ts">
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { fade } from "svelte/transition";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  // Formatter for timestamps
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Get a snippet of the note content
  function getSnippet(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return "Empty Note...";
    // Split lines and get the first non-empty line
    const firstLine = trimmed.split("\n")[0];
    if (firstLine.length > 30) {
      return firstLine.substring(0, 30) + "...";
    }
    return firstLine;
  }
</script>

<div
  class="flex flex-col h-full border-r border-theme-border/40 bg-theme-surface/30"
>
  <!-- Search/Filter Input -->
  <div class="p-3 border-b border-theme-border/40">
    <div class="relative">
      <span
        class="absolute left-2.5 top-1/2 -translate-y-1/2 icon-[lucide--search] h-4 w-4 text-theme-muted"
      ></span>
      <input
        type="text"
        bind:value={quickNoteStore.filterText}
        placeholder="Filter notes..."
        class="w-full pl-8 pr-3 py-1.5 bg-theme-bg/40 border border-theme-border/40 rounded-lg text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent/50 focus:ring-1 focus:ring-theme-accent/20 transition-colors"
      />
      {#if quickNoteStore.filterText}
        <button
          type="button"
          onclick={() => (quickNoteStore.filterText = "")}
          aria-label="Clear filter"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-3.5 w-3.5"></span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Notes List -->
  <div class="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5 custom-scrollbar">
    {#if quickNoteStore.filteredNotes.length === 0}
      <div transition:fade>
        <EmptyState
          icon="icon-[lucide--notebook-pen]"
          headline="No notes found"
        />
      </div>
    {:else}
      {#each quickNoteStore.filteredNotes as note (note.id)}
        <button
          onclick={() => quickNoteStore.selectNote(note)}
          class="w-full text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-1
            {quickNoteStore.currentNote?.id === note.id
            ? 'bg-theme-accent/10 border-theme-accent/30 shadow-sm shadow-theme-accent/10 text-theme-text font-bold'
            : 'bg-theme-bg/25 border-theme-border/20 text-theme-text hover:bg-theme-bg/60 hover:border-theme-border/40'}"
        >
          <div class="flex justify-between items-center w-full">
            <span class="font-medium truncate pr-2">
              {getSnippet(note.content)}
            </span>
            <span class="text-[10px] text-theme-muted shrink-0">
              {formatTime(note.createdAt)}
            </span>
          </div>
          <span class="text-[11px] text-theme-muted truncate">
            {note.content.split("\n").slice(1).join(" ").trim() ||
              "No additional content"}
          </span>
        </button>
      {/each}
    {/if}
  </div>

  <!-- Footer Options -->
  <div
    class="p-3 border-t border-theme-border/40 bg-theme-bg/10 flex justify-between items-center"
  >
    <button
      onclick={() => quickNoteStore.startNewNote()}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-primary text-theme-bg font-semibold text-xs transition-colors shadow-sm hover:brightness-110"
    >
      <span class="icon-[lucide--plus] h-3.5 w-3.5"></span>
      New Note
    </button>
    <span class="text-[10px] text-theme-muted">
      {quickNoteStore.count} active
    </span>
  </div>
</div>
