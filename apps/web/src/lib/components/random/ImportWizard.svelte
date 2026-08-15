<script lang="ts">
  import {
    detectFormat,
    parseImport,
    type Card,
    type ColumnMapping,
    type ImportFormat,
    type RandomSource,
    type TableEntry,
  } from "random-source-engine";
  import { randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  /**
   * Paste a table in, look at what came out, fix what did not (#2247, FR-034).
   *
   * No bad row aborts the batch: a hundred rows pasted out of a PDF always has
   * a few that do not parse, and making the author fix them before seeing
   * anything is the adoption barrier this feature exists to remove (FR-035).
   */
  let {
    kind = "table",
    sources = randomSources,
    onImport,
    onCancel,
    idGenerator = systemIdGenerator,
  }: {
    kind?: "table" | "deck";
    sources?: RandomSourceStore;
    /** Hands the finished source to the parent, which owns persistence. */
    onImport: (source: RandomSource) => void;
    onCancel: () => void;
    idGenerator?: IdGenerator;
  } = $props();

  type RowChoice = { text?: string; skipped?: boolean };

  const PLACEHOLDER = "01-05\tA lone wolf\n06-10\tA broken cart";
  const CARD_PLACEHOLDER =
    "The Tower\tSudden, necessary ruin.\nThe Star\tA hope worth walking towards.";

  /** Pictures waiting to be matched to a card by filename (FR-036). */
  let images = $state<File[]>([]);
  let imageProblems = $state<string[]>([]);

  let pasted = $state("");
  let name = $state("");
  let format = $state<ImportFormat | undefined>();
  let mapping = $state<ColumnMapping | undefined>();
  let choices = $state<Record<number, RowChoice>>({});
  let collision = $state<"replace" | "merge" | "new" | undefined>();

  const preview = $derived.by(() =>
    pasted.trim().length === 0
      ? undefined
      : kind === "deck"
        ? parseImport(pasted, "lines")
        : parseImport(pasted, format ?? detectFormat(pasted), mapping),
  );

  /**
   * A card row is "Title<tab>What it means" — one obvious separator rather
   * than a guess, because a card body is prose and commas belong in it.
   */
  function splitCard(text: string): { title: string; body: string } {
    const parts = text.includes("\t") ? text.split("\t") : text.split("|");
    const title = (parts[0] ?? "").trim();
    return { title, body: parts.slice(1).join(" ").trim() };
  }

  /** Matches "the-tower.png" to the card called "The Tower". */
  function normalise(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function imageFor(title: string): File | undefined {
    const key = normalise(title);
    if (!key) return undefined;
    return images.find(
      (file) => normalise(file.name.replace(/\.[^.]+$/, "")) === key,
    );
  }

  const columnCount = $derived.by(() => {
    const rows = preview?.rows ?? [];
    // Cell counts are not exposed by the preview, so the mapping controls offer
    // as many columns as the widest raw row actually has.
    return Math.max(
      1,
      ...rows.map(
        (r) =>
          (r.raw.includes("\t") ? r.raw.split("\t") : r.raw.split(/[|,]/))
            .length,
      ),
    );
  });

  const problemCount = $derived(
    (preview?.rows ?? []).filter((r, i) => r.problem && !resolved(i)).length,
  );

  const existing = $derived(
    name.trim() ? sources.findByName(name.trim()) : undefined,
  );

  const entries = $derived.by<TableEntry[]>(() => {
    const rows = preview?.rows ?? [];
    const built: TableEntry[] = [];
    for (const [index, row] of rows.entries()) {
      const choice = choices[index];
      if (choice?.skipped) continue;
      const text = choice?.text ?? row.entry?.text;
      if (text === undefined || text.trim().length === 0) continue;
      built.push({
        // Fresh ids: imported rows carry placeholder ids that would collide
        // with an existing table's on a merge.
        ...(row.entry ?? { weight: 1 }),
        id: idGenerator.uuid(),
        text,
      });
    }
    return built;
  });

  function resolved(index: number): boolean {
    const choice = choices[index];
    return choice?.skipped === true || choice?.text !== undefined;
  }

  function choose(index: number, choice: RowChoice) {
    choices = { ...choices, [index]: { ...choices[index], ...choice } };
  }

  function setFormat(next: ImportFormat) {
    format = next;
    mapping = undefined;
    choices = {};
  }

  function setColumn(role: keyof ColumnMapping, value: number | undefined) {
    const next: ColumnMapping = {
      ...(mapping ?? preview?.columns ?? { text: 0 }),
    };
    if (role === "text") {
      next.text = value ?? 0;
    } else if (value === undefined) {
      delete next[role];
    } else {
      // A row is either weighted or ranged, never both.
      next[role] = value;
      if (role === "range") delete next.weight;
      else delete next.range;
    }
    mapping = next;
    choices = {};
  }

  const builtCards = $derived.by<Card[]>(() =>
    entries.map((entry) => {
      const { title, body } = splitCard(entry.text);
      return { id: entry.id, title, body };
    }),
  );

  const matchedImages = $derived(
    builtCards.filter((card) => imageFor(card.title)).length,
  );

  /**
   * Saves each matched picture, then attaches it.
   *
   * A picture that will not save — a full vault is the usual reason — is
   * reported and skipped, leaving a deck whose cards are all there rather than
   * a half-written import (Edge Cases: storage exhaustion).
   */
  async function attachImages(cards: Card[]): Promise<Card[]> {
    const problems: string[] = [];
    const withImages: Card[] = [];

    for (const card of cards) {
      const file = imageFor(card.title);
      if (!file) {
        withImages.push(card);
        continue;
      }
      try {
        const saved = await vault.saveImageToVault(file, card.id, file.name);
        withImages.push({ ...card, imagePath: saved.image });
      } catch (err) {
        console.error("[RandomSources] Card image failed", err);
        problems.push(file.name);
        withImages.push(card);
      }
    }

    imageProblems = problems;
    return withImages;
  }

  function build(): RandomSource | undefined {
    const current = preview;
    if (!current || entries.length === 0) return undefined;

    if (kind === "deck") return buildDeck();

    const selection: RandomSource["selection"] =
      current.mode === "ranged"
        ? { mode: "ranged", die: { sides: highestValue(entries) } }
        : { mode: "weighted" };

    const target = existing;
    if (target && collision === "merge") {
      return { ...target, entries: [...(target.entries ?? []), ...entries] };
    }
    if (target && collision === "replace") {
      return { ...target, selection, entries };
    }
    return {
      ...sources.create(
        "table",
        target ? uniqueName(name.trim()) : name.trim(),
      ),
      selection,
      entries,
    };
  }

  function buildDeck(): RandomSource {
    const target = existing;
    if (target && collision === "merge") {
      return { ...target, cards: [...(target.cards ?? []), ...builtCards] };
    }
    if (target && collision === "replace") {
      return { ...target, cards: builtCards };
    }
    return {
      ...sources.create("deck", target ? uniqueName(name.trim()) : name.trim()),
      cards: builtCards,
    };
  }

  /** A ranged import's die is the highest number any row claims. */
  function highestValue(list: TableEntry[]): number {
    return Math.max(1, ...list.map((e) => e.range?.max ?? 0));
  }

  function uniqueName(base: string): string {
    let n = 2;
    while (sources.findByName(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  async function confirm() {
    const built = build();
    if (!built) return;
    if (built.kind !== "deck") {
      onImport(built);
      return;
    }

    const cards = await attachImages(built.cards ?? []);
    // Pictures that failed are worth saying out loud, but never worth holding
    // the cards back for.
    if (imageProblems.length > 0) {
      notificationStore.notify(
        `${imageProblems.length} picture${imageProblems.length === 1 ? "" : "s"} could not be saved — your vault may be out of space. The cards imported without them.`,
        "error",
      );
    }
    onImport({ ...built, cards });
  }
</script>

<div
  class="flex flex-col gap-4 rounded-xl border border-theme-border bg-theme-surface p-4"
  data-testid="import-wizard"
>
  <div class="flex items-center justify-between">
    <h2
      class="font-header text-[11px] font-bold uppercase tracking-[0.2em] text-theme-text"
    >
      Import a table
    </h2>
    <button
      type="button"
      onclick={onCancel}
      class="rounded p-1 text-theme-muted transition-colors hover:text-theme-text"
      aria-label="Close import"
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>

  <label class="flex flex-col gap-1">
    <span
      class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
      >Name</span
    >
    <input
      class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
      bind:value={name}
      placeholder="Wilderness encounters"
      data-testid="import-name"
    />
  </label>

  <label class="flex flex-col gap-1">
    <span
      class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
      >Paste your table</span
    >
    <textarea
      rows="6"
      class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
      bind:value={pasted}
      placeholder={kind === "deck" ? CARD_PLACEHOLDER : PLACEHOLDER}
      data-testid="import-paste"
    ></textarea>
  </label>

  {#if preview && kind === "deck"}
    <label class="flex flex-col gap-1">
      <span
        class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >Pictures (matched to cards by file name)</span
      >
      <input
        type="file"
        accept="image/*"
        multiple
        class="font-body text-xs text-theme-text"
        onchange={(e) => (images = Array.from(e.currentTarget.files ?? []))}
        data-testid="import-images"
      />
      {#if images.length > 0}
        <span
          class="font-mono text-[10px] text-theme-muted"
          data-testid="import-image-match"
        >
          {matchedImages} of {images.length} matched a card
        </span>
      {/if}
    </label>
  {/if}

  {#if preview && kind === "table"}
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <span
          class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
          >Shape</span
        >
        <div class="flex overflow-hidden rounded border border-theme-border">
          {#each [{ id: "lines" as const, label: "One per line" }, { id: "delimited" as const, label: "Columns" }, { id: "markdown-table" as const, label: "Markdown table" }] as option}
            <button
              type="button"
              class="px-2.5 py-1.5 font-header text-[10px] uppercase tracking-widest transition-colors {preview.format ===
              option.id
                ? 'bg-theme-primary text-theme-bg'
                : 'bg-theme-bg text-theme-muted hover:text-theme-text'}"
              onclick={() => setFormat(option.id)}
              data-testid="import-format-{option.id}"
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>

      {#if preview.format !== "lines"}
        <!-- Column mapping, because the guess is only a guess (FR-034). -->
        {#each [{ role: "text" as const, label: "Result text" }, { role: "range" as const, label: "Die numbers" }, { role: "weight" as const, label: "Weight" }] as column}
          <label class="flex flex-col gap-1">
            <span
              class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
              >{column.label}</span
            >
            <select
              class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={preview.columns[column.role] ?? ""}
              onchange={(e) =>
                setColumn(
                  column.role,
                  e.currentTarget.value === ""
                    ? undefined
                    : Number(e.currentTarget.value),
                )}
              data-testid="import-column-{column.role}"
            >
              {#if column.role !== "text"}
                <option value="">None</option>
              {/if}
              {#each Array.from({ length: columnCount }, (_, i) => i) as index}
                <option value={index}>Column {index + 1}</option>
              {/each}
            </select>
          </label>
        {/each}
      {/if}
    </div>
  {/if}

  {#if preview}
    <div class="flex items-center justify-between">
      <span
        class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        data-testid="import-summary"
      >
        {entries.length} ready{problemCount > 0
          ? ` · ${problemCount} need a look`
          : ""}
      </span>
    </div>

    <div
      class="max-h-64 overflow-y-auto rounded border border-theme-border"
      data-testid="import-preview"
    >
      {#each preview.rows as row, index}
        {@const choice = choices[index]}
        <div
          class="flex items-center gap-2 border-b border-theme-border/40 px-2 py-1.5 {choice?.skipped
            ? 'opacity-40'
            : ''}"
          data-testid="import-row"
        >
          <span
            class="w-8 shrink-0 text-right font-mono text-[10px] text-theme-muted/60"
            >{index + 1}</span
          >

          {#if row.problem && !resolved(index)}
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="truncate font-mono text-[11px] text-theme-text/80"
                title={row.raw}>{row.raw}</span
              >
              <span
                class="text-[10px] text-amber-600 dark:text-amber-400"
                data-testid="import-problem">{row.problem}</span
              >
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="rounded border border-theme-border px-2 py-0.5 font-header text-[9px] uppercase tracking-widest text-theme-text hover:border-theme-primary hover:text-theme-primary"
                onclick={() => choose(index, { text: row.raw.trim() })}
                data-testid="import-accept"
              >
                Keep as text
              </button>
              <button
                type="button"
                class="rounded border border-theme-border px-2 py-0.5 font-header text-[9px] uppercase tracking-widest text-theme-muted hover:border-red-500 hover:text-red-500"
                onclick={() => choose(index, { skipped: true })}
                data-testid="import-skip"
              >
                Skip
              </button>
            </div>
          {:else}
            <input
              class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-body text-xs text-theme-text focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
              value={choice?.text ?? row.entry?.text ?? row.raw}
              oninput={(e) => choose(index, { text: e.currentTarget.value })}
              aria-label="Result text for row {index + 1}"
              data-testid="import-row-text"
            />
            {#if row.entry?.range}
              <span class="shrink-0 font-mono text-[10px] text-theme-muted"
                >{row.entry.range.min}–{row.entry.range.max}</span
              >
            {:else if row.entry?.weight !== undefined && row.entry.weight !== 1}
              <span class="shrink-0 font-mono text-[10px] text-theme-muted"
                >×{row.entry.weight}</span
              >
            {/if}
            <button
              type="button"
              class="shrink-0 rounded p-1 text-theme-muted transition-colors hover:text-red-500"
              onclick={() => choose(index, { skipped: !choice?.skipped })}
              aria-label="{choice?.skipped ? 'Include' : 'Skip'} row {index +
                1}"
            >
              <span
                aria-hidden="true"
                class="{choice?.skipped
                  ? 'icon-[lucide--undo-2]'
                  : 'icon-[lucide--trash-2]'} h-3.5 w-3.5"
              ></span>
            </button>
          {/if}
        </div>
      {/each}
    </div>

    {#if existing}
      <!-- A name collision is a decision only the author can make (FR-037). -->
      <div
        class="flex flex-col gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3"
        data-testid="import-collision"
      >
        <p class="text-xs text-amber-600 dark:text-amber-400">
          "{existing.name}" already exists. What should happen to it?
        </p>
        <div class="flex flex-wrap gap-2">
          {#each [{ id: "merge" as const, label: "Add to it" }, { id: "replace" as const, label: "Replace its entries" }, { id: "new" as const, label: "Save as a new table" }] as option}
            <button
              type="button"
              class="rounded border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest transition-colors {collision ===
              option.id
                ? 'border-theme-primary bg-theme-primary text-theme-bg'
                : 'border-theme-border text-theme-text hover:border-theme-primary'}"
              onclick={() => (collision = option.id)}
              data-testid="import-collision-{option.id}"
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <div class="flex justify-end gap-2">
    <button
      type="button"
      onclick={onCancel}
      class="rounded border border-theme-border px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-theme-muted"
    >
      Cancel
    </button>
    <button
      type="button"
      onclick={confirm}
      disabled={entries.length === 0 ||
        name.trim().length === 0 ||
        (!!existing && !collision)}
      class="rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg disabled:cursor-not-allowed disabled:opacity-40"
      data-testid="import-confirm"
    >
      Import {entries.length}
      {kind === "deck" ? "cards" : "entries"}
    </button>
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
