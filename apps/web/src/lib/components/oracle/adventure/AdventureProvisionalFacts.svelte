<script lang="ts">
  import { tick } from "svelte";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { batchFilterPromotableFacts } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import {
    AdventurePromotionSettings,
    adventurePromotionSettings as defaultSettings,
  } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";
  import { containTab } from "./adventure-phone-surface.js";

  let {
    facts,
    existingTitles,
    onAdd,
    onAddAll,
    settings = defaultSettings,
  }: {
    facts: ProvisionalFact[];
    existingTitles: string[];
    onAdd: (fact: ProvisionalFact) => Promise<void>;
    onAddAll?: (facts: ProvisionalFact[]) => Promise<void>;
    settings?: AdventurePromotionSettings;
  } = $props();

  let savedIds = $state<string[]>([]);
  let discardedIds = $state<string[]>([]);
  let selectedIds = $state<string[]>([]);
  let savingId = $state<string | null>(null);
  let addingAll = $state(false);
  let errorMessage = $state<string | null>(null);
  let expanded = $state(false);
  let optionsOpen = $state(false);
  let search = $state("");
  let kind = $state<ProvisionalFact["kind"] | "all">("all");
  let triggerButton = $state<HTMLButtonElement>();
  let closeButton = $state<HTMLButtonElement>();
  let reviewPanel = $state<HTMLElement>();

  let visibleFacts = $derived(
    batchFilterPromotableFacts(facts, existingTitles, [
      ...savedIds,
      ...discardedIds,
    ]),
  );
  let filteredFacts = $derived(
    visibleFacts.filter((fact) => {
      const query = search.trim().toLocaleLowerCase();
      return (
        (kind === "all" || fact.kind === kind) &&
        (!query ||
          fact.name.toLocaleLowerCase().includes(query) ||
          fact.summary.toLocaleLowerCase().includes(query))
      );
    }),
  );
  let selectedFacts = $derived(
    visibleFacts.filter((fact) => selectedIds.includes(fact.id)),
  );
  let busy = $derived(savingId !== null || addingAll);

  const kindFilters = [
    { kind: "all", label: "All" },
    { kind: "person", label: "People" },
    { kind: "place", label: "Places" },
    { kind: "item", label: "Items" },
    { kind: "clue", label: "Clues" },
    { kind: "faction", label: "Factions" },
    { kind: "event", label: "Events" },
    { kind: "other", label: "Notes" },
  ] as const;

  const typePresentation: Record<
    ProvisionalFact["kind"],
    { icon: string; label: string }
  > = {
    person: { icon: "icon-[lucide--user]", label: "Person" },
    place: { icon: "icon-[lucide--map-pin]", label: "Place" },
    faction: { icon: "icon-[lucide--users]", label: "Faction" },
    item: { icon: "icon-[lucide--package]", label: "Item" },
    event: { icon: "icon-[lucide--calendar]", label: "Event" },
    clue: { icon: "icon-[lucide--lightbulb]", label: "Clue" },
    other: { icon: "icon-[lucide--file-text]", label: "Note" },
  };

  function openReview(): void {
    expanded = true;
    errorMessage = null;
    void tick().then(() => closeButton?.focus());
  }

  function closeReview(): void {
    expanded = false;
    void tick().then(() => triggerButton?.focus());
  }

  function toggleSelection(id: string, checked: boolean): void {
    selectedIds = checked
      ? [...selectedIds.filter((value) => value !== id), id]
      : selectedIds.filter((value) => value !== id);
  }

  function toggleFilteredSelection(checked: boolean): void {
    const ids = new Set(filteredFacts.map((fact) => fact.id));
    selectedIds = checked
      ? [...selectedIds.filter((id) => !ids.has(id)), ...ids]
      : selectedIds.filter((id) => !ids.has(id));
  }

  async function add(fact: ProvisionalFact): Promise<void> {
    if (busy) return;
    savingId = fact.id;
    errorMessage = null;
    try {
      await onAdd(fact);
      savedIds = [...savedIds, fact.id];
      selectedIds = selectedIds.filter((id) => id !== fact.id);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Unable to add this to Codex.";
    } finally {
      savingId = null;
    }
  }

  async function addBatch(toAdd: ProvisionalFact[]): Promise<void> {
    if (toAdd.length === 0 || busy) return;
    addingAll = true;
    errorMessage = null;
    try {
      if (onAddAll) {
        await onAddAll(toAdd);
        savedIds = [...savedIds, ...toAdd.map((fact) => fact.id)];
      } else {
        for (const fact of toAdd) {
          await onAdd(fact);
          savedIds = [...savedIds, fact.id];
        }
      }
      const added = new Set(toAdd.map((fact) => fact.id));
      selectedIds = selectedIds.filter((id) => !added.has(id));
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to add discoveries to Codex.";
    } finally {
      addingAll = false;
    }
  }

  function discard(fact: ProvisionalFact): void {
    if (busy) return;
    discardedIds = [...discardedIds, fact.id];
    selectedIds = selectedIds.filter((id) => id !== fact.id);
  }

  function discardSelected(): void {
    if (busy) return;
    const selected = new Set(selectedFacts.map((fact) => fact.id));
    discardedIds = [...discardedIds, ...selected];
    selectedIds = selectedIds.filter((id) => !selected.has(id));
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (expanded && event.key === "Escape") {
      event.preventDefault();
      closeReview();
    }
  }}
/>

{#if visibleFacts.length > 0}
  <button
    bind:this={triggerButton}
    type="button"
    class="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-theme-border px-2.5 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:gap-2 sm:px-3 sm:text-sm"
    aria-label={`Review ${visibleFacts.length} adventure ${visibleFacts.length === 1 ? "discovery" : "discoveries"}`}
    aria-expanded={expanded}
    aria-controls="adventure-discoveries-review"
    onclick={openReview}
  >
    <span class="icon-[lucide--sparkles] h-4 w-4" aria-hidden="true"></span>
    <span class="rounded-full bg-theme-primary/10 px-1.5 py-0.5 tabular-nums">{visibleFacts.length}</span>
    <span class="hidden sm:inline">Discoveries</span>
  </button>
{/if}

{#if expanded}
  <div class="absolute inset-0 z-40" data-testid="adventure-discovery-overlay">
    <button
      type="button"
      class="absolute inset-0 w-full bg-theme-bg/75"
      aria-label="Close discovery review"
      onclick={closeReview}
    ></button>
    <!-- fallow-ignore-next-line css-broken-reference -->
    <aside
      bind:this={reviewPanel}
      id="adventure-discoveries-review"
      class="absolute inset-0 z-10 flex min-h-0 w-full flex-col overflow-hidden bg-theme-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-lg sm:border-l sm:border-theme-border"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adventure-new-entities"
      onkeydown={(event) => {
        if (reviewPanel) containTab(event, reviewPanel);
      }}
    >
      <header class="shrink-0 space-y-3 border-b border-theme-border p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:p-4">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <h3 id="adventure-new-entities" class="font-header text-lg font-bold text-theme-text">
              Review discoveries
            </h3>
            <p class="text-xs text-theme-text">
              {visibleFacts.length} {visibleFacts.length === 1 ? "discovery" : "discoveries"} awaiting review
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="flex min-h-10 min-w-10 items-center justify-center rounded-md text-theme-text hover:bg-theme-primary/10"
              aria-label="Review preferences"
              aria-expanded={optionsOpen}
              onclick={() => (optionsOpen = !optionsOpen)}
            >
              <span class="icon-[lucide--settings-2] h-4 w-4" aria-hidden="true"></span>
            </button>
            <button
              bind:this={closeButton}
              type="button"
              class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-border text-theme-text hover:bg-theme-primary/10"
              aria-label="Close discoveries"
              onclick={closeReview}
            >
              <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        {#if optionsOpen}
          <label class="flex min-h-10 items-center gap-2 rounded-md bg-theme-primary/5 px-3 text-sm text-theme-text">
            <input
              type="checkbox"
              checked={settings.autoPromote}
              onchange={(event) => settings.setAutoPromote(event.currentTarget.checked)}
              class="accent-theme-primary"
            />
            Auto-promote discoveries to Codex
          </label>
        {/if}
        <label class="flex min-h-11 items-center gap-2 rounded-md border border-theme-border px-3 text-theme-text focus-within:border-theme-primary">
          <span class="icon-[lucide--search] h-4 w-4 shrink-0" aria-hidden="true"></span>
          <input
            type="search"
            bind:value={search}
            placeholder="Search discoveries"
            aria-label="Search discoveries"
            class="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <div class="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter discoveries by type">
          {#each kindFilters as filter (filter.kind)}
            <button
              type="button"
              class={["min-h-9 shrink-0 rounded-md border px-3 text-xs font-medium transition",
                kind === filter.kind
                  ? "border-theme-primary bg-theme-primary/15 text-theme-text"
                  : "border-theme-border text-theme-text hover:bg-theme-primary/10"]}
              aria-pressed={kind === filter.kind}
              onclick={() => (kind = filter.kind)}
            >
              {filter.label}
            </button>
          {/each}
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {#if errorMessage}
          <p class="mb-3 text-sm text-theme-danger" role="alert">{errorMessage}</p>
        {/if}
        {#if filteredFacts.length > 0}
          <div class="mb-3 flex items-center justify-between gap-2">
            <label class="flex items-center gap-2 text-xs text-theme-text">
              <input
                type="checkbox"
                aria-label="Select all filtered discoveries"
                checked={filteredFacts.every((fact) => selectedIds.includes(fact.id))}
                disabled={busy}
                onchange={(event) => toggleFilteredSelection(event.currentTarget.checked)}
                class="accent-theme-primary"
              />
              Select shown ({filteredFacts.length})
            </label>
            <span class="text-xs text-theme-text">{selectedFacts.length} selected</span>
          </div>
          <ul class="space-y-2" id="adventure-new-entities-list">
            {#each filteredFacts as fact (fact.id)}
              <li class="rounded-lg border border-theme-border p-3">
                <div class="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${fact.name}`}
                    checked={selectedIds.includes(fact.id)}
                    disabled={busy}
                    onchange={(event) => toggleSelection(fact.id, event.currentTarget.checked)}
                    class="mt-1 shrink-0 accent-theme-primary"
                  />
                  <span class={[typePresentation[fact.kind].icon, "mt-0.5 h-4 w-4 shrink-0 text-theme-text"]} aria-hidden="true"></span>
                  <div class="min-w-0 flex-1">
                    <p class="break-words font-medium text-theme-text">{fact.name}</p>
                    <p class="mt-0.5 text-micro font-mono uppercase tracking-wider text-theme-text">
                      {typePresentation[fact.kind].label}
                      {#if fact.scenarioId}
                        <span class="ml-2 rounded bg-theme-primary/10 px-1 py-0.5">Scenario</span>
                      {/if}
                    </p>
                  </div>
                </div>
                <p class="mt-2 break-words text-sm leading-relaxed text-theme-text">{fact.summary}</p>
                <div class="mt-3 flex items-center justify-end gap-2 border-t border-theme-border pt-2">
                  <button
                    type="button"
                    class="min-h-9 rounded-md px-2.5 text-xs text-theme-text hover:bg-theme-danger/10 hover:text-theme-danger disabled:opacity-50"
                    disabled={busy}
                    aria-label={`Discard ${fact.name} suggestion`}
                    onclick={() => discard(fact)}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    class="min-h-9 rounded-md border border-theme-border px-3 text-xs font-medium text-theme-text hover:border-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
                    disabled={busy}
                    aria-label={`Add ${fact.name} to Codex`}
                    onclick={() => void add(fact)}
                  >
                    {savingId === fact.id ? "Adding…" : "Add to Codex"}
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="rounded-md border border-theme-border p-4 text-sm text-theme-text" role="status">
            {visibleFacts.length === 0
              ? "All discoveries reviewed. You can return to your adventure."
              : "No discoveries match your search or filter."}
          </p>
        {/if}
      </div>
      <footer class="shrink-0 space-y-2 border-t border-theme-border bg-theme-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        {#if selectedFacts.length > 0}
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-theme-text">{selectedFacts.length} selected</span>
            <button
              type="button"
              class="min-h-9 px-2 text-xs text-theme-text hover:text-theme-danger disabled:opacity-50"
              disabled={busy}
              onclick={discardSelected}
            >
              Dismiss selected
            </button>
            <button
              type="button"
              class="min-h-10 rounded-md bg-theme-primary px-3 text-xs font-semibold text-theme-on-primary disabled:opacity-50"
              disabled={busy}
              onclick={() => void addBatch([...selectedFacts])}
            >
              {addingAll ? "Adding…" : `Add selected (${selectedFacts.length})`}
            </button>
          </div>
        {/if}
        {#if visibleFacts.length > 1}
          <button
            type="button"
            class="min-h-10 w-full rounded-md border border-theme-border px-3 text-xs font-medium text-theme-text hover:border-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
            aria-label="Add all discoveries to Codex"
            disabled={busy}
            onclick={() => void addBatch([...visibleFacts])}
          >
            {addingAll ? "Adding discoveries…" : `Add all ${visibleFacts.length} to Codex`}
          </button>
        {/if}
      </footer>
    </aside>
  </div>
{/if}
