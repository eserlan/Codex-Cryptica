<script lang="ts">
  import { MAX_TRAITS_PER_PACKAGE, type Trait } from "schema";

  let { traits, testId }: { traits: Trait[]; testId?: string } = $props();
</script>

{#if traits.length > MAX_TRAITS_PER_PACKAGE}
  <p class="text-helper text-theme-danger" data-testid="species-traits-invalid">
    This snapshot exceeds the {MAX_TRAITS_PER_PACKAGE}-trait limit and cannot be
    displayed.
  </p>
{:else}
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
{/if}
