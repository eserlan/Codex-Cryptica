<script lang="ts">
  import {
    startSceneCandidates,
    type AdventureJsonV1,
    type StoredAdventurePackage,
  } from "@codex/adventure-engine";
  import AdventurePackageCard from "./AdventurePackageCard.svelte";
  import type { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";

  let {
    item,
    library,
    onStart,
  }: {
    item: StoredAdventurePackage;
    library: AdventurePackageLibrary;
    onStart: (
      pkg: AdventureJsonV1,
      hash: string,
      startSceneId?: string,
    ) => void;
  } = $props();

  const pinned = $derived(library.pinnedByHash.get(item.hash) ?? []);
  const latestPinned = $derived(pinned[0]);
  const candidates = $derived(startSceneCandidates(item.package));
  const hash8 = $derived(item.hash.slice(0, 8));
  let selected = $state(0);

  function start() {
    if (candidates.length > 1) {
      onStart(item.package, item.hash, candidates[selected]?.id);
    } else {
      onStart(item.package, item.hash);
    }
  }
</script>

<li
  class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-theme-border bg-theme-surface p-3"
  data-testid="approved-package-item-{item.package.id}-{item.hash.slice(0, 8)}"
>
  <div class="min-w-0 flex-1 basis-60 space-y-2">
    <AdventurePackageCard pkg={item.package} />
    {#if candidates.length > 1}
      <fieldset class="min-w-0 space-y-1">
        <legend class="text-sm font-medium text-theme-text">
          Starting point
        </legend>
        {#each candidates as scene, index (index)}
          <label
            class="flex min-h-10 cursor-pointer items-start gap-2 rounded-md border border-theme-border p-2 text-sm text-theme-text"
          >
            <input
              type="radio"
              class="mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
              name="approved-package-start-{item.hash}"
              value={String(index)}
              checked={selected === index}
              onchange={() => (selected = index)}
              data-testid="approved-package-start-option-{item.package
                .id}-{hash8}-{index}"
            />
            <span class="min-w-0 break-words">
              {#if scene.visibility === "gm-only"}
                Alternative start (details hidden)
              {:else}
                <span class="font-medium">{scene.title}</span>
                <span class="block text-xs">{scene.summary}</span>
              {/if}
            </span>
          </label>
        {/each}
      </fieldset>
    {/if}
    <p class="font-mono text-xs break-all text-theme-text">
      {item.package.id} v{item.package.version} · {item.hash.slice(0, 12)}
    </p>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    {#if latestPinned}
      <button
        type="button"
        data-testid="approved-package-resume-{item.package.id}-{item.hash.slice(
          0,
          8,
        )}"
        disabled={library.resumingId !== null}
        onclick={() => void library.resume(latestPinned)}
        class="min-h-10 rounded-lg border border-theme-primary/50 bg-theme-surface px-3 py-1.5 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {library.resumingId === latestPinned.id
          ? "Resuming…"
          : `Resume (${latestPinned.title})`}
      </button>
    {/if}
    <button
      type="button"
      data-testid="approved-package-start-{item.package.id}-{item.hash.slice(
        0,
        8,
      )}"
      onclick={start}
      class="min-h-10 rounded-lg bg-theme-primary px-3 py-1.5 text-sm font-semibold text-theme-on-primary transition hover:opacity-90"
    >
      Start new session
    </button>
    <button
      type="button"
      data-testid="approved-package-remove-{item.package.id}-{item.hash.slice(
        0,
        8,
      )}"
      disabled={library.removingHash !== null}
      onclick={() => void library.remove(item)}
      class="min-h-10 rounded-lg border border-theme-border px-3 py-1.5 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {library.removingHash === item.hash ? "Removing…" : "Remove version"}
    </button>
  </div>
</li>
