<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  import type { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";

  let {
    library,
    onStart,
  }: {
    library: AdventurePackageLibrary;
    onStart: (pkg: AdventureJsonV1, hash: string) => void;
  } = $props();
</script>

{#if library.packages.length > 0}
  <section
    class="mx-auto w-full max-w-5xl space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="approved-packages-heading"
    data-testid="approved-adventure-packages"
  >
    <h2
      id="approved-packages-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Approved Adventure Packages
    </h2>
    <ul class="space-y-2">
      {#each library.packages as item (item.hash)}
        {@const pinned = library.pinnedByHash.get(item.hash) ?? []}
        {@const latestPinned = pinned[0]}
        <li
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-theme-border bg-theme-bg p-3"
          data-testid="approved-package-item-{item.package.id}"
        >
          <div class="min-w-0 space-y-0.5">
            <p class="font-semibold text-theme-text">
              {item.package.title}
            </p>
            <p class="font-mono text-xs text-theme-text">
              {item.package.id} v{item.package.version} · {item.hash.slice(
                0,
                12,
              )}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            {#if latestPinned}
              <button
                type="button"
                data-testid="approved-package-resume-{item.package.id}"
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
              data-testid="approved-package-start-{item.package.id}"
              onclick={() => onStart(item.package, item.hash)}
              class="min-h-10 rounded-lg bg-theme-primary px-3 py-1.5 text-sm font-semibold text-theme-on-primary transition hover:opacity-90"
            >
              Start new session
            </button>
          </div>
        </li>
      {/each}
    </ul>
    {#if library.resumeError}
      <p class="text-sm text-theme-danger" role="alert">
        {library.resumeError}
      </p>
    {/if}
  </section>
{/if}
