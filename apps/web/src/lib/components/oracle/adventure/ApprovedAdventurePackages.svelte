<script lang="ts">
  import {
    compareAdventureJsonVersionCandidates,
    type AdventureJsonV1,
    type StoredAdventurePackage,
  } from "@codex/adventure-engine";
  import type { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
  import ApprovedAdventurePackageVersion from "./ApprovedAdventurePackageVersion.svelte";

  let {
    library,
    onStart,
  }: {
    library: AdventurePackageLibrary;
    onStart: (pkg: AdventureJsonV1, hash: string) => void;
  } = $props();

  const groupedPackages = $derived.by(() => {
    const groups = new Map<
      string,
      { id: string; title: string; versions: StoredAdventurePackage[] }
    >();
    for (const item of library.packages) {
      const group = groups.get(item.package.id) ?? {
        id: item.package.id,
        title: item.package.title,
        versions: [],
      };
      group.versions.push(item);
      groups.set(item.package.id, group);
    }
    for (const group of groups.values())
      group.versions.sort(compareAdventureJsonVersionCandidates);
    return [...groups.values()];
  });
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
      {#each groupedPackages as group (group.id)}
        {@const versionCount = `${group.versions.length} ${group.versions.length === 1 ? "version" : "versions"}`}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-3"
          data-testid="approved-package-group-{group.id}"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-theme-text">{group.title}</p>
              <p class="text-xs text-theme-text">{versionCount}</p>
            </div>
          </div>
          <ul class="space-y-2">
            {#each group.versions as item (item.hash)}
              <ApprovedAdventurePackageVersion {item} {library} {onStart} />
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
    {#if library.removalError}
      <p
        class="text-sm text-theme-text"
        role="alert"
        data-testid="approved-package-removal-error"
      >
        {library.removalError}
      </p>
    {/if}
    {#if library.removalMessage}
      <p
        class="text-sm text-theme-text"
        role="status"
        data-testid="approved-package-removal-message"
      >
        {library.removalMessage}
      </p>
    {/if}
    {#if library.resumeError}
      <p class="text-sm text-theme-danger" role="alert">
        {library.resumeError}
      </p>
    {/if}
  </section>
{/if}
