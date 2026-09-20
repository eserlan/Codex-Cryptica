<script lang="ts">
  import { base } from "$app/paths";
  import {
    DEVELOPMENT_SECTION_TITLES as titles,
    getCatalogueEntry,
    normaliseSuggestions,
    type GeneratorSuggestion,
  } from "generator-engine";

  let {
    suggestions,
    onOpen,
  }: {
    suggestions: GeneratorSuggestion[];
    onOpen?: (opened: { generatorKey: string; position: number }) => void;
  } = $props();

  const cleanBase = $derived(base.replace(/\/+$/, ""));
  const items = $derived(
    normaliseSuggestions(suggestions).flatMap((suggestion) => {
      const entry = getCatalogueEntry(suggestion.generatorKey);
      return entry ? [{ entry, reason: suggestion.reason }] : [];
    }),
  );
</script>

<section aria-labelledby="dev-further" data-testid="generator-links">
  <h2
    id="dev-further"
    class="font-header text-xl sm:text-lg font-bold text-theme-text"
  >
    {titles.developFurther}
  </h2>
  <p class="mt-1 text-lg sm:text-sm text-theme-muted">
    Your idea comes with you: the generators read this draft from your Session
    Hub as context.
  </p>
  <ul class="mt-3 grid gap-2 sm:grid-cols-2">
    {#each items as item, position (item.entry.key)}
      <li>
        <a
          href="{cleanBase}/generators/{item.entry.slug}"
          onclick={() => onOpen?.({ generatorKey: item.entry.key, position })}
          class="block h-full rounded-lg border border-theme-border/60 bg-theme-surface/40 p-3 text-lg sm:text-base transition-colors hover:border-theme-primary/50"
        >
          <span class="flex items-center gap-2 font-bold text-theme-text">
            {item.entry.label}
            <span
              class="icon-[lucide--arrow-right] h-3.5 w-3.5 text-theme-primary"
              aria-hidden="true"
            ></span>
          </span>
          <span class="mt-1 block text-theme-muted">{item.reason}</span>
        </a>
      </li>
    {/each}
  </ul>
</section>
