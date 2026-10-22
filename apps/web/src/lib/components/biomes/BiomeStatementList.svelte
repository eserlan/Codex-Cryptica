<script lang="ts">
  import type { Statement } from "biome-engine";
  import BiomeStatement from "./BiomeStatement.svelte";

  let {
    statements,
    sourceNumbers,
    anchorPrefix,
  }: {
    statements: Statement[];
    sourceNumbers: Readonly<Record<string, number>>;
    anchorPrefix: string;
  } = $props();
</script>

{#if statements.length > 0}
  <ul class="m-0 flex list-disc flex-col gap-2 pl-5">
    {#each statements as statement (statement.text)}
      <li>
        <BiomeStatement {statement} {sourceNumbers} {anchorPrefix} />
      </li>
    {/each}
  </ul>
{/if}
