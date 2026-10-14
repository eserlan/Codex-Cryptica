<script lang="ts">
  import type { CodexImportOk } from "random-source-engine";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  type Props = {
    codex: CodexImportOk;
    noun: string;
    sources: RandomSourceStore;
    uniqueName: (base: string) => string;
    onCancel: () => void;
    onConfirm: () => void;
  };
  let { codex, noun, sources, uniqueName, onCancel, onConfirm }: Props =
    $props();
</script>

<!-- fallow-ignore-next-line complexity -->
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
        class="font-body text-meta text-amber-600 dark:text-amber-400"
        data-testid="import-codex-renamed"
      >
        You already have a {noun} called "{codex.source.name}". This one comes
        in as "{uniqueName(codex.source.name)}".
      </p>
    {/if}

    {#if codex.imagePaths.length > 0}
      <p
        class="font-body text-meta text-amber-600 dark:text-amber-400"
        data-testid="import-codex-images"
      >
        {codex.imagePaths.length}
        {codex.imagePaths.length === 1 ? "card refers" : "cards refer"} to a picture.
        Pictures are not carried in a file, so
        {codex.imagePaths.length === 1 ? "it" : "they"} will be blank unless the same
        vault already has
        {codex.imagePaths.length === 1 ? "it" : "them"}.
      </p>
    {/if}
  </div>

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
      onclick={onConfirm}
      class="rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 font-header text-micro font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
      data-testid="import-codex-confirm"
    >
      Import {noun}
    </button>
  </div>
{/if}
