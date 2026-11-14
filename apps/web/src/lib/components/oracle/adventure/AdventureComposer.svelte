<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventureControlRetry from "./AdventureControlRetry.svelte";
  import AdventureSuggestedActions from "./AdventureSuggestedActions.svelte";

  let {
    manager,
    phone = false,
    keyboardOpen = false,
    suggestionChips = false,
  }: {
    manager: AdventureManager;
    phone?: boolean;
    keyboardOpen?: boolean;
    suggestionChips?: boolean;
  } = $props();
  let action = $derived(manager.draft);
  let disabled = $derived(
    manager.readOnly ||
      (manager.session?.turns.length === 0 && !manager.session.pendingRoll) ||
      manager.phase === "generating" ||
      manager.phase === "offline" ||
      manager.phase === "awaiting-roll" ||
      manager.phase === "ready-to-resolve",
  );
  let textarea = $state<HTMLTextAreaElement>();
  let typing = $state(false);

  function submitDraft() {
    if (disabled || !manager.draft.trim()) return;
    void manager.submitAction(action);
  }

  // Keep the action field compact for one line, then grow as the player types.
  // Long prose scrolls inside the field so it never pushes the dock offscreen.
  $effect(() => {
    const content = manager.draft;
    if (!textarea || typeof content !== "string") return;
    void tick().then(() => {
      if (!textarea) return;
      textarea.style.height = "auto";
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      const maxHeight = Math.max(44, Math.min(192, visibleHeight * 0.3));
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    });
  });

  // Preserve controls in the DOM during phase transitions. Unmounting a
  // focused button can exit native fullscreen unexpectedly in Chrome.
  let actionControlsVisible = $derived(
    manager.phase !== "generating" &&
      manager.phase !== "awaiting-roll" &&
      manager.phase !== "ready-to-resolve",
  );
  // Suggestions are optional while typing: the free-action row must remain
  // reachable when an on-screen keyboard reduces the available height.
  let suggestionsVisible = $derived(
    actionControlsVisible && !(phone && (keyboardOpen || typing)),
  );
</script>

<div
  class="z-10 flex min-h-0 max-h-[55%] shrink-0 flex-col gap-2 overflow-hidden border-t border-theme-border bg-theme-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-3"
  data-testid="adventure-action-dock"
>
  <!-- Only optional controls scroll. Never put the textarea/Send row in this
       container: it must remain fixed at the bottom when the keyboard opens. -->
  <div
    class={suggestionChips
      ? "mx-auto min-h-0 w-full max-w-6xl overflow-y-auto"
      : "mx-auto min-h-0 w-full max-w-3xl overflow-y-auto"}
    data-testid="adventure-dock-extras"
  >
    {#if manager.readOnly && manager.session?.status === "active"}
      <AdventureControlRetry {manager} />
    {/if}
    <AdventureSuggestedActions
      {manager}
      {disabled}
      visible={suggestionsVisible}
      chips={suggestionChips}
    />
    {#if manager.errorMessage}
      <p class="text-sm text-theme-danger" role="alert">
        {manager.errorMessage}
      </p>
    {/if}
    {#if !manager.readOnly && manager.session?.turns.length === 0 && !manager.session.pendingRoll}
      <button
        type="button"
        class="min-h-11 rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-text disabled:opacity-50"
        disabled={manager.phase === "generating"}
        onclick={() => void manager.retryOpening()}>Retry opening</button
      >
    {/if}
  </div>
  <form
    class="mx-auto w-full max-w-3xl shrink-0 space-y-2"
    onsubmit={(event) => {
      event.preventDefault();
      submitDraft();
    }}
  >
    <div
      class={manager.phase === "generating"
        ? "flex items-center justify-between gap-3 py-1"
        : "hidden"}
    >
      <div class="min-w-0" role="status">
        <p class="flex items-center gap-2 text-sm text-theme-text">
          <span
            class="icon-[lucide--sparkles] h-4 w-4 shrink-0 motion-safe:animate-pulse"
            aria-hidden="true"
          ></span>
          Oracle is responding…
        </p>
        {#if manager.draft.trim()}
          <p class="truncate text-xs text-theme-text" title={manager.draft}>
            Playing: {manager.draft}
          </p>
        {/if}
      </div>
      <button
        class="min-h-11 rounded-md border border-theme-border px-3 text-theme-text"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >
    </div>
    <div
      class={actionControlsVisible ? "flex items-end gap-2" : "hidden"}
      data-testid="adventure-free-action"
    >
      <label class="sr-only" for="adventure-action">What do you do?</label>
      <textarea
        bind:this={textarea}
        id="adventure-action"
        rows="1"
        class="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-base leading-relaxed text-theme-text placeholder:text-theme-muted"
        bind:value={manager.draft}
        onfocus={() => (typing = true)}
        onblur={() => (typing = false)}
        onkeydown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submitDraft();
          }
        }}
        {disabled}
        placeholder="What do you do?"
      ></textarea>
      <button
        class="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-3 py-2 text-theme-on-primary disabled:opacity-50"
        type="submit"
        aria-label="Submit action"
        disabled={disabled || !manager.draft.trim()}
      >
        <span class="icon-[lucide--send] h-4 w-4" aria-hidden="true"></span>
        <span class="hidden sm:inline">Send</span>
      </button>
    </div>
  </form>
</div>
