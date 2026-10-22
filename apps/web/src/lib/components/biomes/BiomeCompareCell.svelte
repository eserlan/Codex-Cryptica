<script lang="ts">
  import type { ComparisonCell } from "biome-engine";

  let { value }: { value: ComparisonCell } = $props();

  const BASIS_LABELS = {
    pattern: "Common pattern",
    simplification: "Simplification",
    exception: "Exception",
  } as const;
</script>

{#if value.kind === "range"}
  <span>{value.text}</span>
  {#if value.note}
    <span class="block text-xs text-theme-muted">{value.note}</span>
  {/if}
{:else if value.kind === "statements"}
  <ul class="m-0 flex list-disc flex-col gap-1 pl-4">
    {#each value.statements as statement (statement.text)}
      <li>
        {statement.text}
        <span class="ml-1 whitespace-nowrap text-[0.7rem] text-theme-muted"
          >({BASIS_LABELS[statement.basis]})</span
        >
      </li>
    {/each}
  </ul>
{:else}
  <span class="text-theme-muted">Doesn't apply</span>
{/if}
