<script lang="ts">
  import type { BiomeAlteration } from "biome-engine";
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeSuggestions from "./BiomeSuggestions.svelte";
  import { ASPECT_LABELS } from "./biome-labels";

  let {
    store,
    alteration,
  }: { store: BiomeExplorerStore; alteration: BiomeAlteration } = $props();

  let newEffect = $state("");

  function addEffect() {
    const text = newEffect.trim();
    if (!text) return;
    store.updateAlteration(alteration.id, {
      effects: [...alteration.effects, text],
    });
    newEffect = "";
  }

  const reminder = $derived(store.reminderFor(alteration.id));
  const field =
    "w-full break-words rounded border border-theme-border bg-theme-bg px-2 py-1 text-theme-text";
</script>

<div
  class="flex flex-col gap-3 rounded-lg border border-theme-border bg-theme-surface p-3"
>
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="rounded-full border border-theme-primary px-2 py-0.5 text-xs text-theme-primary"
      >Fictional</span
    >
    <span class="text-xs text-theme-muted"
      >{ASPECT_LABELS[alteration.aspect]}</span
    >
    {#if alteration.aiAssisted}
      <span class="text-xs text-theme-muted">Suggested by AI</span>
    {/if}
  </div>

  <label class="flex flex-col gap-1 text-sm text-theme-muted">
    <span>What is different?</span>
    <textarea
      rows="2"
      maxlength="4000"
      value={alteration.description}
      oninput={(e) => {
        if (e.currentTarget.value.trim())
          store.updateAlteration(alteration.id, {
            description: e.currentTarget.value,
          });
      }}
      onblur={(e) => {
        // A change always needs a description, so an empty box snaps back.
        if (!e.currentTarget.value.trim())
          e.currentTarget.value = alteration.description;
      }}
      class={field}
    ></textarea>
  </label>

  <label class="flex flex-col gap-1 text-sm text-theme-muted">
    <span>Why does this happen?</span>
    <textarea
      rows="2"
      maxlength="4000"
      value={alteration.cause}
      oninput={(e) =>
        store.updateAlteration(alteration.id, { cause: e.currentTarget.value })}
      class={field}
    ></textarea>
  </label>
  {#if reminder}
    <p class="text-xs text-theme-muted">{reminder}</p>
  {/if}

  <div class="flex flex-col gap-2">
    <p class="text-sm text-theme-muted">What follows from it</p>
    {#if alteration.effects.length > 0}
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm text-theme-text">
        {#each alteration.effects as effect, index (index)}
          <li class="flex items-start justify-between gap-2">
            <span class="min-w-0 break-words">{effect}</span>
            <button
              type="button"
              class="shrink-0 text-xs text-theme-muted hover:text-theme-danger"
              aria-label="Remove effect: {effect}"
              onclick={() =>
                store.updateAlteration(alteration.id, {
                  effects: alteration.effects.filter((_, i) => i !== index),
                })}>Remove</button
            >
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex gap-2">
      <input
        type="text"
        aria-label="Add an effect"
        maxlength="4000"
        bind:value={newEffect}
        class="min-w-0 flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
      />
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
        onclick={addEffect}>Add effect</button
      >
    </div>
  </div>

  {#if store.canSuggest}
    <BiomeSuggestions {store} alterationId={alteration.id} />
  {:else}
    <p class="text-xs text-theme-muted">
      The AI helper is off, so there are no suggestions. You can write the
      effects yourself.
    </p>
  {/if}

  <button
    type="button"
    class="self-start text-xs text-theme-danger hover:underline"
    aria-label="Remove fictional change"
    onclick={() => store.removeAlteration(alteration.id)}
    >Remove this change</button
  >
</div>
