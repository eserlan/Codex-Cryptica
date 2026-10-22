<script lang="ts">
  import {
    BIOME_ALTERATION_ASPECTS,
    type BiomeAlterationAspect,
  } from "biome-engine";
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeAlterationCard from "./BiomeAlterationCard.svelte";
  import { ASPECT_LABELS } from "./biome-labels";

  let { store }: { store: BiomeExplorerStore } = $props();

  let newAspect = $state<BiomeAlterationAspect>("climate");
  let newDescription = $state("");
  let addError = $state<string | null>(null);

  const alterations = $derived(store.draft?.profile.alterations ?? []);

  function add() {
    const id = store.addAlteration({
      aspect: newAspect,
      description: newDescription,
    });
    addError =
      id === null ? "Describe what is different before adding it." : null;
    if (id !== null) newDescription = "";
  }

  const STATUS_TEXT = {
    loading: "Thinking of effects…",
    done: "Suggestions ready.",
  } as const;

  const statusText = $derived(
    Object.values(store.suggestions)
      .map((state) =>
        state.status === "error" ? state.message : STATUS_TEXT[state.status],
      )
      .join(" "),
  );
</script>

<fieldset class="flex flex-col gap-4 rounded-xl border border-theme-border p-4">
  <legend class="px-1 text-theme-text">Fictional changes</legend>
  <p class="text-sm text-theme-muted">
    Use these for anything that isn't true of the real world, such as magic or
    an altered sky. Say why it happens and what follows, so the rest of the
    environment still makes sense. These are kept apart from the real-world
    reference.
  </p>

  <p class="sr-only" aria-live="polite" data-testid="biome-suggestion-status">
    {statusText}
  </p>

  {#each alterations as alteration (alteration.id)}
    <BiomeAlterationCard {store} {alteration} />
  {/each}

  <div class="flex flex-col gap-2 border-t border-theme-border pt-3">
    <div class="grid gap-2 sm:grid-cols-[10rem_1fr]">
      <label class="flex flex-col gap-1 text-sm text-theme-muted">
        <span>Part of the environment</span>
        <select
          bind:value={newAspect}
          class="rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        >
          {#each BIOME_ALTERATION_ASPECTS as aspect (aspect)}
            <option value={aspect}>{ASPECT_LABELS[aspect]}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-theme-muted">
        <span>What is different?</span>
        <textarea
          rows="2"
          maxlength="4000"
          bind:value={newDescription}
          class="w-full break-words rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        ></textarea>
      </label>
    </div>
    {#if addError}
      <p role="alert" class="text-sm text-theme-danger">{addError}</p>
    {/if}
    <button
      type="button"
      class="self-start rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary"
      onclick={add}>Add fictional change</button
    >
  </div>
</fieldset>
