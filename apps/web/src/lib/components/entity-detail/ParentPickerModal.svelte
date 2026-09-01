<script lang="ts">
  import { tick } from "svelte";
  import { fade, scale } from "svelte/transition";
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { sanitizeId } from "$lib/utils/markdown";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { matchesEntityQuery } from "$lib/utils/entity-search-match";
  import { buildParentCandidates } from "./parent-picker-candidates";

  let {
    isOpen,
    entityId,
    onClose,
  }: {
    isOpen: boolean;
    entityId: string | null;
    onClose: () => void;
  } = $props();

  /** How many matches to render at once — the list is a picker, not a browser. */
  const MAX_RESULTS = 40;

  let query = $state("");
  let activeIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);
  let isSaving = $state(false);

  const entity = $derived(entityId ? vault.entities[entityId] : null);
  // `parent` is normalized on write, while an imported entity keeps the id it
  // arrived with — so both sides of every comparison go through sanitizeId.
  const currentParentId = $derived(
    entity?.parent ? sanitizeId(entity.parent) : undefined,
  );

  const candidates = $derived.by(() => {
    // Nothing to scan while the dialog is shut — this walks the whole vault.
    if (!isOpen || !entityId) return [] as Entity[];
    return buildParentCandidates(entityId, vault.allEntities);
  });

  const matches = $derived(
    candidates.filter((candidate) => matchesEntityQuery(candidate, query)),
  );
  const results = $derived(matches.slice(0, MAX_RESULTS));

  /** Focus returns here on close, so keyboard users resume where they were. */
  let restoreFocusTo: HTMLElement | null = null;

  // Focus the field whenever the dialog opens, and start from a clean query so
  // a reopen never inherits the previous search.
  $effect(() => {
    if (!isOpen) return;
    restoreFocusTo = document.activeElement as HTMLElement | null;
    query = "";
    activeIndex = 0;
    tick().then(() => inputEl?.focus());
    return () => restoreFocusTo?.focus?.();
  });

  // Keep the highlight inside the result list as it shrinks while typing.
  $effect(() => {
    if (activeIndex >= results.length)
      activeIndex = Math.max(results.length - 1, 0);
  });

  async function scrollActiveIntoView() {
    await tick();
    const option = listEl?.querySelectorAll("[data-parent-option]")[
      activeIndex
    ];
    // Guarded: jsdom, where these components are tested, has no scrollIntoView.
    option?.scrollIntoView?.({ block: "nearest" });
  }

  async function selectParent(parentId: string) {
    if (!entityId || isSaving) return;
    if (sanitizeId(parentId) !== currentParentId) {
      isSaving = true;
      try {
        await vault.updateEntity(entityId, { parent: parentId });
      } catch {
        // Closing on a failed write would report a move that never happened.
        notificationStore.notify("Could not set the parent.", "error");
        return;
      } finally {
        isSaving = false;
      }
    }
    onClose();
  }

  async function removeParent() {
    if (!entityId || !currentParentId || isSaving) return;
    isSaving = true;
    try {
      await vault.updateEntity(entityId, { parent: undefined });
    } catch {
      notificationStore.notify("Could not remove the parent.", "error");
      return;
    } finally {
      isSaving = false;
    }
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      // The page's own window listener also acts on Escape, and would deselect
      // the entity behind this dialog. stopPropagation cannot prevent that —
      // both listeners sit on window — so the page defers to us instead, by
      // checking modalUIStore.parentPickerDialog.open before it acts.
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      activeIndex = (activeIndex + 1) % results.length;
      scrollActiveIntoView();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      activeIndex = (activeIndex - 1 + results.length) % results.length;
      scrollActiveIntoView();
      return;
    }
    if (e.key === "Enter") {
      // Only the search field drives the list. Enter on a focused button is
      // that button's own activation — preventing it would fire the
      // highlighted row instead, and re-parent behind the user's back.
      if (e.target !== inputEl) return;
      const choice = results[activeIndex];
      if (choice) {
        e.preventDefault();
        selectParent(choice.id);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && entity}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    transition:fade={{ duration: 150 }}
    onclick={onClose}
    data-testid="parent-picker-backdrop"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-picker-title"
      tabindex="-1"
      class="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 200, start: 0.96 }}
      onclick={(e) => e.stopPropagation()}
      data-testid="parent-picker-modal"
    >
      <header
        class="flex items-start justify-between gap-3 border-b border-theme-border/60 px-5 py-4"
      >
        <div class="min-w-0">
          <h3
            id="parent-picker-title"
            class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
          >
            {currentParentId ? "Change Parent" : "Set Parent"}
          </h3>
          <p class="mt-1 truncate text-xs text-theme-muted">
            Nesting <span class="font-bold text-theme-primary"
              >{entity.title}</span
            > under…
          </p>
        </div>
        <button
          type="button"
          class="p-1 text-theme-muted transition-colors hover:text-theme-text"
          onclick={onClose}
          aria-label="Close"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-5 w-5"></span>
        </button>
      </header>

      <div class="px-5 pt-4">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={query}
          placeholder="Search entities…"
          aria-label="Search for a parent entity"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="parent-picker-results"
          aria-activedescendant={results.length > 0
            ? `parent-picker-option-${activeIndex}`
            : undefined}
          class="w-full rounded-lg border border-theme-border bg-theme-bg px-4 py-2 text-sm text-theme-text outline-none transition-colors placeholder-theme-muted focus:border-theme-primary"
          data-testid="parent-picker-search"
        />
      </div>

      <div
        bind:this={listEl}
        id="parent-picker-results"
        role="listbox"
        aria-label="Parent candidates"
        class="custom-scrollbar my-3 max-h-[45vh] space-y-1 overflow-y-auto px-3"
      >
        {#each results as candidate, index (candidate.id)}
          {@const category = categories.getCategory(candidate.type)}
          <button
            type="button"
            id="parent-picker-option-{index}"
            role="option"
            aria-selected={index === activeIndex}
            data-parent-option
            data-testid="parent-picker-option"
            disabled={isSaving}
            onmouseenter={() => (activeIndex = index)}
            onclick={() => selectParent(candidate.id)}
            class="group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50 {index ===
            activeIndex
              ? 'border-theme-primary/40 bg-theme-primary/10'
              : 'border-transparent hover:border-theme-primary/30 hover:bg-theme-primary/5'}"
          >
            <span
              class="{getIconClass(category?.icon)} h-4 w-4 shrink-0"
              style:color={category?.color}
              aria-hidden="true"
            ></span>
            <span class="min-w-0 flex-1">
              <span
                class="block truncate font-header text-xs font-bold uppercase tracking-widest text-theme-text"
                data-testid="parent-picker-option-title"
              >
                {candidate.title}
              </span>
              <span
                class="block truncate text-[10px] uppercase tracking-tighter text-theme-muted"
              >
                {category?.label || candidate.type}
              </span>
            </span>
            {#if sanitizeId(candidate.id) === currentParentId}
              <span
                class="shrink-0 rounded border border-theme-primary/30 bg-theme-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-theme-secondary"
              >
                Current
              </span>
            {/if}
          </button>
        {:else}
          <div class="px-2 py-4">
            <EmptyState
              icon="icon-[lucide--search-x]"
              headline="No entities found"
              body={query.trim()
                ? `Nothing matches "${query.trim()}"`
                : "There is nothing else this can be nested under yet."}
            />
          </div>
        {/each}
      </div>

      {#if matches.length > results.length}
        <p
          class="px-5 pb-3 text-[10px] text-theme-muted"
          data-testid="parent-picker-truncation"
        >
          Showing {results.length} of {matches.length} — keep typing to narrow it
          down.
        </p>
      {/if}

      <footer
        class="flex items-center justify-between gap-3 border-t border-theme-border/60 bg-theme-bg/10 px-5 py-4"
      >
        {#if currentParentId}
          <button
            type="button"
            onclick={removeParent}
            disabled={isSaving}
            class="text-[10px] font-bold uppercase tracking-widest text-theme-muted transition-colors hover:text-theme-danger disabled:opacity-50"
            data-testid="parent-picker-remove"
          >
            Remove parent
          </button>
        {:else}
          <span></span>
        {/if}
        <button
          type="button"
          onclick={onClose}
          class="rounded-lg border border-theme-border bg-theme-bg/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text"
        >
          Cancel
        </button>
      </footer>
    </div>
  </div>
{/if}
