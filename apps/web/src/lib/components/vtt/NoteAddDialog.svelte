<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { fade, scale } from "svelte/transition";

  /**
   * Pins a note to the map. Deliberately smaller than the token dialog:
   * a note is something the GM jots down mid-session, so the only required
   * field is the body, and it lands hidden from players by default.
   */
  let title = $state("");
  let body = $state("");

  const coords = $derived(mapSession.pendingNoteCoords);

  function close() {
    mapSession.pendingNoteCoords = null;
    title = "";
    body = "";
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.currentTarget === event.target) close();
  };

  const handleBackdropKeydown = (event: KeyboardEvent) => {
    if (
      event.currentTarget === event.target &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!coords) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  function createNote() {
    if (!coords) return;
    const created = mapSession.addNote({
      name: title.trim() || "Note",
      body,
      x: coords.x,
      y: coords.y,
    });
    if (!created) {
      notificationStore.notify("Open a map before pinning a note.", "error");
      return;
    }
    mapSession.setSelection(created.id);
    close();
  }
</script>

{#if coords}
  <div
    data-testid="note-add-backdrop"
    class="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    transition:fade
    role="button"
    tabindex="0"
    aria-label="Close note dialog"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div
      class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface shadow-2xl overflow-hidden"
      transition:scale
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-add-title"
    >
      <div
        class="p-4 border-b border-theme-border flex items-center justify-between"
      >
        <div>
          <h2
            id="note-add-title"
            class="text-sm font-bold uppercase tracking-widest font-header text-theme-text"
          >
            Pin Note
          </h2>
          <p class="text-[10px] text-theme-muted mt-1">
            Only you can see it until you reveal it to players.
          </p>
        </div>
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text"
          onclick={close}
          aria-label="Close note dialog"
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <label class="space-y-2 block">
          <span
            class="text-[10px] uppercase font-bold tracking-widest text-theme-muted"
            >Title</span
          >
          <input
            class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
            bind:value={title}
            data-testid="note-add-title-input"
            placeholder="Guard post"
          />
        </label>

        <label class="space-y-2 block">
          <span
            class="text-[10px] uppercase font-bold tracking-widest text-theme-muted"
            >Note</span
          >
          <!-- svelte-ignore a11y_autofocus -->
          <textarea
            class="w-full resize-y rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
            bind:value={body}
            rows="5"
            autofocus
            data-testid="note-add-body-input"
            placeholder="2 goblins arguing over a map. They surrender if scared."
          ></textarea>
        </label>
      </div>

      <div
        class="p-4 border-t border-theme-border flex items-center justify-between gap-3"
      >
        <div class="text-[10px] text-theme-muted">
          Position: {Math.round(coords.x)}, {Math.round(coords.y)}
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
            onclick={close}
            type="button"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest"
            onclick={createNote}
            data-testid="note-add-confirm"
            type="button"
          >
            Pin Note
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={handleKeydown} />
