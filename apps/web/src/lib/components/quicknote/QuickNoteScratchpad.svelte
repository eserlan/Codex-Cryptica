<script lang="ts">
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import NoteHistory from "./NoteHistory.svelte";
  import { fade, scale } from "svelte/transition";
  import { onDestroy } from "svelte";

  // Auto-save debounce effect
  let debounceTimeout: any;
  let saveStatus = $state("Saved");

  let activeNoteId: number | undefined = undefined;
  let lastLoadedContent = "";

  $effect(() => {
    const current = quickNoteStore.currentNote;
    if (current) {
      if (current.id !== activeNoteId) {
        activeNoteId = current.id;
        lastLoadedContent = current.content;
        saveStatus = "Saved";
        return;
      }

      if (current.content !== lastLoadedContent) {
        if (!current.id && !current.content.trim()) {
          return;
        }

        saveStatus = "Typing...";
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          saveStatus = "Saving...";
          await quickNoteStore.saveCurrentNote();
          lastLoadedContent = current.content;
          if (quickNoteStore.currentNote) {
            activeNoteId = quickNoteStore.currentNote.id;
          }
          saveStatus = "Saved";
        }, 600);
      }
    } else {
      activeNoteId = undefined;
      lastLoadedContent = "";
    }

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  });

  onDestroy(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
  });
</script>

{#if quickNoteStore.isOpen}
  <!-- Overlay Backdrop (click to close) -->
  <button
    type="button"
    aria-label="Close scratchpad"
    class="fixed inset-0 w-full h-full z-[100] bg-slate-950/40 backdrop-blur-[2px] transition-all cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset"
    onclick={() => quickNoteStore.close()}
    transition:fade={{ duration: 150 }}
  ></button>

  <!-- Main Floating Scratchpad Card -->
  <div
    class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-3xl h-[480px]
           rounded-2xl border border-theme-border/60 bg-theme-surface/85 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <!-- Header -->
    <div
      class="px-5 py-4 border-b border-theme-border/50 bg-theme-bg/30 flex justify-between items-center select-none"
    >
      <div class="flex items-center gap-2">
        <span
          class="icon-[lucide--sparkles] h-5 w-5 text-theme-accent animate-pulse"
        ></span>
        <h3
          class="font-header text-sm text-theme-primary uppercase tracking-wider font-bold"
        >
          QuickNote Scratchpad
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="text-[10px] text-theme-muted px-2 py-0.5 rounded-full bg-theme-bg/50 border border-theme-border/30"
        >
          {saveStatus}
        </span>
        <button
          type="button"
          onclick={() => quickNoteStore.close()}
          class="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-border/25 transition-all"
          aria-label="Close scratchpad"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>
    </div>

    <!-- Body Layout -->
    <div class="flex-1 flex min-h-0">
      <!-- Left sidebar list of notes -->
      <div class="w-72 flex-shrink-0">
        <NoteHistory />
      </div>

      <!-- Right active note editor panel -->
      <div class="flex-1 flex flex-col bg-theme-bg/10 p-5">
        {#if quickNoteStore.currentNote}
          <div class="flex-1 flex flex-col gap-3 min-h-0">
            <!-- Textarea for Note Content -->
            <textarea
              bind:value={quickNoteStore.currentNote.content}
              placeholder="Dump your thoughts here instantly... Type location lore, NPC concepts, or plot hooks. Auto-saved!"
              class="flex-1 bg-transparent border-0 text-xs text-theme-text placeholder-theme-muted focus:ring-0 focus:outline-none resize-none font-body leading-relaxed"
            ></textarea>

            <!-- Bottom Tool Actions -->
            <div
              class="flex justify-between items-center border-t border-theme-border/40 pt-4 mt-auto"
            >
              <div class="flex gap-2">
                <!-- Discard/Delete button -->
                <button
                  onclick={() => quickNoteStore.discardNote()}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme-danger/20 bg-theme-danger/10 hover:bg-theme-danger/20 text-theme-danger font-semibold text-xs transition-colors"
                  title="Discard Note"
                >
                  <span class="icon-[lucide--trash-2] h-3.5 w-3.5"></span>
                  Discard
                </button>
              </div>

              <!-- Save / Elevate options -->
              <div class="flex gap-2">
                <!-- Elevate to Lore/Wiki -->
                <button
                  onclick={async () => {
                    if (quickNoteStore.currentNote?.id) {
                      await quickNoteStore.triggerAIElevation(
                        quickNoteStore.currentNote.id,
                      );
                    }
                  }}
                  disabled={quickNoteStore.isElevating ||
                    !quickNoteStore.currentNote.content.trim()}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary font-bold text-[10px] uppercase font-header tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                  title="Make Entity with AI"
                >
                  <span
                    class="icon-[lucide--sparkles] h-3.5 w-3.5 {quickNoteStore.isElevating
                      ? 'animate-spin'
                      : ''}"
                  ></span>
                  {quickNoteStore.isElevating ? "Making..." : "Make Entity"}
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div
            class="flex-1 flex flex-col items-center justify-center text-center p-6 text-theme-muted"
          >
            <span
              class="icon-[lucide--sticky-note] h-12 w-12 opacity-30 mb-3 text-theme-accent"
            ></span>
            <p class="text-xs font-medium">
              Select a note or create a new one to begin editing.
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
