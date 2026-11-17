<script lang="ts">
  import type { Trait } from "schema";

  let { traits, testId }: { traits: Trait[]; testId?: string } = $props();
</script>

<ul class="flex flex-col gap-1" data-testid={testId}>
  {#each traits as trait (trait.id)}
    <li class="text-xs text-theme-text">
      <span class="font-bold">{trait.name}</span>
      {#if trait.description}
        <span> {trait.description}</span>
      {/if}
    </li>
  {/each}
</ul>
