<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { ThemeSlug } from "./+page";
  import type { GeneratorCard } from "./generator-cards";
  import { generatorCardUrl } from "./theme-hub-metadata";
  const cleanBase = basePath();
  let {
    cards,
    theme,
    onselect,
  }: { cards: GeneratorCard[]; theme: ThemeSlug; onselect: () => void } =
    $props();
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const iconClass = "h-5 w-5 text-theme-primary mb-4 block";
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const summaryClass = "block text-sm text-theme-muted leading-relaxed";
</script>

<ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  {#each cards as card (card.slug)}
    <li>
      <a
        href={generatorCardUrl(cleanBase, theme, card.slug)}
        onclick={onselect}
        class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
      >
        <span class={card.icon + " " + iconClass}></span>
        <span
          class="block font-header text-base font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors"
        >
          {card.label}
        </span>
        <span class={summaryClass}>
          {card.summary}
        </span>
      </a>
    </li>
  {/each}
</ul>
