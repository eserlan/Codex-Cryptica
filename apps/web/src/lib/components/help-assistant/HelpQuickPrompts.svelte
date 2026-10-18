<script lang="ts">
  let {
    prompts,
    onAsk,
  }: {
    prompts: readonly string[];
    onAsk: (question: string) => void;
  } = $props();
</script>

{#if prompts.length > 0}
  <div class="flex flex-col gap-2" data-testid="help-quick-prompts">
    <p id="help-quick-prompts-label" class="text-meta text-chrome-muted">
      Questions you can ask Cif
    </p>
    <ul class="flex flex-col gap-2" aria-labelledby="help-quick-prompts-label">
      {#each prompts as prompt (prompt)}
        <li>
          <button
            type="button"
            onclick={() => onAsk(prompt)}
            class="touch-target w-full rounded border border-chrome-border bg-chrome-surface/60 px-3 py-2 text-left text-body-ui text-chrome-text transition hover:border-chrome-accent hover:text-chrome-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-accent"
          >
            {prompt}
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
