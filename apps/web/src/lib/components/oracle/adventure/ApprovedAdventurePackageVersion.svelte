<script lang="ts">
  import type {
    AdventureJsonV1,
    StoredAdventurePackage,
  } from "@codex/adventure-engine";
  import type { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";

  let {
    item,
    library,
    onStart,
  }: {
    item: StoredAdventurePackage;
    library: AdventurePackageLibrary;
    onStart: (pkg: AdventureJsonV1, hash: string) => void;
  } = $props();

  const pinned = $derived(library.pinnedByHash.get(item.hash) ?? []);
  const latestPinned = $derived(pinned[0]);
</script>

<li
  class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-theme-border bg-theme-surface p-3"
  data-testid="approved-package-item-{item.package.id}-{item.hash.slice(0, 8)}"
>
  <div class="min-w-0 space-y-0.5">
    <p class="font-semibold text-theme-text">{item.package.title}</p>
    <p class="font-mono text-xs text-theme-text">
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
      onclick={() => onStart(item.package, item.hash)}
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
