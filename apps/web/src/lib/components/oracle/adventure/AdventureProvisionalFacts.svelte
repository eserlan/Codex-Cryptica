<script lang="ts">
  import type { ProvisionalFact } from "@codex/adventure-engine";

  let {
    facts,
    existingTitles,
    onAdd,
  }: {
    facts: ProvisionalFact[];
    existingTitles: string[];
    onAdd: (fact: ProvisionalFact) => Promise<void>;
  } = $props();

  let savedIds = $state<string[]>([]);
  let discardedIds = $state<string[]>([]);
  let savingId = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);
  let expanded = $state(false);
  let visibleFacts = $derived(
    facts.filter(
      (fact) =>
        fact.visibility === "player-visible" &&
        !savedIds.includes(fact.id) &&
        !discardedIds.includes(fact.id) &&
        !existingTitles.some(
          (title) =>
            title.trim().toLocaleLowerCase() ===
            fact.name.trim().toLocaleLowerCase(),
        ),
    ),
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
        <h3
          id="adventure-new-entities"
          class="font-semibold text-theme-primary"
        >
          New to Codex
        </h3>
        <p class="text-sm text-theme-secondary">
          {visibleFacts.length}
          {visibleFacts.length === 1 ? "discovery" : "discoveries"} to review
        </p>
      </div>
      <button
        class="flex min-h-10 items-center gap-1 rounded-md border border-theme-border px-3 text-sm text-theme-primary hover:bg-theme-primary/10"
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
      <p class="text-sm text-theme-secondary">
        Save any player-visible discoveries you want to keep in this campaign.
      </p>
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
                "mt-0.5 h-4 w-4 shrink-0 text-theme-primary",
              ]}
              aria-hidden="true"
            ></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <p class="truncate font-medium text-theme-primary">
                  {fact.name}
                </p>
                <span
                  class="shrink-0 text-[10px] font-mono uppercase tracking-wider text-theme-secondary"
                >
                  {typePresentation[fact.kind].label}
                </span>
              </div>
              <p class="mt-1 text-sm text-theme-secondary">{fact.summary}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                class="rounded-md border border-theme-border px-2 py-1 text-xs text-theme-primary hover:border-theme-primary disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={savingId === fact.id}
                onclick={() => void add(fact)}
                aria-label={`Add ${fact.name} to Codex`}
              >
                {savingId === fact.id ? "Adding…" : "Add to Codex"}
              </button>
              <button
                class="rounded-md p-1 text-theme-secondary hover:bg-theme-danger/10 hover:text-theme-danger"
                type="button"
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
