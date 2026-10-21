<script lang="ts">
  import type { Statement } from "biome-engine";

  let {
    statement,
    sourceNumbers,
    anchorPrefix,
  }: {
    statement: Statement;
    /** Source id → the number shown in the sources list. */
    sourceNumbers: Readonly<Record<string, number>>;
    anchorPrefix: string;
  } = $props();

  const BASIS_LABELS = {
    pattern: "Common pattern",
    simplification: "Simplification",
    exception: "Exception",
  } as const;

  const BASIS_ICONS = {
    pattern: "icon-[lucide--check]",
    simplification: "icon-[lucide--minus]",
    exception: "icon-[lucide--triangle-alert]",
  } as const;

  const cited = $derived(
    statement.sourceIds.filter((id) => sourceNumbers[id] !== undefined),
  );
</script>

<span>{statement.text}</span>
<span
  class="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-theme-border px-2 py-0.5 text-[0.7rem] text-theme-muted"
>
  <span class="{BASIS_ICONS[statement.basis]} h-3 w-3" aria-hidden="true"
  ></span>
  <span>{BASIS_LABELS[statement.basis]}</span>
</span>
{#each cited as id (id)}
  <sup class="ml-0.5">
    <a
      href="#{anchorPrefix}-source-{id}"
      class="text-theme-primary hover:underline"
      aria-label="Source {sourceNumbers[id]}">{sourceNumbers[id]}</a
    >
  </sup>
{/each}
