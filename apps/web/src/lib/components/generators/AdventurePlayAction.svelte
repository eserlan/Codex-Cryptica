<script lang="ts">
  import {
    selectAdventureForPlay,
    type GeneratedDraft,
    type SelectedAdventureForPlay,
  } from "generator-engine";

  let {
    draft,
    disabled = false,
    aiDisabled = false,
    onplay,
  }: {
    draft: GeneratedDraft;
    disabled?: boolean;
    aiDisabled?: boolean;
    onplay: (selected: SelectedAdventureForPlay) => Promise<void>;
  } = $props();

  const selectedAdventure = $derived.by<SelectedAdventureForPlay | null>(() => {
    if (!draft.content || !draft.lore) return null;
    try {
      return selectAdventureForPlay({
        title: draft.title,
        summary: draft.summary,
        content: draft.content,
        lore: draft.lore,
      });
    } catch {
      return null;
    }
  });

  let busy = $state(false);
  let errorMessage = $state("");

  async function startPlay() {
    if (busy || aiDisabled || !selectedAdventure) return;
    busy = true;
    errorMessage = "";
    try {
      await onplay(selectedAdventure);
    } catch {
      errorMessage =
        "Could not open Adventure Mode. Your generated adventure is still here.";
    } finally {
      busy = false;
    }
  }
</script>

<section
  aria-label="Play generated adventure"
  data-testid="adventure-play-action"
  class="mt-5 space-y-3 border-t border-chrome-border pt-4"
>
  <div class="flex flex-col gap-1">
    <h3 class="text-sm font-bold text-chrome-text">Play with Oracle</h3>
    <p class="text-xs text-chrome-muted">
      Jump into this ready-to-play adventure. The Oracle keeps the
      complications, threats, and GM secrets hidden while you play.
    </p>
  </div>

  {#if aiDisabled}
    <p
      class="text-xs text-chrome-text"
      data-testid="adventure-play-ai-disabled"
    >
      AI Disabled is on in Settings, so Oracle cannot play this adventure. Turn
      it off to play. Your adventure draft stays here.
    </p>
  {/if}

  {#if selectedAdventure}
    <div
      class="flex flex-col gap-3 rounded-lg border border-chrome-border bg-chrome-surface/50 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0 space-y-1">
        <p class="text-sm font-semibold text-chrome-text">
          {selectedAdventure.playerVisible.title}
        </p>
        <p class="text-xs text-chrome-muted line-clamp-2">
          <span class="font-medium text-chrome-text">Situation:</span>
          {selectedAdventure.playerVisible.openingSituation}
        </p>
        <p class="text-xs text-chrome-muted line-clamp-2">
          <span class="font-medium text-chrome-text">Objective:</span>
          {selectedAdventure.playerVisible.primaryObjective}
        </p>
        {#if selectedAdventure.playerVisible.startingLocations.length > 0}
          <p class="text-micro text-chrome-muted">
            {selectedAdventure.playerVisible.startingLocations.length} starting {selectedAdventure
              .playerVisible.startingLocations.length === 1
              ? "location"
              : "locations"}
          </p>
        {/if}
      </div>

      <button
        type="button"
        class="shrink-0 rounded-lg border border-chrome-accent/60 px-4 py-2 text-xs font-semibold text-chrome-text hover:bg-chrome-accent/10 disabled:opacity-50"
        data-testid="play-generated-adventure"
        disabled={disabled || busy || aiDisabled}
        onclick={() => void startPlay()}
      >
        {busy ? "Opening…" : "Play with Oracle"}
      </button>
    </div>

    {#if errorMessage}
      <p role="alert" class="text-xs text-red-400">
        {errorMessage}
      </p>
    {/if}
  {:else}
    <p role="alert" class="text-sm text-chrome-muted">
      This adventure could not be formatted for play with Oracle. Review or
      regenerate the draft.
    </p>
  {/if}
</section>
