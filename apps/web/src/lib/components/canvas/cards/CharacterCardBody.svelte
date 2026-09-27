<script lang="ts">
  import {
    extractDossierAttributes,
    extractDossierSections,
    type LinkGroup,
  } from "./entity-card-variant";
  import GroupedRelationLinks from "./GroupedRelationLinks.svelte";

  let {
    renderedContent,
    quote,
    groups = [],
    large = false,
    entity,
    imageUrl,
  }: {
    renderedContent: string;
    quote?: string;
    groups?: LinkGroup[];
    large?: boolean;
    entity?: any;
    imageUrl?: string | null;
  } = $props();

  const attributes = $derived(
    extractDossierAttributes(entity?.content, entity?.metadata, entity),
  );
  const sections = $derived(extractDossierSections(entity?.content));
</script>

{#if large}
  <div
    class="character-dossier grid grid-cols-1 md:grid-cols-12 gap-3.5 text-[11px] font-body"
  >
    <!-- Left Column: Portrait, Attributes, Background, Goals -->
    <div class="md:col-span-6 flex flex-col gap-3 min-w-0">
      <!-- Portrait & Quote / Attributes -->
      <div class="flex flex-col sm:flex-row gap-2.5 items-start">
        {#if imageUrl}
          <div
            class="w-24 h-32 shrink-0 overflow-hidden rounded-lg border border-theme-border/60 bg-theme-bg/50 shadow-sm"
          >
            <img
              src={imageUrl}
              alt={entity?.title || "Character"}
              class="w-full h-full object-cover object-[center_20%]"
            />
          </div>
        {/if}
        <div class="flex-1 flex flex-col justify-start gap-1.5 min-w-0 py-0.5">
          {#if quote}
            <blockquote
              data-testid="character-card-quote"
              class="border-l-2 border-theme-primary/60 pl-2 italic font-serif text-theme-text text-xs leading-snug line-clamp-3 mb-0.5"
            >
              “{quote}”
            </blockquote>
          {/if}
          {#if attributes.length > 0}
            <div class="space-y-1 text-[10px]">
              {#each attributes.slice(0, 6) as attr}
                <div class="flex items-baseline gap-1.5 min-w-0">
                  <span class="font-semibold text-theme-muted shrink-0">
                    {attr.label}:
                  </span>
                  <span
                    class="text-theme-text font-medium leading-tight line-clamp-2 flex-1"
                  >
                    {attr.value}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Background Section -->
      {#if sections.background || renderedContent}
        <div class="mt-1">
          <div
            class="text-[9px] font-mono uppercase tracking-widest text-theme-muted font-bold mb-1 border-b border-theme-border/20 pb-0.5"
          >
            Background
          </div>
          <div
            class="text-[11px] text-theme-muted leading-relaxed line-clamp-4 markdown-content prose prose-invert prose-xs"
            data-testid="character-card-excerpt"
          >
            {#if sections.background}
              {sections.background}
            {:else}
              {@html renderedContent}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Goals Section -->
      {#if sections.goals.length > 0}
        <div class="mt-1">
          <div
            class="text-[9px] font-mono uppercase tracking-widest text-theme-muted font-bold mb-1 border-b border-theme-border/20 pb-0.5"
          >
            Goals
          </div>
          <ul class="text-[10px] text-theme-text space-y-1">
            {#each sections.goals.slice(0, 4) as goal}
              <li class="flex items-start gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full bg-theme-primary mt-1 shrink-0"
                ></span>
                <span class="leading-tight">{goal}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <!-- Right Column: Sidebar (Relationships & Affiliations) -->
    <div
      class="md:col-span-6 border-t md:border-t-0 md:border-l border-theme-border/40 md:pl-3 flex flex-col gap-2 min-w-0"
    >
      <GroupedRelationLinks {groups} />
    </div>
  </div>
{:else}
  <div
    class="text-[11px] text-theme-muted leading-relaxed markdown-content prose prose-invert prose-xs font-body"
  >
    {#if quote}
      <blockquote
        data-testid="character-card-quote"
        class="border-l-2 border-theme-primary/50 pl-2 italic font-serif text-theme-text line-clamp-2 mb-1.5 text-xs"
      >
        “{quote}”
      </blockquote>
    {/if}
    {#if renderedContent}
      <div class="line-clamp-3" data-testid="character-card-excerpt">
        {@html renderedContent}
      </div>
    {/if}
    <GroupedRelationLinks {groups} />
  </div>
{/if}
