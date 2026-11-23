<!-- fallow-ignore-file css-broken-reference -- overflow-y-auto is a valid Tailwind utility; the class check misreads it. -->
<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { focusTrap } from "#lib/actions/focusTrap.js";
  import { portalTo } from "./adventure-phone-surface.js";

  let {
    manager,
    disabled,
    visible,
    chips = false,
    overlayHost,
    onSubmitStart,
  }: {
    manager: AdventureManager;
    disabled: boolean;
    visible: boolean;
    /** Show suggestions as collapsible chips instead of a collapsed list. */
    chips?: boolean;
    overlayHost?: HTMLElement;
    onSubmitStart?: () => void | Promise<void>;
  } = $props();

  const uid = $props.id();
  const sheetId = `adventure-suggested-actions-sheet-${uid}`;
  const sheetTitleId = `adventure-suggested-actions-title-${uid}`;

  let chipsCollapsed = $state(false);
  let sheetOpen = $state(false);
  let submitting = $state(false);
  let triggerButton = $state<HTMLButtonElement>();
  let chipsToggleButton = $state<HTMLButtonElement>();
  let closeButton = $state<HTMLButtonElement>();

  const count = $derived(manager.suggestedActions.length);
  const triggerLabel = $derived(
    `${count} suggested ${count === 1 ? "action" : "actions"}`,
  );
  const toggleLabel = $derived(
    chipsCollapsed ? `Suggested actions (${count})` : "Hide suggestions",
  );
  const chevronClass = $derived(
    `icon-[lucide--chevron-up] h-3.5 w-3.5 shrink-0 transition-transform ${chipsCollapsed ? "rotate-180" : ""}`,
  );
  const chipContainerClass = $derived(
    visible ? "flex flex-col gap-1.5 pb-1" : "hidden",
  );
  const phoneContainerClass = $derived(
    visible ? "flex items-center" : "hidden",
  );

  $effect(() => {
    if (sheetOpen && (!visible || chips || count === 0)) {
      sheetOpen = false;
      if (visible && chips && count > 0) {
        void tick().then(() => chipsToggleButton?.focus());
      }
    }
  });

  function openSheet(): void {
    triggerButton?.focus();
    sheetOpen = true;
    void tick().then(() => closeButton?.focus());
  }

  function closeSheet(): void {
    if (visible && triggerButton?.isConnected) {
      triggerButton.focus();
    }
    sheetOpen = false;
  }

  async function selectSuggestion(
    suggestion: string,
    closeAfter: boolean,
  ): Promise<void> {
    if (disabled || submitting) return;
    submitting = true;
    if (closeAfter) {
      closeSheet();
    }
    try {
      const submission = manager.submitSuggestedAction(suggestion);
      if (closeAfter) await onSubmitStart?.();
      await submission;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (sheetOpen && event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      event.stopPropagation();
      closeSheet();
    }
  }}
/>

{#snippet actionList(btnClass: string, closeAfter = false)}
  {#each manager.suggestedActions as suggestion (suggestion)}
    <button
      class={btnClass}
      type="button"
      disabled={disabled || submitting}
      onclick={() => void selectSuggestion(suggestion, closeAfter)}
    >
      {suggestion}
    </button>
  {/each}
{/snippet}

{#if count > 0 && chips}
  <!-- Roomy screens: show the options up front with a compact collapse toggle
       so the player can reclaim transcript space. Phones keep the compact
       disclosure below so the free-action composer stays reachable. -->
  <div class={chipContainerClass} data-testid="adventure-suggested-actions">
    <div class="flex justify-center">
      <button
        bind:this={chipsToggleButton}
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-border bg-theme-bg px-3 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        aria-expanded={!chipsCollapsed}
        data-testid="adventure-suggested-actions-toggle"
        onclick={() => (chipsCollapsed = !chipsCollapsed)}
      >
        <span
          class="icon-[lucide--list-checks] h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        ></span>
        {toggleLabel}
        <span class={chevronClass} aria-hidden="true"></span>
      </button>
    </div>
    {#if !chipsCollapsed}
      <div
        class="flex max-h-36 flex-wrap justify-center gap-2 overflow-y-auto overscroll-contain pb-1"
        role="group"
        aria-label="Suggested actions"
      >
        {@render actionList(
          "min-h-10 max-w-full rounded-2xl border border-theme-border bg-theme-bg px-3 py-1.5 text-left text-sm leading-snug whitespace-normal text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50 xl:flex-1",
        )}
      </div>
    {/if}
  </div>
{:else if count > 0}
  <!-- Compact pill disclosure keeps portrait-phone reading space open while
       letting the player summon full choices in a bounded bottom sheet. -->
  <div class={phoneContainerClass} data-testid="adventure-suggested-actions">
    <button
      bind:this={triggerButton}
      type="button"
      class="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-theme-text/75 bg-theme-bg px-3 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      data-testid="adventure-suggested-actions-toggle"
      aria-expanded={sheetOpen}
      aria-haspopup="dialog"
      aria-controls={sheetId}
      onclick={openSheet}
    >
      <span
        class="icon-[lucide--list-checks] h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      ></span>
      <span>{triggerLabel}</span>
      <span
        class="icon-[lucide--chevron-up] h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      ></span>
    </button>
  </div>
  {#if sheetOpen}
    <div
      class={overlayHost ? "absolute inset-0 z-40" : "fixed inset-0 z-50"}
      data-testid="adventure-suggested-actions-overlay"
      use:portalTo={overlayHost}
    >
      <button
        type="button"
        class="absolute inset-0 w-full bg-theme-bg/75"
        aria-label="Close suggested actions"
        data-testid="adventure-suggested-actions-backdrop"
        onclick={closeSheet}
      ></button>
      <div
        id={sheetId}
        tabindex="-1"
        use:focusTrap
        role="dialog"
        aria-modal="true"
        aria-labelledby={sheetTitleId}
        data-testid="adventure-suggested-actions-sheet"
        class="absolute inset-x-0 bottom-0 z-10 flex max-h-[65%] flex-col overflow-hidden rounded-t-xl border-t border-theme-border bg-theme-surface shadow-2xl"
      >
        <div
          class="flex items-center justify-between gap-3 border-b border-theme-border px-4 py-3"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="icon-[lucide--list-checks] h-4 w-4 shrink-0 text-theme-text"
              aria-hidden="true"
            ></span>
            <h3
              id={sheetTitleId}
              class="font-header truncate text-sm font-bold text-theme-text"
            >
              Suggested actions ({count})
            </h3>
          </div>
          <button
            bind:this={closeButton}
            type="button"
            class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text/75 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
            aria-label="Close suggested actions"
            data-testid="adventure-suggested-actions-close"
            onclick={closeSheet}
          >
            <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
          </button>
        </div>
        <div
          class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          role="group"
          aria-label="Suggested actions"
          data-testid="adventure-suggested-actions-list"
        >
          {@render actionList(
            "min-h-11 w-full rounded-lg border border-theme-text/75 bg-theme-bg px-3 py-2.5 text-left text-sm leading-snug whitespace-normal break-words text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text disabled:cursor-not-allowed disabled:bg-theme-surface",
            true,
          )}
        </div>
      </div>
    </div>
  {/if}
{/if}
