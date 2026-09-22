<script lang="ts">
  import type { ComparedSection, Development } from "generator-engine";
  import SectionBefore from "./SectionBefore.svelte";
  import UpdatedButton from "./UpdatedButton.svelte";

  let {
    id,
    title,
    sectionKey,
    changed,
    previous,
    open,
    ontoggle,
  }: {
    id: string;
    title: string;
    sectionKey: ComparedSection;
    /** Whether this turn changed the section. */
    changed: boolean;
    /** The result before this turn, when there is one to show. */
    previous: Development | null;
    open: boolean;
    ontoggle: () => void;
  } = $props();

  const panelId = $derived(`${id}-before`);
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
  <h2 {id} class="font-header text-xl sm:text-lg font-bold text-theme-text">
    {title}
  </h2>
  {#if changed}
    <UpdatedButton
      interactive={previous !== null}
      {open}
      controls={panelId}
      {ontoggle}
    />
  {/if}
</div>
{#if changed && open && previous}
  <div class="mt-2">
    <SectionBefore id={panelId} {previous} {sectionKey} />
  </div>
{/if}
