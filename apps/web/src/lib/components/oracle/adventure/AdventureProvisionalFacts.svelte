<script lang="ts">
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { batchFilterPromotableFacts } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import {
    AdventurePromotionSettings,
    adventurePromotionSettings as defaultSettings,
  } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";

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
  let savingId = $state<string | null>(null);
  let addingAll = $state(false);
  let errorMessage = $state<string | null>(null);
  let expanded = $state(false);

  let visibleFacts = $derived(
    batchFilterPromotableFacts(facts, existingTitles, [
      ...savedIds,
      ...discardedIds,
    ]),
  );

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

  async function add(fact: ProvisionalFact): Promise<void> {
    savingId = fact.id;
    errorMessage = null;
    try {
      await onAdd(fact);
      savedIds = [...savedIds, fact.id];
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Unable to add this to Codex.";
    } finally {
      savingId = null;
    }
  }

  async function addAll(): Promise<void> {
    if (visibleFacts.length === 0 || addingAll) return;
    addingAll = true;
    errorMessage = null;
    const toAdd = [...visibleFacts];
    try {
      if (onAddAll) {
        await onAddAll(toAdd);
        savedIds = [...savedIds, ...toAdd.map((f) => f.id)];
      } else {
        for (const fact of toAdd) {
          await onAdd(fact);
          savedIds = [...savedIds, fact.id];
        }
      }
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to add all discoveries to Codex.";
    } finally {
      addingAll = false;
    }
  }

  function discard(fact: ProvisionalFact): void {
    discardedIds = [...discardedIds, fact.id];
  }
</script>

{#if visibleFacts.length > 0}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-new-entities"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="adventure-new-entities" class="font-semibold text-theme-text">
          New to Codex
        </h3>
        <p class="text-sm text-theme-text">
          {visibleFacts.length}
          {visibleFacts.length === 1 ? "discovery" : "discoveries"} to review
        </p>
      </div>
      <button
        class="flex min-h-10 items-center gap-1 rounded-md border border-theme-border px-3 text-sm text-theme-text hover:bg-theme-primary/10"
        type="button"
        aria-expanded={expanded}
        aria-controls="adventure-new-entities-list"
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? "Hide" : "Show"}
        <span
          aria-hidden="true"
          class={[
            "icon-[lucide--chevron-down] h-4 w-4 transition-transform",
            expanded && "rotate-180",
          ]}
        ></span>
      </button>
    </div>
    {#if expanded}
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-theme-border pb-2"
      >
        <p class="text-sm text-theme-text">
          Save any player-visible discoveries you want to keep in this campaign.
        </p>
        <div class="flex items-center gap-3">
          <label
            class="flex cursor-pointer items-center gap-1.5 text-xs text-theme-text hover:text-theme-primary"
          >
            <input
              type="checkbox"
              checked={settings.autoPromote}
              onchange={(e) => settings.setAutoPromote(e.currentTarget.checked)}
              class="rounded border-theme-border accent-theme-primary focus:ring-theme-primary"
            />
            <span
              class="icon-[lucide--sparkles] h-3.5 w-3.5 text-theme-text"
              aria-hidden="true"
            ></span>
            Auto-promote discoveries to Codex
          </label>
          {#if visibleFacts.length > 1}
            <button
              class="flex items-center gap-1.5 rounded-md border border-theme-border px-2.5 py-1 text-xs font-medium text-theme-text hover:border-theme-primary hover:bg-theme-primary/10 disabled:cursor-wait disabled:opacity-60"
              type="button"
              disabled={addingAll || savingId !== null}
              onclick={() => void addAll()}
              aria-label="Add all discoveries to Codex"
            >
              <span
                class="icon-[lucide--check-check] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>
              {addingAll ? "Adding all…" : "Add all to Codex"}
            </button>
          {/if}
        </div>
      </div>
      {#if errorMessage}
        <p class="text-sm text-theme-danger" role="alert">{errorMessage}</p>
      {/if}
      <ul id="adventure-new-entities-list" class="space-y-2">
        {#each visibleFacts as fact (fact.id)}
          <li
            class="group flex items-start gap-3 rounded-md border border-theme-border p-3"
          >
            <span
              class={[
                typePresentation[fact.kind].icon,
                "mt-0.5 h-4 w-4 shrink-0 text-theme-text",
              ]}
              aria-hidden="true"
            ></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <p class="truncate font-medium text-theme-text">
                  {fact.name}
                </p>
                <span
                  class="shrink-0 text-micro font-mono uppercase tracking-wider text-theme-text"
                >
                  {typePresentation[fact.kind].label}
                </span>
                {#if fact.scenarioId}
                  <span
                    class="shrink-0 rounded bg-theme-primary/10 px-1 py-0.5 text-micro font-mono uppercase tracking-wider text-theme-text"
                  >
                    Scenario
                  </span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-theme-text">{fact.summary}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                class="rounded-md border border-theme-border px-2 py-1 text-xs text-theme-text hover:border-theme-primary disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={savingId === fact.id || addingAll}
                onclick={() => void add(fact)}
                aria-label={`Add ${fact.name} to Codex`}
              >
                {savingId === fact.id ? "Adding…" : "Add to Codex"}
              </button>
              <button
                class="rounded-md p-1 text-theme-text hover:bg-theme-danger/10 hover:text-theme-danger disabled:opacity-40"
                type="button"
                disabled={addingAll}
                onclick={() => discard(fact)}
                title="Discard suggestion"
                aria-label={`Discard ${fact.name} suggestion`}
              >
                <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"
                ></span>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
