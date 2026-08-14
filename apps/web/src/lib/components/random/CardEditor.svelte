<script lang="ts">
  import type { Card, Diagnostic, RandomSource } from "random-source-engine";
  import { parseReferences } from "random-source-engine";
  import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
  import SourceIdentityFields from "./SourceIdentityFields.svelte";
  import DeckView from "./DeckView.svelte";

  /**
   * Authoring surface for one deck (#2247, FR-008).
   *
   * Controlled, like the table editor: every edit hands the parent a new
   * source. Card ids are minted once at creation and never again — draw state
   * records cards by id, so regenerating them would silently reset the deck
   * (FR-024, quickstart gotchas).
   */
  let {
    source,
    diagnostics = [],
    onChange,
    onRename,
    idGenerator = systemIdGenerator,
  }: {
    source: RandomSource;
    diagnostics?: Diagnostic[];
    onChange: (next: RandomSource) => void;
    /** Passed through to the name field; see `SourceIdentityFields`. */
    onRename?: (name: string) => boolean;
    idGenerator?: IdGenerator;
  } = $props();

  const cards = $derived(source.cards ?? []);
  const options = $derived(
    source.deckOptions ?? {
      drawMode: "without-replacement" as const,
      allowReversals: false,
    },
  );

  const generalDiagnostics = $derived(diagnostics.filter((d) => !d.entryId));

  const diagnosticsByCard = $derived.by(() => {
    const map = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
      if (!d.entryId) continue;
      map.set(d.entryId, [...(map.get(d.entryId) ?? []), d]);
    }
    return map;
  });

  let expanded = $state<string | undefined>();

  function update(changes: Partial<RandomSource>) {
    onChange({ ...source, ...changes });
  }

  function updateCards(next: Card[]) {
    update({ cards: next });
  }

  function patchCard(id: string, changes: Partial<Card>) {
    updateCards(cards.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  function addCard() {
    const card: Card = { id: idGenerator.uuid(), title: "", body: "" };
    updateCards([...cards, card]);
    expanded = card.id;
  }

  function removeCard(id: string) {
    updateCards(cards.filter((c) => c.id !== id));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    updateCards(next);
  }

  function setOptions(changes: Partial<RandomSource["deckOptions"] & object>) {
    update({ deckOptions: { ...options, ...changes } });
  }

  function references(text: string): string[] {
    return parseReferences(text).map((r) => r.name);
  }
</script>

<div class="flex flex-col gap-4" data-testid="deck-editor">
  <SourceIdentityFields {source} {onChange} {onRename} />

  <div class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >How cards are drawn</span
      >
      <div class="flex overflow-hidden rounded border border-theme-border">
        {#each [{ id: "without-replacement" as const, label: "Keep a discard pile" }, { id: "with-replacement" as const, label: "Always full deck" }] as option}
          <button
            type="button"
            class="px-3 py-1.5 font-header text-[10px] uppercase tracking-widest transition-colors {options.drawMode ===
            option.id
              ? 'bg-theme-primary text-theme-bg'
              : 'bg-theme-bg text-theme-muted hover:text-theme-text'}"
            onclick={() => setOptions({ drawMode: option.id })}
            data-testid="draw-mode-{option.id}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <label class="flex items-center gap-2 pb-2">
      <input
        type="checkbox"
        checked={options.allowReversals}
        onchange={(e) =>
          setOptions({ allowReversals: e.currentTarget.checked })}
        data-testid="allow-reversals"
      />
      <span class="font-body text-xs text-theme-text">
        Cards can come up reversed
      </span>
    </label>
  </div>

  {#each generalDiagnostics as diagnostic}
    <p
      class="rounded border px-3 py-2 font-body text-xs {diagnostic.severity ===
      'error'
        ? 'border-red-500/40 bg-red-500/10 text-red-500'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'}"
      data-testid="deck-diagnostic"
    >
      {diagnostic.message}
    </p>
  {/each}

  <div class="flex items-center justify-between">
    <span
      class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
    >
      Cards ({cards.length})
    </span>
    <button
      type="button"
      class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
      onclick={addCard}
      data-testid="add-card"
    >
      <span aria-hidden="true" class="icon-[lucide--plus] h-3 w-3"></span>
      Add card
    </button>
  </div>

  <ul
    class="flex max-h-[26rem] flex-col overflow-y-auto rounded border border-theme-border"
    data-testid="card-list"
  >
    {#each cards as card, index (card.id)}
      {@const problems = diagnosticsByCard.get(card.id) ?? []}
      <li class="flex flex-col gap-1 border-b border-theme-border/40 p-2">
        <div class="flex items-center gap-2">
          <span
            class="w-8 shrink-0 text-right font-mono text-[10px] text-theme-muted/60"
            >{index + 1}</span
          >
          <input
            aria-label="Title of card {index + 1}"
            placeholder="Card title"
            class="min-w-0 flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
            value={card.title}
            oninput={(e) =>
              patchCard(card.id, { title: e.currentTarget.value })}
            data-testid="card-title"
          />
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="{expanded === card.id
                ? 'Hide'
                : 'Show'} the text of card {index + 1}"
              onclick={() =>
                (expanded = expanded === card.id ? undefined : card.id)}
              class="rounded p-1 text-theme-muted transition-colors hover:text-theme-primary"
              data-testid="toggle-card"
            >
              <span
                aria-hidden="true"
                class="{expanded === card.id
                  ? 'icon-[lucide--chevron-up]'
                  : 'icon-[lucide--chevron-down]'} h-3.5 w-3.5"
              ></span>
            </button>
            <button
              type="button"
              aria-label="Move card {index + 1} up"
              disabled={index === 0}
              onclick={() => move(index, -1)}
              class="rounded p-1 text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-25"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--arrow-up] h-3.5 w-3.5"
              ></span>
            </button>
            <button
              type="button"
              aria-label="Move card {index + 1} down"
              disabled={index === cards.length - 1}
              onclick={() => move(index, 1)}
              class="rounded p-1 text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-25"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--arrow-down] h-3.5 w-3.5"
              ></span>
            </button>
            <button
              type="button"
              aria-label="Delete card {index + 1}"
              onclick={() => removeCard(card.id)}
              class="rounded p-1 text-theme-muted transition-colors hover:text-red-500"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--trash-2] h-3.5 w-3.5"
              ></span>
            </button>
          </div>
        </div>

        {#if expanded === card.id}
          <div class="flex flex-col gap-2 pl-10 pr-2">
            <textarea
              rows="2"
              aria-label="Text of card {index + 1}"
              placeholder="What the card means"
              class="rounded border border-theme-border bg-theme-bg px-2 py-1 font-body text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={card.body}
              oninput={(e) =>
                patchCard(card.id, { body: e.currentTarget.value })}
              data-testid="card-body"
            ></textarea>
            {#if options.allowReversals}
              <textarea
                rows="2"
                aria-label="Reversed meaning of card {index + 1}"
                placeholder="What it means reversed"
                class="rounded border border-theme-border bg-theme-bg px-2 py-1 font-body text-xs text-theme-text focus:border-theme-primary focus:outline-none"
                value={card.reversedMeaning ?? ""}
                oninput={(e) =>
                  patchCard(card.id, {
                    reversedMeaning: e.currentTarget.value,
                  })}
                data-testid="card-reversed"
              ></textarea>
            {/if}
          </div>
        {/if}

        {#if problems.length > 0}
          <span
            class="pl-10 text-[10px] text-amber-600 dark:text-amber-400"
            data-testid="card-diagnostic"
          >
            {problems[0].message}
          </span>
        {:else if references(card.body).length > 0}
          <span
            class="pl-10 font-mono text-[10px] text-theme-primary/80"
            data-testid="card-references"
          >
            pulls in {references(card.body).join(", ")}
          </span>
        {/if}
      </li>
    {/each}
  </ul>

  <!-- Drawing sits beside authoring, exactly as rolling does for tables. -->
  <DeckView deck={source} />
</div>

<style>
  @reference "../../../app.css";
</style>
