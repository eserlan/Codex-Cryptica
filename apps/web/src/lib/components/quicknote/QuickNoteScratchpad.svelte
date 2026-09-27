<script lang="ts">
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import NoteHistory from "./NoteHistory.svelte";
  import SessionJournalView from "./SessionJournalView.svelte";
  import { fade, scale } from "svelte/transition";
  import { onDestroy } from "svelte";
  import {
    clampBounds,
    getCenteredBounds,
    getViewportSize,
    loadSavedBounds,
    resizePointerDelta,
    saveBounds,
    MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT,
    type WindowBounds,
  } from "$lib/utils/window-bounds";

  /**
   * Notes and Journal are deliberately separate tabs, not merged into one
   * view: Quicknote/Scratchpad's notes stay transient, the Session Journal
   * is the chronological record — conflating them would defeat the point
   * of having both (spec 163-session-journal, FR-015). The selected tab
   * lives in quickNoteStore so the global journal control can set it.
   */
  const activeTab = $derived(quickNoteStore.activeTab);

  // Resizable scratchpad (#3490): the card used to be a fixed 768x480 box,
  // which cramped the Session Journal once entries had sections and a
  // formatting toolbar. Only resize is offered, not drag (unlike the Play
  // Tools window this math is shared with) — this stays centred, so growing
  // or shrinking it never has to reposition it.
  const SCRATCHPAD_WINDOW_STORAGE_KEY = "codex_quicknote_scratchpad_size";
  const SCRATCHPAD_DEFAULT_SIZE = { width: 768, height: 480 };
  const SCRATCHPAD_MIN_WIDTH = Math.max(MIN_WINDOW_WIDTH, 480);
  const SCRATCHPAD_MIN_HEIGHT = Math.max(MIN_WINDOW_HEIGHT, 360);

  let bounds = $state<WindowBounds>(centeredBounds());
  let isResizing = $state(false);
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  function centeredBounds(): WindowBounds {
    return getCenteredBounds(
      SCRATCHPAD_DEFAULT_SIZE,
      getViewportSize(),
      SCRATCHPAD_MIN_WIDTH,
      SCRATCHPAD_MIN_HEIGHT,
    );
  }

  function resizeDeltaForKey(
    key: string,
    growKey: string,
    shrinkKey: string,
    step: number,
  ): number {
    if (key === growKey) return step;
    if (key === shrinkKey) return -step;
    return 0;
  }

  $effect(() => {
    if (quickNoteStore.isOpen) {
      bounds = loadSavedBounds(
        SCRATCHPAD_WINDOW_STORAGE_KEY,
        typeof window !== "undefined" ? window.localStorage : null,
        getViewportSize(),
        SCRATCHPAD_DEFAULT_SIZE,
      );
    }
  });

  function handleWindowResize() {
    if (!quickNoteStore.isOpen) return;
    bounds = clampBounds(
      bounds,
      getViewportSize(),
      SCRATCHPAD_MIN_WIDTH,
      SCRATCHPAD_MIN_HEIGHT,
    );
    saveBounds(SCRATCHPAD_WINDOW_STORAGE_KEY, bounds);
  }

  function handleResizePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    isResizing = true;
    resizeStart = { ...bounds, x: e.clientX, y: e.clientY };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: PointerEvent) {
    if (!isResizing) return;
    const { deltaX, deltaY, viewport } = resizePointerDelta(e, resizeStart);
    // Growing keeps the box centred: widening/heightening by `delta` moves
    // the left/top edge back by half of it, rather than only growing
    // rightward/downward from a fixed corner.
    const newWidth = Math.max(
      SCRATCHPAD_MIN_WIDTH,
      resizeStart.width + deltaX * 2,
    );
    const newHeight = Math.max(
      SCRATCHPAD_MIN_HEIGHT,
      resizeStart.height + deltaY * 2,
    );
    bounds = clampBounds(
      getCenteredBounds(
        { width: newWidth, height: newHeight },
        viewport,
        SCRATCHPAD_MIN_WIDTH,
        SCRATCHPAD_MIN_HEIGHT,
      ),
      viewport,
      SCRATCHPAD_MIN_WIDTH,
      SCRATCHPAD_MIN_HEIGHT,
    );
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (!isResizing) return;
    isResizing = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if capture was already released
    }
    if (
      bounds.width !== resizeStart.width ||
      bounds.height !== resizeStart.height
    ) {
      saveBounds(SCRATCHPAD_WINDOW_STORAGE_KEY, bounds);
    }
  }

  function handleResizeKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 64 : 24;
    const widthDelta = resizeDeltaForKey(
      e.key,
      "ArrowRight",
      "ArrowLeft",
      step,
    );
    const heightDelta = resizeDeltaForKey(e.key, "ArrowDown", "ArrowUp", step);
    if (widthDelta === 0 && heightDelta === 0) return;

    e.preventDefault();
    const viewport = getViewportSize();
    const next = clampBounds(
      getCenteredBounds(
        {
          width: bounds.width + widthDelta,
          height: bounds.height + heightDelta,
        },
        viewport,
        SCRATCHPAD_MIN_WIDTH,
        SCRATCHPAD_MIN_HEIGHT,
      ),
      viewport,
      SCRATCHPAD_MIN_WIDTH,
      SCRATCHPAD_MIN_HEIGHT,
    );
    if (next.width === bounds.width && next.height === bounds.height) return;

    bounds = next;
    saveBounds(SCRATCHPAD_WINDOW_STORAGE_KEY, bounds);
  }

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

<svelte:window onresize={handleWindowResize} />

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
    class="fixed z-[101] rounded-2xl border border-theme-border/60 bg-theme-surface/85 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden {isResizing
      ? 'select-none'
      : ''}"
    style="left: {bounds.x}px; top: {bounds.y}px; width: {bounds.width}px; height: {bounds.height}px;"
    transition:scale={{ duration: 200, start: 0.95 }}
    data-testid="quicknote-scratchpad"
  >
    <!-- Header -->
    <div
      class="px-5 py-4 border-b border-theme-border/50 bg-theme-bg/30 flex justify-between items-center select-none"
    >
      <div class="flex items-center gap-1">
        {@render tabButton(
          "notes",
          "icon-[lucide--sparkles]",
          "QuickNote",
          "quicknote-tab-notes",
          true,
        )}
        {@render tabButton(
          "journal",
          "icon-[lucide--book-open]",
          "Session Journal",
          "quicknote-tab-journal",
          false,
        )}
      </div>
      <div class="flex items-center gap-2">
        {#if activeTab === "notes"}
          <span
            class="text-[10px] text-theme-muted px-2 py-0.5 rounded-full bg-theme-bg/50 border border-theme-border/30"
          >
            {saveStatus}
          </span>
        {/if}
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
    {#if activeTab === "journal"}
      <div class="flex-1 flex min-h-0" data-testid="quicknote-journal-panel">
        <SessionJournalView />
      </div>
    {:else}
      {@render notesPanel()}
    {/if}

    <!-- Corner Resize Grip -->
    <!-- This focusable group implements a two-axis keyboard resize control. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="group"
      tabindex="0"
      aria-label="Resize scratchpad with the arrow keys"
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-theme-muted/40 hover:text-theme-primary touch-none transition-colors z-10"
      onpointerdown={handleResizePointerDown}
      onpointermove={handleResizePointerMove}
      onpointerup={handleResizePointerUp}
      onpointercancel={handleResizePointerUp}
      onkeydown={handleResizeKeydown}
      title="Resize"
      data-testid="quicknote-scratchpad-resize-handle"
    >
      <span class="icon-[lucide--grip-vertical] w-3 h-3 rotate-45"></span>
    </div>
  </div>
{/if}

{#snippet notesPanel()}
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
{/snippet}

{#snippet tabButton(
  tab: "notes" | "journal",
  icon: string,
  label: string,
  testId: string,
  pulseIcon: boolean,
)}
  <button
    type="button"
    onclick={() => (quickNoteStore.activeTab = tab)}
    class="flex items-center gap-1.5 rounded px-2 py-1 font-header text-xs font-bold uppercase tracking-wider transition-colors {activeTab ===
    tab
      ? 'text-theme-primary'
      : 'text-theme-muted hover:text-theme-text'}"
    data-testid={testId}
  >
    <span
      aria-hidden="true"
      class="{icon} h-4 w-4 {pulseIcon && activeTab === tab
        ? 'animate-pulse text-theme-accent'
        : ''}"
    ></span>
    {label}
  </button>
{/snippet}
