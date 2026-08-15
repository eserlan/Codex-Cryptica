<script lang="ts">
  import {
    detectFormat,
    isImageFile,
    looksLikeCodexFile,
    matchCardImages,
    normaliseName,
    parseCodexImport,
    parseImport,
    titleFromFileName,
    type Card,
    type CardImageMatchMethod,
    type CodexImportOk,
    type ColumnMapping,
    type ImportFormat,
    type RandomSource,
    type TableEntry,
  } from "random-source-engine";
  import { collectDroppedItems } from "$lib/features/importer/vault-file-collector";
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

  const noun = $derived(kind === "table" ? "table" : "deck");

  type RowChoice = { text?: string; skipped?: boolean };

  const PLACEHOLDER = "01-05\tA lone wolf\n06-10\tA broken cart";
  const CARD_PLACEHOLDER =
    "The Tower\tSudden, necessary ruin.\nThe Star\tA hope worth walking towards.";

  /**
   * A file this app exported, recognised and read whole (issue 2263).
   *
   * Kept apart from the paste flow rather than folded into it: that flow is
   * row-by-row triage of text from somewhere else, and there is nothing to
   * triage in a file that already parses into a complete source.
   */
  let codex = $state<CodexImportOk | undefined>();
  let codexError = $state("");
  let selectedFileName = $state("");
  let isDraggingFile = $state(false);

  function handleFileDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.types?.includes("Files")) {
      isDraggingFile = true;
    }
  }

  function handleFileDragLeave(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
  }

  /**
   * One place to put everything (feedback on #2264): a text file, a pile of
   * card art, or a folder holding both. Pictures are sorted out from text by
   * what they are rather than by which box they were dropped on, so nobody has
   * to know in advance which half of the import they are doing.
   */
  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
    const transfer = e.dataTransfer;
    if (!transfer) return;
    if (!transfer.items) {
      // No entry API at all: loose files still arrive, folders never did.
      acceptFiles(Array.from(transfer.files ?? []));
      return;
    }
    // The folder walk lives here rather than in `dataTransfer.files`, which
    // never exposes a dropped folder's contents at all.
    const items = await collectDroppedItems(transfer);
    acceptFiles(
      items.map((item) => {
        // The collector keys blobs by path; matching works on the file name, so
        // the leaf of that path is what the picture is called.
        const fileName = item.relativePath.split("/").pop() ?? "file";
        return item.file instanceof File && item.file.name === fileName
          ? item.file
          : new File([item.file], fileName, { type: item.file.type });
      }),
    );
  }

  function acceptFiles(files: File[]) {
    if (files.length === 0) return;
    const pictures = kind === "deck" ? files.filter(isImageFile) : [];
    if (pictures.length > 0) addImages(pictures);

    // Whatever is not a picture is text to read; the first one wins, since a
    // source is one document.
    const text = files.find((file) => !pictures.includes(file));
    if (text) void openFile(text);
  }

  /** A deck's import takes its text and its art through the same control. */
  const fileAccept = $derived(
    kind === "deck"
      ? ".md,.txt,.tsv,.csv,text/*,image/*"
      : ".md,.txt,.tsv,.csv,text/*",
  );

  function clearSelectedFile() {
    selectedFileName = "";
    codex = undefined;
    codexError = "";
    pasted = "";
    clearImages();
  }

  /** Pictures waiting to be matched to a card (FR-036, issue 2264). */
  let images = $state<File[]>([]);
  let imageProblems = $state<string[]>([]);
  /**
   * Hand corrections to the automatic matching, keyed by normalised card title
   * rather than row index: rows get skipped and re-ordered while the preview is
   * being fixed up, and a correction should follow the card it was made for.
   * `-1` means "this card gets no picture", which is a real choice and not the
   * same as never having been matched.
   */
  let imageOverrides = $state<Record<string, number>>({});

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

  /** A deck row is edited as its two halves, then written back as one line. */
  function editCardPart(
    index: number,
    current: string,
    part: "title" | "body",
    value: string,
  ) {
    const { title, body } = splitCard(current);
    const nextTitle = part === "title" ? value : title;
    const nextBody = part === "body" ? value : body;
    choose(index, {
      text: nextBody ? `${nextTitle}\t${nextBody}` : nextTitle,
    });
  }

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

  /**
   * Which picture each card ends up with, automatic matching first and hand
   * corrections on top. Nothing is written until Import, so this is the whole
   * decision laid out where it can be argued with (issue 2264).
   */
  const assignments = $derived.by<
    { fileIndex: number; method: CardImageMatchMethod | "chosen" }[]
  >(() => {
    const out: {
      fileIndex: number;
      method: CardImageMatchMethod | "chosen";
    }[] = [];
    if (images.length === 0) return out;

    for (const match of matchCardImages(
      builtCards.map((card) => card.title),
      images.map((file) => file.name),
    )) {
      out[match.cardIndex] = {
        fileIndex: match.fileIndex,
        method: match.method,
      };
    }

    // A hand-picked file wins, and is taken off whichever card the matcher had
    // given it to: one picture, one card.
    for (const [cardIndex, card] of builtCards.entries()) {
      const override = imageOverrides[normaliseName(card.title)];
      if (override === undefined) continue;
      if (override === -1) {
        delete out[cardIndex];
        continue;
      }
      for (const [other, assigned] of out.entries()) {
        if (other !== cardIndex && assigned?.fileIndex === override) {
          delete out[other];
        }
      }
      out[cardIndex] = { fileIndex: override, method: "chosen" };
    }
    return out;
  });

  const matchedImages = $derived(
    assignments.filter((a) => a !== undefined).length,
  );

  const unmatchedImages = $derived.by(() => {
    const used = new Set(assignments.filter(Boolean).map((a) => a.fileIndex));
    return images
      .map((file, index) => ({ file, index }))
      .filter(({ index }) => !used.has(index));
  });

  const cardsWithoutImage = $derived(
    builtCards.filter((_, index) => !assignments[index]).length,
  );

  function addImages(incoming: File[]) {
    const pictures = incoming.filter((file) => isImageFile(file));
    const known = new Set(images.map((file) => file.name));
    images = [...images, ...pictures.filter((file) => !known.has(file.name))];
  }

  function assignImage(title: string, value: number) {
    imageOverrides = { ...imageOverrides, [normaliseName(title)]: value };
  }

  function clearImages() {
    images = [];
    imageOverrides = {};
  }

  /**
   * Turns the pictures nothing claimed into cards, by appending titles read off
   * their file names to the paste box. Going through the paste box rather than
   * around it keeps one path into the deck: the new rows are previewed, edited
   * and matched exactly like pasted ones.
   */
  function createCardsFromImages() {
    const titles = unmatchedImages.map(({ file }) =>
      titleFromFileName(file.name),
    );
    if (titles.length === 0) return;
    const prefix =
      pasted.trim().length === 0 ? "" : `${pasted.replace(/\n+$/, "")}\n`;
    pasted = `${prefix}${titles.join("\n")}`;
  }

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

    for (const [index, card] of cards.entries()) {
      const file = images[assignments[index]?.fileIndex ?? -1];
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

    if (kind === "deck") return buildDeck(builtCards);

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

  function buildDeck(cards: Card[]): RandomSource {
    const target = existing;
    if (target && collision === "merge") {
      return { ...target, cards: [...(target.cards ?? []), ...cards] };
    }
    if (target && collision === "replace") {
      return { ...target, cards };
    }
    return {
      ...sources.create("deck", target ? uniqueName(name.trim()) : name.trim()),
      cards,
    };
  }

  /** A ranged import's die is the highest number any row claims. */
  function highestValue(list: TableEntry[]): number {
    return Math.max(1, ...list.map((e) => e.range?.max ?? 0));
  }

  /**
   * Reads a dropped-in file. A Codex file is taken whole; anything else is
   * text, so it goes into the paste box and the normal flow handles it —
   * which quietly makes a .csv or .tsv on disk importable too.
   */
  async function openFile(file: File | undefined) {
    if (!file) {
      selectedFileName = "";
      return;
    }
    selectedFileName = file.name;
    codex = undefined;
    codexError = "";

    const text = await file.text();
    if (!looksLikeCodexFile(text)) {
      pasted = text;
      return;
    }

    const result = parseCodexImport(text, idGenerator.uuid());
    if (!result.ok) {
      codexError = `That file could not be read: ${result.error}`;
      return;
    }
    if (result.source.kind !== kind) {
      const other = result.source.kind === "deck" ? "deck" : "table";
      codexError = `That file is a ${other}. Open the ${other}s workspace to import it.`;
      return;
    }
    codex = result;
  }

  /**
   * A whole-source import is a copy, so a clashing name is renamed rather than
   * put to the user: none of the entry-level choices ("add to it", "replace
   * its entries") mean anything when the whole thing arrived together.
   */
  function confirmCodex() {
    if (!codex) return;
    const source = codex.source;
    const taken = sources.findByName(source.name);
    onImport(taken ? { ...source, name: uniqueName(source.name) } : source);
  }

  function uniqueName(base: string): string {
    let n = 2;
    while (sources.findByName(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  async function confirm() {
    if (kind !== "deck") {
      const built = build();
      if (built) onImport(built);
      return;
    }
    if (entries.length === 0) return;

    // Pictures are attached to the incoming cards *before* the deck is built,
    // so a merge into an existing deck cannot shift the indexes out from under
    // the matching.
    const cards = await attachImages(builtCards);
    // Pictures that failed are worth saying out loud, but never worth holding
    // the cards back for.
    if (imageProblems.length > 0) {
      notificationStore.notify(
        `${imageProblems.length} picture${imageProblems.length === 1 ? "" : "s"} could not be saved — your vault may be out of space. The cards imported without them.`,
        "error",
      );
    }
    onImport(buildDeck(cards));
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
      Import a {noun}
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

  <div class="flex flex-col gap-1.5">
    <span
      class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
      >{kind === "deck" ? "Open a file or a folder" : "Open a file"}</span
    >
    <!-- One drop target for the whole import: the text of the deck, its art, or
         a folder holding both. What each file is decides where it goes. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-5 text-center transition-all duration-150 {isDraggingFile
        ? 'border-theme-primary bg-theme-primary/10 shadow-inner'
        : selectedFileName || images.length > 0
          ? 'border-theme-primary/40 bg-theme-primary/5'
          : 'border-theme-border/70 bg-theme-bg/40 hover:border-theme-primary/50 hover:bg-theme-primary/5'}"
      ondragover={handleFileDragOver}
      ondragleave={handleFileDragLeave}
      ondrop={handleFileDrop}
      data-testid="import-file-dropzone"
    >
      {#if selectedFileName || images.length > 0}
        <div class="flex flex-col items-center gap-2">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-theme-primary/20 text-theme-primary"
          >
            <span aria-hidden="true" class="icon-[lucide--file-check] h-5 w-5"
            ></span>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            {#if selectedFileName}
              <span
                class="font-mono text-xs font-semibold text-theme-text"
                data-testid="import-file-selected"
              >
                {selectedFileName}
              </span>
            {/if}
            <span class="font-body text-[10px] text-theme-muted">
              {#if images.length > 0}
                {images.length}
                {images.length === 1 ? "picture" : "pictures"} ready{selectedFileName
                  ? " · file loaded"
                  : ""}
              {:else}
                File loaded ready for import
              {/if}
            </span>
          </div>
          <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5 font-header text-[10px] font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary shadow-sm"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--plus] h-3.5 w-3.5 text-theme-muted"
              ></span>
              <span>{kind === "deck" ? "Add more" : "Replace file"}</span>
              <input
                type="file"
                accept={fileAccept}
                multiple={kind === "deck"}
                class="sr-only"
                onchange={(e) =>
                  acceptFiles(Array.from(e.currentTarget.files ?? []))}
                data-testid="import-file"
              />
            </label>
            <button
              type="button"
              onclick={clearSelectedFile}
              class="inline-flex items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 font-header text-[10px] font-bold uppercase tracking-wider text-theme-muted transition-colors hover:border-red-500 hover:text-red-500 shadow-sm"
              data-testid="import-file-clear"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--trash-2] h-3.5 w-3.5"
              ></span>
              <span>Remove</span>
            </button>
          </div>
        </div>
      {:else}
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-theme-primary/10 text-theme-primary"
        >
          <span aria-hidden="true" class="icon-[lucide--upload-cloud] h-5 w-5"
          ></span>
        </div>
        <div class="flex flex-col items-center gap-0.5">
          <p
            class="font-header text-xs font-bold uppercase tracking-wider text-theme-text"
          >
            {kind === "deck"
              ? "Drag a file, or a folder of card art, here"
              : "Drag and drop your file here"}
          </p>
          <p class="font-body text-[10px] text-theme-muted/80">
            {#if kind === "deck"}
              A file exported from Codex Cryptica comes back whole, other text
              lands in the paste box, and pictures are matched to cards by name.
              A folder can hold both.
            {:else}
              A file exported from Codex Cryptica comes back whole. Anything
              else lands in the paste box below.
            {/if}
          </p>
        </div>
        <label
          class="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-theme-primary/40 bg-theme-primary/15 px-4 py-2 font-header text-[10px] font-bold uppercase tracking-wider text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-sm"
        >
          <span aria-hidden="true" class="icon-[lucide--folder-open] h-4 w-4"
          ></span>
          <span>{kind === "deck" ? "Choose files" : "Choose file"}</span>
          <input
            type="file"
            accept={fileAccept}
            multiple={kind === "deck"}
            class="sr-only"
            onchange={(e) =>
              acceptFiles(Array.from(e.currentTarget.files ?? []))}
            data-testid="import-file"
          />
        </label>
      {/if}
    </div>
  </div>

  {#if codexError}
    <p
      class="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 font-body text-xs text-red-500"
      data-testid="import-file-error"
    >
      {codexError}
    </p>
  {/if}

  {#if codex}
    <div
      class="flex flex-col gap-2 rounded border border-theme-primary/30 bg-theme-primary/5 p-3"
      data-testid="import-codex-summary"
    >
      <p class="font-header text-sm font-bold text-theme-text">
        {codex.source.name}
      </p>
      <p class="font-body text-xs text-theme-muted">
        {#if codex.source.kind === "table"}
          {codex.entryCount}
          {codex.entryCount === 1 ? "entry" : "entries"}
        {:else}
          {codex.cardCount}
          {codex.cardCount === 1
            ? "card"
            : "cards"}{#if (codex.source.spreads ?? []).length > 0}, {(
              codex.source.spreads ?? []
            ).length}
            {(codex.source.spreads ?? []).length === 1
              ? "spread"
              : "spreads"}{/if}
        {/if}
        {#if codex.source.labels.length > 0}
          · {codex.source.labels.join(", ")}
        {/if}
      </p>

      {#if sources.findByName(codex.source.name)}
        <!-- Renamed rather than asked about: the whole source arrived at once,
             so merging into an existing one is not a thing the user can mean. -->
        <p
          class="font-body text-[11px] text-amber-600 dark:text-amber-400"
          data-testid="import-codex-renamed"
        >
          You already have a {noun} called "{codex.source.name}". This one comes
          in as "{uniqueName(codex.source.name)}".
        </p>
      {/if}

      {#if codex.imagePaths.length > 0}
        <p
          class="font-body text-[11px] text-amber-600 dark:text-amber-400"
          data-testid="import-codex-images"
        >
          {codex.imagePaths.length}
          {codex.imagePaths.length === 1 ? "card refers" : "cards refer"} to a picture.
          Pictures are not carried in a file, so
          {codex.imagePaths.length === 1 ? "it" : "they"} will be blank unless the
          same vault already has
          {codex.imagePaths.length === 1 ? "it" : "them"}.
        </p>
      {/if}
    </div>

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
        onclick={confirmCodex}
        class="rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
        data-testid="import-codex-confirm"
      >
        Import {noun}
      </button>
    </div>
  {:else}
    <label class="flex flex-col gap-1">
      <span
        class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >Name</span
      >
      <input
        class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
        bind:value={name}
        placeholder={kind === "deck" ? "Major Arcana" : "Wilderness encounters"}
        data-testid="import-name"
      />
    </label>

    <label class="flex flex-col gap-1">
      <span
        class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >{kind === "deck" ? "Paste your cards" : "Paste your table"}</span
      >
      {#if kind === "deck"}
        <span class="font-body text-[10px] text-theme-muted/80">
          One card per line: its name, then a tab, then what it means. A card
          with no meaning yet is fine.
        </span>
      {/if}
      <textarea
        rows="6"
        class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
        bind:value={pasted}
        placeholder={kind === "deck" ? CARD_PLACEHOLDER : PLACEHOLDER}
        data-testid="import-paste"
      ></textarea>
    </label>

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
            {:else if kind === "deck"}
              {@const text = choice?.text ?? row.entry?.text ?? row.raw}
              {@const card = splitCard(text)}
              <input
                class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-header text-xs font-bold text-theme-text focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
                value={card.title}
                oninput={(e) =>
                  editCardPart(index, text, "title", e.currentTarget.value)}
                aria-label="Card name for row {index + 1}"
                data-testid="import-row-title"
              />
              <input
                class="min-w-0 flex-[2] rounded border border-transparent bg-transparent px-1 py-0.5 font-body text-xs text-theme-muted focus:border-theme-primary focus:bg-theme-bg focus:text-theme-text focus:outline-none"
                value={card.body}
                placeholder="What it means"
                oninput={(e) =>
                  editCardPart(index, text, "body", e.currentTarget.value)}
                aria-label="Card meaning for row {index + 1}"
                data-testid="import-row-body"
              />
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
            {#each kind === "deck" ? [{ id: "merge" as const, label: "Add these cards to it" }, { id: "replace" as const, label: "Replace its cards" }, { id: "new" as const, label: "Save as a new deck" }] : [{ id: "merge" as const, label: "Add to it" }, { id: "replace" as const, label: "Replace its entries" }, { id: "new" as const, label: "Save as a new table" }] as option}
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

    {#if kind === "deck" && images.length > 0}
      <!-- Card art in one go: what landed where, and a way to correct the rows
           that are wrong (issue 2264). The pictures themselves come in through
           the one dropzone at the top. -->
      <div class="flex flex-col gap-1.5" data-testid="import-card-art">
        <span
          class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
          >Card pictures</span
        >
        <p class="font-body text-[10px] text-theme-muted/80">
          Matched by file name, then by anything close, then by number. Pictures
          are copied into your vault, so the deck's art travels with it.
        </p>

        {#if images.length > 0}
          <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span
              class="font-mono text-[10px] text-theme-muted"
              data-testid="import-image-match"
            >
              {matchedImages} of {images.length} matched a card{cardsWithoutImage >
              0
                ? ` · ${cardsWithoutImage} card${cardsWithoutImage === 1 ? "" : "s"} without a picture`
                : ""}
            </span>
            <button
              type="button"
              onclick={clearImages}
              class="rounded border border-theme-border/60 px-2 py-0.5 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
              data-testid="import-images-clear"
            >
              Remove pictures
            </button>
          </div>

          {#if builtCards.length > 0}
            <div
              class="max-h-56 overflow-y-auto rounded border border-theme-border"
              data-testid="import-image-preview"
            >
              {#each builtCards as card, index}
                {@const assigned = assignments[index]}
                <div
                  class="flex items-center gap-2 border-b border-theme-border/40 px-2 py-1.5"
                  data-testid="import-image-row"
                >
                  <span
                    class="min-w-0 flex-1 truncate font-body text-xs text-theme-text"
                    >{card.title || `Card ${index + 1}`}</span
                  >
                  {#if assigned && assigned.method !== "name" && assigned.method !== "chosen"}
                    <span
                      class="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 font-header text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-400"
                      data-testid="import-image-guess"
                      >{assigned.method === "order"
                        ? "by number"
                        : "close name"}</span
                    >
                  {/if}
                  <select
                    class="max-w-[45%] shrink-0 rounded border border-theme-border bg-theme-bg px-2 py-1 text-[11px] text-theme-text focus:border-theme-primary focus:outline-none"
                    value={assigned ? String(assigned.fileIndex) : "-1"}
                    onchange={(e) =>
                      assignImage(card.title, Number(e.currentTarget.value))}
                    aria-label="Picture for {card.title || `card ${index + 1}`}"
                    data-testid="import-image-select"
                  >
                    <option value="-1">No picture</option>
                    {#each images as file, fileIndex}
                      <option value={String(fileIndex)}>{file.name}</option>
                    {/each}
                  </select>
                </div>
              {/each}
            </div>
          {/if}

          {#if unmatchedImages.length > 0}
            <div
              class="flex flex-col gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3"
              data-testid="import-images-unmatched"
            >
              <p
                class="font-body text-[11px] text-amber-600 dark:text-amber-400"
              >
                {unmatchedImages.length}
                {unmatchedImages.length === 1 ? "picture" : "pictures"} found no card:
                {unmatchedImages
                  .slice(0, 4)
                  .map(({ file }) => file.name)
                  .join(", ")}{unmatchedImages.length > 4
                  ? `, and ${unmatchedImages.length - 4} more`
                  : ""}
              </p>
              <div>
                <button
                  type="button"
                  onclick={createCardsFromImages}
                  class="rounded border border-theme-primary/30 bg-theme-primary/10 px-2.5 py-1 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
                  data-testid="import-images-make-cards"
                >
                  Make {unmatchedImages.length}
                  {unmatchedImages.length === 1 ? "card" : "cards"} from {unmatchedImages.length ===
                  1
                    ? "it"
                    : "them"}
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
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
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
