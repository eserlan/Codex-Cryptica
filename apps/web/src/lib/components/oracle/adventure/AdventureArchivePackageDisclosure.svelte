<script lang="ts">
  import type { AdventureArchiveEntry } from "#lib/services/adventure/adventure-session-repository.js";

  let {
    sourcePackage,
  }: {
    sourcePackage: AdventureArchiveEntry["sourcePackage"];
  } = $props();
</script>

{#if sourcePackage}
  <details class="min-w-0 text-xs text-theme-text">
    <summary
      class="min-h-11 cursor-pointer content-center underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
    >
      Show full package metadata
    </summary>
    <p class="break-all font-mono">
      {sourcePackage.packageId} v{sourcePackage.version} · {sourcePackage.hash}
    </p>
  </details>
{/if}
