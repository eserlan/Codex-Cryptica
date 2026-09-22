<script lang="ts">
  import type { ComparedSection, Development } from "generator-engine";

  let {
    id,
    previous,
    sectionKey,
  }: { id: string; previous: Development; sectionKey: ComparedSection } =
    $props();
</script>

<div
  {id}
  class="rounded-lg border border-theme-border/70 bg-theme-surface/50 p-3 text-lg sm:text-base text-theme-muted"
>
  <p
    class="font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-muted"
  >
    Before this turn
  </p>
  {#if sectionKey === "peopleWhoCare"}
    <ul class="mt-2 flex flex-col gap-2">
      {#each previous.peopleWhoCare as person, index (index)}
        <li>
          <span class="font-bold text-theme-text">{person.name}</span>
          ({person.role}). Wants: {person.wants}. Clashes with: {person.conflictsWith}
        </li>
      {/each}
    </ul>
  {:else if sectionKey === "playerDirections"}
    <ul class="mt-2 flex flex-col gap-2">
      {#each previous.playerDirections as direction, index (index)}
        <li>
          <span class="font-bold text-theme-text">{direction.title}</span>
          {direction.description}
        </li>
      {/each}
    </ul>
  {:else if sectionKey === "creatorQuestions"}
    <ul class="mt-2 list-disc pl-5">
      {#each previous.creatorQuestions as question, index (index)}
        <li>{question}</li>
      {/each}
    </ul>
  {:else}
    <p class="mt-2 whitespace-pre-wrap">{previous[sectionKey]}</p>
  {/if}
</div>
