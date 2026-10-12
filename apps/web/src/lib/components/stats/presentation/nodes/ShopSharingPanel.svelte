<script lang="ts">
  import type { PlayerCatalogueSettings, StatSheetField } from "schema";
  import { SHAREABLE_SHEET_FIELD_IDS } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PlayerCataloguePreview from "./PlayerCataloguePreview.svelte";

  /**
   * GM controls for sharing a shop's catalogue with players (#3964). Private
   * by default. Only the GM can change this, and players can only browse.
   */
  let {
    field,
    context,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
  } = $props();

  let previewOpen = $state(false);

  const settings = $derived<PlayerCatalogueSettings>(
    field.playerCatalogue ?? { published: false, fields: [] },
  );

  // Only business details this sheet actually has, in the sheet's order.
  const optionalDetails = $derived(
    context.fields.filter(
      (candidate) =>
        SHAREABLE_SHEET_FIELD_IDS.includes(candidate.id) &&
        (candidate.type === "text" || candidate.type === "longtext"),
    ),
  );

  function update(next: PlayerCatalogueSettings) {
    context.onUpdateField(field.id, { playerCatalogue: next });
  }

  function togglePublished(published: boolean) {
    update({ ...settings, published });
    if (!published) previewOpen = false;
  }

  function toggleDetail(id: string, shown: boolean) {
    const rest = settings.fields.filter((existing) => existing !== id);
    update({ ...settings, fields: shown ? [...rest, id] : rest });
  }
</script>

<div
  class="border-b border-theme-border/60 bg-theme-surface/20 px-3 py-2 text-xs text-theme-text"
  data-testid="shop-sharing"
>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <label class="flex items-center gap-2 font-bold">
      <input
        type="checkbox"
        class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary"
        checked={settings.published}
        onchange={(event) =>
          togglePublished((event.target as HTMLInputElement).checked)}
        data-testid="shop-share-toggle"
      />
      Share this catalogue with players
    </label>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      aria-expanded={previewOpen}
      onclick={() => (previewOpen = !previewOpen)}
      data-testid="shop-preview-toggle"
    >
      <span class="icon-[lucide--eye] h-3 w-3" aria-hidden="true"></span>
      Preview as player
    </button>
  </div>

  {#if settings.published}
    <p class="mt-1 text-micro text-theme-muted">
      Players can browse prices and what is available. They cannot buy or change
      anything; you handle every trade. Lines marked Hidden, your line notes,
      purchasing power and GM notes are never shared.
    </p>
    {#if optionalDetails.length > 0}
      <fieldset class="mt-2">
        <legend class="text-micro font-bold text-theme-muted">
          Also show players
        </legend>
        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {#each optionalDetails as detail (detail.id)}
            <label class="flex items-center gap-1.5">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary"
                checked={settings.fields.includes(detail.id)}
                onchange={(event) =>
                  toggleDetail(
                    detail.id,
                    (event.target as HTMLInputElement).checked,
                  )}
                data-testid={`shop-share-detail-${detail.id}`}
              />
              {detail.label}
            </label>
          {/each}
        </div>
      </fieldset>
    {/if}
  {:else}
    <p class="mt-1 text-micro text-theme-muted">
      Private. Nothing about this shop is sent to players.
    </p>
  {/if}
</div>

{#if previewOpen}
  <PlayerCataloguePreview {context} />
{/if}
