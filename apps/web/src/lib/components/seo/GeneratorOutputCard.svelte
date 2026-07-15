<script lang="ts">
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import { renderGeneratorMarkdown } from "$lib/components/seo/markdown-renderers";
  import type { MarkdownSectionForCopy } from "$lib/components/seo/markdown-sections";
  import type { SessionEntity } from "generator-engine";
  import SessionHubWidget from "./SessionHubWidget.svelte";

  const HIDDEN_TAGS = new Set([
    "imported-draft",
    "faction-generator",
    "rpg-faction",
    "rpg-npc",
    "npc-generator",
    "rpg-settlement",
    "settlement-generator",
    "rpg-item",
    "item-generator",
    "rpg-quest",
    "quest-generator",
    "rpg-names",
    "fantasy-name",
    "name-generator",
  ]);

  let {
    generatedData,
    aiFallbackDismissed,
    isBusy,
    isExampleDraft,
    generatedSingular,
    variant,
    worldTheme,
    documentContent,
    documentSections,
    copied,
    copiedSectionId,
    contextTrimmed,
    onDismissAiFallback,
    onSaveToCodex,
    onCopyMarkdown,
    onCopySection,
    onContainerClick,
    onContainerKeydown,
    onSelectHubEntity,
    onSaveHubToCodex,
  }: {
    generatedData: GeneratorOutput | null;
    aiFallbackDismissed: boolean;
    isBusy: boolean;
    isExampleDraft: boolean;
    generatedSingular: string;
    variant: "default" | "names";
    worldTheme: string;
    documentContent: string;
    documentSections: MarkdownSectionForCopy[];
    copied: boolean;
    copiedSectionId: string | null;
    contextTrimmed: boolean;
    onDismissAiFallback: () => void;
    onSaveToCodex: () => void;
    onCopyMarkdown: () => void;
    onCopySection: (sectionId: string, markdown: string) => void;
    onContainerClick: (event: MouseEvent) => void;
    onContainerKeydown: (event: KeyboardEvent) => void;
    onSelectHubEntity: (entity: SessionEntity) => void;
    onSaveHubToCodex: (entities: SessionEntity[]) => void;
  } = $props();
</script>

{#if generatedData?.aiFallback && !aiFallbackDismissed}
  <div
    transition:fade={{ duration: 150 }}
    class="mb-4 p-3 border border-theme-warning/40 bg-theme-warning/10 rounded-xl flex items-start gap-2.5"
    role="status"
    aria-live="polite"
  >
    <span
      class="icon-[lucide--info] w-4 h-4 text-theme-warning shrink-0 mt-0.5"
      aria-hidden="true"
    ></span>
    <p class="text-xs text-theme-text/80 leading-snug flex-grow">
      AI generation was unavailable, so Codex created a local draft instead.
    </p>
    <button
      type="button"
      onclick={onDismissAiFallback}
      class="text-theme-muted hover:text-theme-text transition-colors shrink-0"
      aria-label="Dismiss notice"
    >
      <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
    </button>
  </div>
{/if}
<div
  class="relative flex-grow p-6 md:p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex flex-col min-h-[400px]"
>
  {#if isBusy}
    <div
      in:fade={{ duration: 150 }}
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-theme-bg/70 backdrop-blur-[2px] rounded-2xl"
      role="status"
      aria-live="polite"
    >
      <span
        class="icon-[lucide--loader-2] animate-spin w-10 h-10 text-theme-primary"
        aria-hidden="true"
      ></span>
      <p
        class="font-header font-bold uppercase tracking-widest text-xs text-theme-primary animate-pulse"
      >
        Forging {generatedSingular}...
      </p>
    </div>
  {/if}
  {#if generatedData}
    <div
      in:fade={{ duration: 250 }}
      class="flex flex-col flex-grow transition-opacity duration-300 {isBusy
        ? 'opacity-40'
        : ''}"
    >
      <div class="border-b border-theme-border/60 pb-4 mb-6">
        <div class="flex items-start gap-3 flex-wrap">
          <h2
            class="font-header font-bold text-xl md:text-2xl tracking-wide text-theme-text/95"
          >
            {generatedData.title}
          </h2>
          {#if isExampleDraft}
            <span
              class="mt-1.5 px-2 py-0.5 rounded-full border border-theme-border/70 text-theme-text/60 text-[9px] font-mono uppercase tracking-wider flex-shrink-0"
            >
              Example
            </span>
          {/if}
        </div>
        {#if generatedData.summary}
          <p class="text-base text-theme-text/80 leading-relaxed mt-2 italic">
            {generatedData.summary}
          </p>
        {/if}
        <div class="flex flex-wrap items-center justify-between gap-2 mt-3">
          <div class="flex flex-wrap gap-1.5">
            {#each (generatedData.labels ?? []).filter((l) => !HIDDEN_TAGS.has(l)) as label (label)}
              <span
                class="rounded-full border border-theme-border/60 bg-theme-surface/20 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono font-bold text-theme-text/55"
              >
                {label}
              </span>
            {/each}
          </div>
          <div
            class="flex flex-wrap items-center overflow-hidden rounded-lg border border-theme-primary/25 bg-theme-bg/35 shadow-sm"
            aria-label="Draft actions"
          >
            {#if variant !== "names"}
              <button
                type="button"
                onclick={onSaveToCodex}
                class="px-4 py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] hover:brightness-110 transition-all"
                id="save-to-codex-btn"
                title="Import this draft into your local Codex Cryptica vault"
              >
                Save to Codex
              </button>
            {/if}
            <button
              type="button"
              onclick={onCopyMarkdown}
              class="px-4 py-2 border-l border-theme-primary/25 bg-theme-surface/35 text-theme-text/85 font-bold uppercase font-header tracking-wider text-[10px] hover:bg-theme-surface/70 hover:text-theme-primary transition-all flex items-center gap-1.5"
              id="copy-markdown-btn"
              title="Copy this draft as markdown to your clipboard"
            >
              <span class="icon-[lucide--copy] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div
        role="none"
        class="seo-md text-sm leading-relaxed text-theme-text/90 flex-grow {variant ===
        'names'
          ? 'md:columns-2 md:gap-x-8 [&_div]:break-inside-avoid [&_div]:mb-4'
          : 'space-y-4'}"
        data-theme={worldTheme}
        onclick={onContainerClick}
        onkeydown={onContainerKeydown}
      >
        {#if variant === "names"}
          {@html renderGeneratorMarkdown(documentContent, variant)}
        {:else}
          {#each documentSections as section (section.id)}
            <article
              class="group/section rounded-xl border border-transparent transition-colors hover:border-theme-border/35 hover:bg-theme-surface/10"
            >
              {#if section.heading}
                <div
                  class="mb-2 flex items-center justify-between gap-3 border-b border-theme-border/35 pb-2"
                >
                  <h3
                    class="font-header text-base font-bold text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--color-text))]"
                  >
                    {section.heading}
                  </h3>
                  <button
                    type="button"
                    onclick={() => onCopySection(section.id, section.markdown)}
                    class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-theme-text/65 opacity-100 transition-all hover:border-theme-primary/60 hover:text-theme-primary md:opacity-0 md:group-hover/section:opacity-100 md:focus-visible:opacity-100"
                    aria-label="Copy {section.heading} as Markdown"
                    title="Copy this section as Markdown"
                  >
                    <span
                      class={copiedSectionId === section.id
                        ? "icon-[lucide--check] h-3.5 w-3.5"
                        : "icon-[lucide--copy] h-3.5 w-3.5"}
                      aria-hidden="true"
                    ></span>
                    {copiedSectionId === section.id ? "Copied" : "Copy MD"}
                  </button>
                </div>
              {/if}
              <div>
                {@html renderGeneratorMarkdown(section.body, variant)}
              </div>
            </article>
          {/each}
        {/if}
      </div>
    </div>
  {:else}
    <div
      in:fade={{ duration: 150 }}
      class="flex flex-col items-center justify-center flex-grow text-center text-theme-muted max-w-sm mx-auto"
    >
      <span class="icon-[lucide--swords] text-theme-muted/30 w-16 h-16 mb-4"
      ></span>
      <h3 class="font-header font-bold text-sm uppercase tracking-widest mb-2">
        No Draft Generated
      </h3>
      <p class="text-[11px] leading-relaxed">
        Use the sidebar generator control panel to customize parameters, then
        trigger the generation engine to forge details.
      </p>
    </div>
  {/if}
</div>

<!-- Session Hub Widget — full center-column width so titles aren't cramped -->
{#if variant !== "names"}
  <div class="mt-6">
    <SessionHubWidget onSelect={onSelectHubEntity} onSave={onSaveHubToCodex} />
    {#if contextTrimmed}
      <div
        class="mt-2 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-start gap-2 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <span class="icon-[lucide--alert-triangle] w-4 h-4 shrink-0 mt-0.5"
        ></span>
        <p>
          Some older unpinned context is omitted from prompts to manage AI
          limits. Pin items to prioritize them.
        </p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .seo-md :global(h2) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1.125rem;
    margin: 1.5rem 0 0.75rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 40%, transparent);
    padding-bottom: 0.25rem;
  }
  /* Desaturated heading — primary actions keep saturated red (#1272) */
  .seo-md :global(h3) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1rem;
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text));
  }
  .seo-md :global(ul) {
    list-style: disc;
    margin-left: 1rem;
  }
  .seo-md :global(p) {
    margin-bottom: 0.75rem;
  }
  .seo-md :global(.seo-label) {
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 70%, transparent);
    filter: brightness(1.2);
  }
</style>
