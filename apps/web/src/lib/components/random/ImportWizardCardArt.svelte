<script lang="ts">
  import type { Card } from "random-source-engine";
  import type { ImageAssignment } from "./import-wizard-logic";
  type Props = {
    kind: "table" | "deck";
    images: File[];
    matchedImages: number;
    cardsWithoutImage: number;
    builtCards: Card[];
    assignments: ImageAssignment[];
    builtCardRows: number[];
    unmatchedImages: { file: File; index: number }[];
    onClearImages: () => void;
    onAssignImage: (rowIndex: number, fileIndex: number) => void;
    onCreateCardsFromImages: () => void;
  };
  let {
    kind,
    images,
    matchedImages,
    cardsWithoutImage,
    builtCards,
    assignments,
    builtCardRows,
    unmatchedImages,
    onClearImages,
    onAssignImage,
    onCreateCardsFromImages,
  }: Props = $props();
</script>

<!-- fallow-ignore-next-line complexity -->
{#if kind === "deck" && images.length > 0}
  <!-- Card art in one go: what landed where, and a way to correct the rows
           that are wrong (issue 2264). The pictures themselves come in through
           the one dropzone at the top. -->
  <div class="flex flex-col gap-1.5" data-testid="import-card-art">
    <span
      class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
      >Card pictures</span
    >
    <p class="font-body text-micro text-theme-muted/80">
      Matched by file name, then by anything close, then by number. Pictures are
      copied into your vault, so the deck's art travels with it.
    </p>

    {#if images.length > 0}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <span
          class="font-mono text-micro text-theme-muted"
          data-testid="import-image-match"
        >
          {matchedImages} of {images.length} matched a card{cardsWithoutImage >
          0
            ? ` · ${cardsWithoutImage} card${cardsWithoutImage === 1 ? "" : "s"} without a picture`
            : ""}
        </span>
        <button
          type="button"
          onclick={onClearImages}
          class="rounded border border-theme-border/60 px-2 py-0.5 font-header text-nano uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
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
                  class="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 font-header text-nano uppercase tracking-widest text-amber-600 dark:text-amber-400"
                  data-testid="import-image-guess"
                  >{assigned.method === "order"
                    ? "by number"
                    : "close name"}</span
                >
              {/if}
              <select
                class="max-w-[45%] shrink-0 rounded border border-theme-border bg-theme-bg px-2 py-1 text-meta text-theme-text focus:border-theme-primary focus:outline-none"
                value={assigned ? String(assigned.fileIndex) : "-1"}
                onchange={(e) =>
                  onAssignImage(
                    builtCardRows[index] ?? index,
                    Number(e.currentTarget.value),
                  )}
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
          <p class="font-body text-meta text-amber-600 dark:text-amber-400">
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
              onclick={onCreateCardsFromImages}
              class="rounded border border-theme-primary/30 bg-theme-primary/10 px-2.5 py-1 font-header text-micro font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
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
