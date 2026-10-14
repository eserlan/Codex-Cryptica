<script lang="ts">
  import ImportWizardFileDrop from "./ImportWizardFileDrop.svelte";
  import ImportWizardCodexSummary from "./ImportWizardCodexSummary.svelte";
  import ImportWizardPreview from "./ImportWizardPreview.svelte";
  import ImportWizardCardArt from "./ImportWizardCardArt.svelte";
  import ImportWizardTextInput from "./ImportWizardTextInput.svelte";
  import {
    buildFilteredRows,
    buildImageAssignments,
    buildImportedTable,
    findUnmatchedImages,
    nextUniqueName,
    splitCard,
    updateColumnMapping,
    type RowChoice,
  } from "./import-wizard-logic";
  import {
    detectFormat,
    isImageFile,
    looksLikeCodexFile,
    parseCodexImport,
    parseImport,
    titleFromFileName,
    type Card,
    type CodexImportOk,
    type ColumnMapping,
    type ImportFormat,
    type RandomSource,
  } from "random-source-engine";
  import { collectDroppedItems } from "$lib/features/importer/vault-file-collector";
  import { randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

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

  const PLACEHOLDER = "01-05\tA lone wolf\n06-10\tA broken cart";
  const CARD_PLACEHOLDER =
    "The Tower\tSudden, necessary ruin.\nThe Star\tA hope worth walking towards.";

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

  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
    const transfer = e.dataTransfer;
    if (!transfer) return;
    if (!transfer.items) {
      acceptFiles(Array.from(transfer.files ?? []));
      return;
    }
    const items = await collectDroppedItems(transfer);
    acceptFiles(
      items.map((item) => {
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
    const text = files.find((file) => !pictures.includes(file));
    if (text) void openFile(text);
  }

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

  let images = $state<File[]>([]);
  let imageProblems = $state<string[]>([]);
  let imageOverrides = $state<Record<number, number>>({});

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

  const columnCount = $derived.by(() => {
    const rows = preview?.rows ?? [];
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

  const filteredRows = $derived.by(() =>
    buildFilteredRows(preview?.rows ?? [], choices, () => idGenerator.uuid()),
  );

  const entries = $derived(filteredRows.map((r) => r.entry));

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
    mapping = updateColumnMapping(mapping, preview?.columns, role, value);
    choices = {};
  }

  const builtCards = $derived.by<Card[]>(() =>
    filteredRows.map(({ entry }) => {
      const { title, body } = splitCard(entry.text);
      return { id: entry.id, title, body };
    }),
  );

  const builtCardRows = $derived(filteredRows.map((r) => r.rowIndex));

  const assignments = $derived.by(() =>
    buildImageAssignments(builtCards, images, builtCardRows, imageOverrides),
  );

  const matchedImages = $derived(
    assignments.filter((a) => a !== undefined).length,
  );

  const unmatchedImages = $derived(findUnmatchedImages(images, assignments));

  const cardsWithoutImage = $derived(
    builtCards.filter((_, index) => !assignments[index]).length,
  );

  function addImages(incoming: File[]) {
    const pictures = incoming.filter((file) => isImageFile(file));
    const known = new Set(images.map((file) => file.name));
    const nextImages = [...images];
    for (const file of pictures) {
      if (!known.has(file.name)) {
        nextImages.push(file);
      }
    }
    images = nextImages;
  }

  function assignImage(rowIndex: number, value: number) {
    imageOverrides = { ...imageOverrides, [rowIndex]: value };
  }

  function clearImages() {
    images = [];
    imageOverrides = {};
  }

  function createCardsFromImages() {
    const titles = unmatchedImages.map(({ file }) =>
      titleFromFileName(file.name),
    );
    if (titles.length === 0) return;
    const prefix =
      pasted.trim().length === 0 ? "" : `${pasted.replace(/\n+$/, "")}\n`;
    pasted = `${prefix}${titles.join("\n")}`;
  }

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
    return buildImportedTable({
      mode: current.mode,
      entries,
      target: existing,
      collision,
      name: name.trim(),
      createSource: (sourceName) => sources.create("table", sourceName),
      uniqueName,
    });
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

  function confirmCodex() {
    if (!codex) return;
    const source = codex.source;
    const taken = sources.findByName(source.name);
    onImport(taken ? { ...source, name: uniqueName(source.name) } : source);
  }

  function uniqueName(base: string): string {
    return nextUniqueName(base, (candidate) =>
      Boolean(sources.findByName(candidate)),
    );
  }

  async function confirm() {
    if (kind !== "deck") {
      const built = build();
      if (built) onImport(built);
      return;
    }
    if (entries.length === 0) return;
    const cards = await attachImages(builtCards);
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
      class="font-header text-meta font-bold uppercase tracking-[0.2em] text-theme-text"
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

  <ImportWizardFileDrop
    {kind}
    {isDraggingFile}
    {selectedFileName}
    imagesCount={images.length}
    {fileAccept}
    onDragOver={handleFileDragOver}
    onDragLeave={handleFileDragLeave}
    onDrop={handleFileDrop}
    onAcceptFiles={acceptFiles}
    onClearSelectedFile={clearSelectedFile}
  />

  {#if codexError}
    <p
      class="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 font-body text-xs text-red-500"
      data-testid="import-file-error"
    >
      {codexError}
    </p>
  {/if}

  {#if codex}
    <ImportWizardCodexSummary
      {codex}
      {noun}
      {sources}
      {uniqueName}
      {onCancel}
      onConfirm={confirmCodex}
    />
  {:else}
    <ImportWizardTextInput
      {kind}
      bind:name
      bind:pasted
      cardPlaceholder={CARD_PLACEHOLDER}
      placeholder={PLACEHOLDER}
    />

    <ImportWizardPreview
      {kind}
      {preview}
      {choices}
      {entries}
      {problemCount}
      {columnCount}
      {existing}
      {collision}
      {setFormat}
      {setColumn}
      {resolved}
      {choose}
      {editCardPart}
      {splitCard}
      onCollisionChange={(value) => (collision = value)}
    />

    <ImportWizardCardArt
      {kind}
      {images}
      {matchedImages}
      {cardsWithoutImage}
      {builtCards}
      {assignments}
      {builtCardRows}
      {unmatchedImages}
      onClearImages={clearImages}
      onAssignImage={assignImage}
      onCreateCardsFromImages={createCardsFromImages}
    />
    <div class="flex justify-end gap-2">
      <button
        type="button"
        onclick={onCancel}
        class="rounded border border-theme-border px-3 py-1.5 font-header text-micro uppercase tracking-widest text-theme-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={confirm}
        disabled={entries.length === 0 ||
          name.trim().length === 0 ||
          (!!existing && !collision)}
        class="rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 font-header text-micro font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="import-confirm"
      >
        Import {entries.length}
        {kind === "deck" ? "cards" : "entries"}
      </button>
    </div>
  {/if}
</div>
