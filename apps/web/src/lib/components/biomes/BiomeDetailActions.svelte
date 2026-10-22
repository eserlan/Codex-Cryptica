<script lang="ts">
  let {
    biomeId,
    comparing = false,
    onMakeMine,
    onCopyMarkdown,
    onToggleCompare,
  }: {
    biomeId: string;
    comparing?: boolean;
    onMakeMine?: (id: string) => void;
    onCopyMarkdown?: (id: string) => void;
    onToggleCompare?: (id: string) => void;
  } = $props();

  const secondary =
    "rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary";
</script>

{#if onMakeMine || onCopyMarkdown || onToggleCompare}
  <div class="flex flex-wrap gap-2">
    {#if onMakeMine}
      <button
        type="button"
        class="rounded-lg bg-theme-primary px-4 py-2 text-sm text-theme-on-primary"
        onclick={() => onMakeMine(biomeId)}>Make my own</button
      >
    {/if}
    {#if onToggleCompare}
      <button
        type="button"
        class={secondary}
        aria-pressed={comparing}
        onclick={() => onToggleCompare(biomeId)}
        >{comparing ? "In comparison" : "Add to compare"}</button
      >
    {/if}
    {#if onCopyMarkdown}
      <button
        type="button"
        class={secondary}
        onclick={() => onCopyMarkdown(biomeId)}>Copy as Markdown</button
      >
    {/if}
  </div>
{/if}
