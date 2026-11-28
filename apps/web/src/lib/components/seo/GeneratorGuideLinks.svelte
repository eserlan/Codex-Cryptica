<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { GeneratorGuideLink } from "./generator-page-guides";

  const cleanBase = basePath();

  let {
    linksTitle,
    links,
  }: {
    linksTitle?: string;
    links: GeneratorGuideLink[];
  } = $props();

  const hasDescriptions = $derived(
    Boolean(linksTitle) || links.some((link) => link.description),
  );
</script>

{#if hasDescriptions}
  <div class="mt-8 border-t border-theme-border/40 pt-6">
    <h3
      class="font-header font-bold text-xl md:text-lg leading-snug uppercase tracking-wider text-theme-text mb-3"
    >
      {linksTitle ?? "Further reading"}
    </h3>
    <ul class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each links as link (link.href)}
        <li
          class="border border-theme-border/50 bg-theme-surface/20 rounded-xl p-4"
        >
          <a
            href="{cleanBase}{link.href}"
            class="inline-flex items-center gap-1 rounded px-1 -mx-1 text-lg md:text-base leading-snug font-bold text-theme-text underline decoration-theme-primary underline-offset-4 hover:bg-theme-primary/15 transition-colors"
          >
            <span>{link.label}</span>
            <span
              class="icon-[lucide--arrow-right] w-3.5 h-3.5 shrink-0"
              aria-hidden="true"
            ></span>
          </a>
          {#if link.description}
            <p
              class="mt-2 text-lg md:text-base text-theme-text leading-relaxed"
            >
              {link.description}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <div class="mt-5 flex flex-wrap items-center gap-3">
    <span
      class="text-base md:text-sm font-bold uppercase tracking-wider text-theme-text"
    >
      Further reading:
    </span>
    {#each links as link (link.href)}
      <a
        href="{cleanBase}{link.href}"
        class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-base md:text-sm leading-snug font-semibold text-theme-text underline decoration-theme-primary underline-offset-4 hover:bg-theme-primary/15 transition-colors"
      >
        <span>{link.label}</span>
        <span class="icon-[lucide--arrow-right] w-3.5 h-3.5" aria-hidden="true"
        ></span>
      </a>
    {/each}
  </div>
{/if}
