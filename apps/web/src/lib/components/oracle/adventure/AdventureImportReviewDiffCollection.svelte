<script lang="ts">
  import type { AdventureJsonCollectionDiff } from "@codex/adventure-engine";

  let { entry }: { entry: AdventureJsonCollectionDiff } = $props();
</script>

<div class="space-y-2" data-testid="adventure-import-diff-{entry.collection}">
  <h3 class="font-semibold capitalize text-theme-text">{entry.collection}</h3>
  <ul class="space-y-1 text-sm text-theme-text">
    {#each entry.added as item (item.id)}
      <li>
        <span
          class="icon-[lucide--plus] mr-1 inline h-3.5 w-3.5 align-text-bottom text-theme-primary"
          aria-hidden="true"
        ></span>
        Added: {item.title} <span class="font-mono text-xs">({item.id})</span>
      </li>
    {/each}
    {#each entry.removed as item (item.id)}
      <li>
        <span
          class="icon-[lucide--minus] mr-1 inline h-3.5 w-3.5 align-text-bottom text-theme-text"
          aria-hidden="true"
        ></span>
        Removed: {item.title} <span class="font-mono text-xs">({item.id})</span>
      </li>
    {/each}
    {#each entry.changed as item (item.id)}
      <li>
        <span
          class="icon-[lucide--pencil] mr-1 inline h-3.5 w-3.5 align-text-bottom text-theme-primary"
          aria-hidden="true"
        ></span>
        Changed: {item.title} <span class="font-mono text-xs">({item.id})</span>
        {#if item.changedFields.length > 0}
          <span class="text-xs">({item.changedFields.join(", ")})</span>
        {/if}
        {#if item.previousId}
          <span class="text-xs">from {item.previousId}</span>
        {/if}
      </li>
    {/each}
  </ul>
</div>
