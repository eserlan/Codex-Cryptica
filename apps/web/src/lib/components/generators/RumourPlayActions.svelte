<script lang="ts">
  import {
    selectRumourForPlay,
    type GeneratedDraft,
    type SelectedRumourForPlay,
  } from "generator-engine";

  let {
    draft,
    disabled = false,
    onplay,
  }: {
    draft: GeneratedDraft;
    disabled?: boolean;
    onplay: (rumourIndex: number) => Promise<void>;
  } = $props();

  const options = $derived.by(() => {
    if (!draft.content || !draft.lore) return null;
    try {
      return Array.from({ length: 6 }, (_, i) =>
        selectRumourForPlay(
          { title: draft.title, content: draft.content!, lore: draft.lore },
          i + 1,
        ),
      );
    } catch {
      return null;
    }
  });
  let chosen = $state<number | null>(null);
  let busy = $state(false);
  let errorMessage = $state("");

  async function startPlay(rumour: SelectedRumourForPlay) {
    if (busy) return;
    chosen = rumour.index;
    busy = true;
    errorMessage = "";
    try {
      await onplay(rumour.index);
    } catch {
      errorMessage =
        "Could not open Adventure Mode. Your generated rumours are still here.";
    } finally {
      busy = false;
    }
  }
</script>

<section
  aria-label="Play a generated rumour"
  data-testid="rumour-play-actions"
  class="mt-5 space-y-3 border-t border-chrome-border pt-4"
>
  <h3 class="text-sm font-bold text-chrome-text">Play with Oracle</h3>
  <p class="text-xs text-chrome-muted">
    Choose one rumour to explore. The Oracle keeps its GM notes hidden while you
    play. The other five rumours will not be passed to the game.
  </p>
  {#if options}
    <ol class="space-y-2">
      {#each options as rumour (rumour.index)}
        <li
          class="flex flex-col gap-2 rounded-lg border border-chrome-border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-chrome-text">
              {rumour.index}. {rumour.playerVisible.rumour}
            </p>
            <p class="mt-1 text-xs text-chrome-muted">
              Lead: {rumour.playerVisible.lead}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-chrome-accent/60 px-3 py-2 text-xs font-semibold text-chrome-accent hover:bg-chrome-accent/10 disabled:opacity-50"
            data-testid={"play-rumour-" + rumour.index}
            disabled={disabled || busy}
            onclick={() => void startPlay(rumour)}
          >
            {busy && chosen === rumour.index ? "Opening…" : "Play with Oracle"}
          </button>
        </li>
      {/each}
    </ol>
  {:else}
    <p role="alert" class="text-sm text-chrome-muted">
      These rumour sections could not be paired with their GM notes. Generate
      another batch to play without mismatched secrets.
    </p>
  {/if}
  {#if errorMessage}
    <p role="alert" class="text-sm text-red-400">{errorMessage}</p>
  {/if}
</section>
