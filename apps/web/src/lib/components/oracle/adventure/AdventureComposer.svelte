<!-- fallow-ignore-file css-broken-reference -- overflow-y-auto is a valid Tailwind utility; the class check misreads it. -->
<script lang="ts">
  import { tick } from "svelte";
  import { MAX_TEXT_CHARS } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventureControlRetry from "./AdventureControlRetry.svelte";
  import AdventurePackageUnavailable from "./AdventurePackageUnavailable.svelte";
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

  let isOocMode = $derived(manager.composerMode === "ooc");
  let activeDraft = $derived(
    isOocMode ? (manager.oocDraft ?? "") : (manager.draft ?? ""),
  );
  let busy = $derived(
    manager.phase === "generating" ||
      Boolean(manager.oocGenerating) ||
      Boolean(manager.rollMutationPending),
  );
  let playBlockedByRoll = $derived(
    manager.phase === "awaiting-roll" || manager.phase === "ready-to-resolve",
  );
  let disabled = $derived(
    manager.readOnly ||
      (manager.session?.turns.length === 0 && !manager.session.pendingRoll) ||
      busy ||
      manager.phase === "package-unavailable" ||
      manager.phase === "offline" ||
      (!isOocMode && playBlockedByRoll),
  );
  let textarea = $state<HTMLTextAreaElement>();
  let typing = $state(false);

  function selectMode(mode: "play" | "ooc") {
    if (manager.setComposerMode) {
      manager.setComposerMode(mode);
    } else {
      manager.composerMode = mode;
    }
    void tick().then(() => textarea?.focus());
  }

  function updateDraft(value: string) {
    if (isOocMode) {
      manager.oocDraft = value;
    } else {
      manager.draft = value;
    }
  }

  function submitDraft() {
    if (disabled || !activeDraft.trim()) return;
    if (isOocMode) {
      void manager.submitOocQuestion(activeDraft);
    } else {
      void manager.submitAction(activeDraft);
    }
  }

  // Keep the action field compact for one line, then grow as the player types.
  // Long prose scrolls inside the field so it never pushes the dock offscreen.
  $effect(() => {
    const content = activeDraft;
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
    !busy && (isOocMode || !playBlockedByRoll),
  );
  let modeSwitchVisible = $derived(
    !busy &&
      !manager.readOnly &&
      manager.phase !== "package-unavailable" &&
      !(manager.session?.turns.length === 0 && !manager.session?.pendingRoll),
  );
  // Suggestions are optional while typing: the free-action row must remain
  // reachable when an on-screen keyboard reduces the available height.
  let suggestionsVisible = $derived(
    !isOocMode && actionControlsVisible && !(phone && (keyboardOpen || typing)),
  );
</script>

{#snippet modeSwitchBar()}
  <div
    class={!phone && modeSwitchVisible
      ? "flex flex-wrap items-center justify-between gap-2"
      : "hidden"}
    data-testid="adventure-composer-mode-bar"
  >
    <div
      class="inline-flex items-center gap-1 rounded-lg border border-theme-text/75 bg-theme-bg p-0.5"
      role="group"
      aria-label="Composer mode"
      data-testid="adventure-composer-mode-switch"
    >
      <button
        type="button"
        class={isOocMode
          ? "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
          : "inline-flex min-h-8 items-center gap-1.5 rounded-md bg-theme-primary px-2.5 py-1 text-xs font-semibold text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"}
        aria-pressed={!isOocMode}
        data-testid="adventure-mode-play"
        onclick={() => selectMode("play")}
      >
        <span aria-hidden="true" class="icon-[lucide--swords] h-3.5 w-3.5"
        ></span>
        <span>Play</span>
      </button>
      <button
        type="button"
        class={isOocMode
          ? "inline-flex min-h-8 items-center gap-1.5 rounded-md bg-theme-primary px-2.5 py-1 text-xs font-semibold text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
          : "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"}
        aria-pressed={isOocMode}
        data-testid="adventure-mode-ooc"
        onclick={() => selectMode("ooc")}
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--message-circle-question] h-3.5 w-3.5"
        ></span>
        <span>Ask GM</span>
      </button>
    </div>
    {#if isOocMode}
      <p class="text-xs text-theme-text" data-testid="adventure-ooc-mode-hint">
        Out of character · No game time elapsed · No story changes
      </p>
    {/if}
  </div>
{/snippet}

{#snippet pendingGenerationRow()}
  <div class={busy ? "flex items-center justify-between gap-3 py-1" : "hidden"}>
    <div class="min-w-0" role="status">
      <p class="flex items-center gap-2 text-sm text-theme-text">
        <span
          class="icon-[lucide--sparkles] h-4 w-4 shrink-0 motion-safe:animate-pulse"
          aria-hidden="true"
        ></span>
        {manager.rollMutationPending
          ? "Recording roll outcome…"
          : manager.oocGenerating
            ? "GM is answering (out of character)…"
            : "Oracle is responding…"}
      </p>
      {#if manager.oocGenerating && manager.oocDraft?.trim()}
        <p class="truncate text-xs text-theme-text" title={manager.oocDraft}>
          Asking GM: {manager.oocDraft}
        </p>
      {:else if !manager.oocGenerating && manager.draft?.trim()}
        <p class="truncate text-xs text-theme-text" title={manager.draft}>
          Playing: {manager.draft}
        </p>
      {/if}
    </div>
    {#if !manager.rollMutationPending}
      <button
        class="min-h-11 rounded-md border border-theme-text/75 px-3 text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >
    {/if}
  </div>
{/snippet}

{#snippet dockExtrasContent()}
  {#if manager.phase === "package-unavailable"}
    <AdventurePackageUnavailable {manager} />
  {:else if manager.readOnly && manager.session?.status === "active"}
    <AdventureControlRetry {manager} />
  {/if}
  <AdventureSuggestedActions
    {manager}
    {disabled}
    visible={suggestionsVisible}
    chips={suggestionChips}
  />
  {#if manager.errorMessage}
    <p class="text-sm text-theme-text" role="alert">
      {manager.errorMessage}
    </p>
  {/if}
  {#if manager.oocErrorMessage}
    <p
      class="text-sm text-theme-text"
      role="alert"
      data-testid="adventure-ooc-error"
    >
      {manager.oocErrorMessage}
    </p>
  {/if}
  {#if !manager.readOnly && manager.session?.turns.length === 0 && !manager.session.pendingRoll}
    <button
      type="button"
      class="min-h-11 rounded-lg border border-theme-text/75 px-3 py-2 text-sm text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      disabled={busy}
      onclick={() => void manager.retryOpening()}>Retry opening</button
    >
  {/if}
{/snippet}

{#snippet mobileModeSwitch()}
<!-- Phone: two always-visible mode choices share the input row,
     instead of consuming a separate line of story space. -->
<div
  class={phone && modeSwitchVisible
    ? "inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-theme-text/75 bg-theme-bg p-0.5"
    : "hidden"}
  role="group"
  aria-label="Composer mode"
  data-testid="adventure-mobile-mode-switch"
>
  <button
    type="button"
    class={isOocMode
      ? "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      : "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md bg-theme-primary text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"}
    aria-label="Play (in character)"
    title="Play (in character)"
    aria-pressed={!isOocMode}
    data-testid="adventure-mobile-mode-play"
    onclick={() => selectMode("play")}
  >
    <span aria-hidden="true" class="icon-[lucide--swords] h-4 w-4"></span>
    <span class="text-[10px] leading-none">Play</span>
  </button>
  <button
    type="button"
    class={isOocMode
      ? "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md bg-theme-primary text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      : "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"}
    aria-label="Ask GM (out of character)"
    title="Ask GM (out of character)"
    aria-pressed={isOocMode}
    data-testid="adventure-mobile-mode-ooc"
    onclick={() => selectMode("ooc")}
  >
    <span
      aria-hidden="true"
      class="icon-[lucide--message-circle-question] h-4 w-4"
    ></span>
    <span class="text-[10px] leading-none">Ask GM</span>
  </button>
</div>
{/snippet}

{#snippet freeActionInputRow()}
  <div
    class={actionControlsVisible || (phone && modeSwitchVisible)
      ? "flex min-w-0 items-end gap-2"
      : "hidden"}
    data-testid="adventure-free-action"
  >
    {@render mobileModeSwitch()}
    <label class="sr-only" for="adventure-action">
      {isOocMode
        ? "Ask the GM a question (out of character)…"
        : "What do you do?"}
    </label>
    <textarea
      maxlength={isOocMode ? MAX_TEXT_CHARS : undefined}
      bind:this={textarea}
      id="adventure-action"
      rows="1"
      class="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-theme-text/75 bg-theme-bg px-3 py-2 text-base leading-relaxed text-theme-text placeholder:text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      value={activeDraft}
      oninput={(event) => updateDraft(event.currentTarget.value)}
      onfocus={() => (typing = true)}
      onblur={() => (typing = false)}
      onkeydown={(event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          submitDraft();
        }
      }}
      {disabled}
      placeholder={isOocMode
        ? phone
          ? "Ask a question…"
          : "Ask the GM a question (out of character)…"
        : phone
          ? "Your action…"
          : "What do you do?"}
    ></textarea>
    <button
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-3 py-2 text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      type="submit"
      aria-label={isOocMode ? "Submit question to GM" : "Submit action"}
      data-testid="adventure-submit-button"
      disabled={disabled || !activeDraft.trim()}
    >
      <span
        class={isOocMode
          ? "icon-[lucide--message-circle-question] h-4 w-4"
          : "icon-[lucide--send] h-4 w-4"}
        aria-hidden="true"
      ></span>
      <span class="hidden sm:inline">{isOocMode ? "Ask" : "Send"}</span>
    </button>
  </div>
{/snippet}

<div
  class="z-10 flex min-h-0 max-h-[55%] shrink-0 flex-col gap-2 overflow-hidden border-t border-theme-border bg-theme-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-3"
  data-testid="adventure-action-dock"
>
  <!-- Only optional controls scroll, including all expanded suggested actions.
       Keep a single touch-scroll container so long choices remain reachable.
       The textarea/Send row stays fixed at the bottom when the keyboard opens. -->
  <div
    class="mx-auto min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain pb-2"
    data-testid="adventure-dock-extras"
  >
    {@render dockExtrasContent()}
  </div>
  <form
    class="mx-auto w-full max-w-3xl shrink-0 space-y-2"
    onsubmit={(event) => {
      event.preventDefault();
      submitDraft();
    }}
  >
    {@render modeSwitchBar()}
    {@render pendingGenerationRow()}
    {@render freeActionInputRow()}
  </form>
</div>
