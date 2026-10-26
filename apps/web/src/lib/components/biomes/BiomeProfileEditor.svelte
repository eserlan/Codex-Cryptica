<script lang="ts">
  import { computeDepartures } from "biome-engine";
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";
  import BiomeAlterationList from "./BiomeAlterationList.svelte";
  import BiomeAttachments from "./BiomeAttachments.svelte";
  import BiomeClimateFields from "./BiomeClimateFields.svelte";
  import BiomeTextFields from "./BiomeTextFields.svelte";
  import BiomeEditorActions from "./BiomeEditorActions.svelte";
  import BiomeDiscardDialog from "./BiomeDiscardDialog.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();

  const draft = $derived(store.draft);
  const departures = $derived(draft ? computeDepartures(draft.profile) : []);
  const climate = $derived(departures.find((d) => d.aspect === "climate"));
  const titleError = $derived(store.errors.find((e) => e.field === "title"));
</script>

{#if draft}
  <form
    class="flex flex-col gap-6"
    onsubmit={(event) => {
      event.preventDefault();
      void store.save();
    }}
  >
    <div class="flex flex-col gap-2">
      <label for="biome-title" class="text-sm text-theme-muted">Name</label>
      <input
        id="biome-title"
        type="text"
        maxlength="120"
        value={draft.title}
        oninput={(e) => store.setTitle(e.currentTarget.value)}
        aria-invalid={titleError ? "true" : undefined}
        aria-describedby={titleError ? "biome-title-error" : undefined}
        class="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-theme-text focus:border-theme-primary focus:outline-none"
      />
      {#if titleError}
        <p
          id="biome-title-error"
          role="alert"
          class="text-sm text-theme-danger"
        >
          {titleError.message}
        </p>
      {/if}
      {#if draft.profile.reference}
        <p class="text-sm text-theme-muted">
          Based on {draft.profile.reference.name}. The reference stays
          unchanged; your edits sit beside it.
        </p>
      {/if}
    </div>

    <BiomeClimateFields
      {store}
      referenceSummary={climate?.referenceSummary ?? ""}
      changed={climate?.changed ?? false}
    />
    <BiomeTextFields {store} {departures} />
    <BiomeAlterationList {store} />
    <BiomeAttachments {store} />

    {#if store.warnings.length > 0}
      <p class="text-sm text-theme-muted" role="status">
        Saved. A reminder: some fictional changes have no cause written yet.
      </p>
    {/if}

    {#if store.saveError}
      <p role="alert" class="text-sm text-theme-danger">{store.saveError}</p>
    {/if}

    <BiomeEditorActions {store} />
  </form>

  <BiomeDiscardDialog {store} />
{/if}
