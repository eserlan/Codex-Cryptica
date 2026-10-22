<script lang="ts">
  import { dialogFocus } from "./biome-dialog-focus";
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();

  const pendingTitle = $derived(
    store.profiles.find((p) => p.id === store.deletePendingId)?.title ?? "",
  );

  const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
  const savedOn = (stamp: number | null) =>
    stamp ? dateFormat.format(new Date(stamp)) : null;
</script>

<section aria-labelledby="my-biomes-heading" class="flex flex-col gap-4">
  <h2 id="my-biomes-heading" class="font-header text-xl text-theme-text">
    My biomes
  </h2>

  {#if store.openError}
    <p role="alert" class="text-sm text-theme-danger">{store.openError}</p>
  {/if}

  {#if store.profiles.length === 0}
    <div
      class="rounded-xl border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/80"
    >
      <p class="mb-3">You haven't saved any biomes yet.</p>
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-theme-primary hover:border-theme-primary"
        onclick={() => store.setView("library")}>Browse biomes</button
      >
    </div>
  {:else}
    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      {#each store.profiles as profile (profile.id)}
        <li
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme-border bg-theme-surface p-4"
        >
          <div class="min-w-0 break-words">
            <p class="font-header text-lg text-theme-text">{profile.title}</p>
            <p class="text-xs text-theme-muted">
              {profile.referenceName
                ? `Based on ${profile.referenceName}`
                : "Started from blank"}
              {#if savedOn(profile.updatedAt)}
                · Saved {savedOn(profile.updatedAt)}
              {/if}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
              aria-label="Open {profile.title}"
              onclick={() => store.openProfile(profile.id)}>Open</button
            >
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
              aria-label="Make a copy of {profile.title}"
              onclick={() => store.duplicateProfile(profile.id)}
              >Make a copy</button
            >
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
              aria-label="Copy {profile.title} as Markdown"
              onclick={() => store.copyProfileMarkdown(profile.id)}
              >Copy as Markdown</button
            >
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-1 text-sm text-theme-danger hover:border-theme-danger"
              aria-label="Delete {profile.title}"
              onclick={() => store.requestDelete(profile.id)}>Delete</button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if store.deletePendingId}
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="biome-delete-title"
    use:dialogFocus={{
      onEscape: () => store.cancelDelete(),
      initial: "[data-keep]",
    }}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div
      class="flex max-w-sm flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    >
      <h2 id="biome-delete-title" class="font-header text-lg text-theme-text">
        Delete “{pendingTitle}”?
      </h2>
      <p class="text-sm text-theme-muted">
        This removes the biome from your vault.
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          data-keep
          class="rounded-lg border border-theme-border px-4 py-2 text-theme-text"
          onclick={() => store.cancelDelete()}>Keep it</button
        >
        <button
          type="button"
          class="rounded-lg border border-theme-danger px-4 py-2 text-theme-danger"
          onclick={() => store.confirmDelete()}>Delete biome</button
        >
      </div>
    </div>
  </div>
{/if}
