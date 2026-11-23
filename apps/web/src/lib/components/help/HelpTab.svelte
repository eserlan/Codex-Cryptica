<script lang="ts">
  import { helpStore } from "#lib/stores/help.svelte.js";
  import { parserService } from "#lib/services/parser.js";
  import { browser } from "$app/env";
  import { renderMarkdown } from "#lib/utils/markdown.js";
  import DOMPurify from "dompurify";
  import { slide } from "svelte/transition";
  import { onMount } from "svelte";
  import HelpHeader from "./HelpHeader.svelte";
  import GettingStartedChecklist from "./GettingStartedChecklist.svelte";

  let {
    isStandalone = false,
    reloadPage = () => window.location.reload(),
  }: { isStandalone?: boolean; reloadPage?: () => void } = $props();

  onMount(() => {
    void helpStore.ensureIndex();
  });

  const memo = new Map<string, Promise<string>>();
  const parseContent = (content: string) => {
    if (memo.has(content)) return memo.get(content)!;

    const promise = (async () => {
      try {
        const html = await parserService.parse(content);
        if (!browser) return html;
        return DOMPurify.sanitize(html, {
          ADD_TAGS: ["mark"],
          ADD_ATTR: ["class"],
          ALLOWED_URI_REGEXP:
            /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
        });
      } catch (e) {
        console.error("Failed to parse help article", e);
        return renderMarkdown(content);
      }
    })();

    memo.set(content, promise);
    return promise;
  };
</script>

<!-- Article loading, retry, expansion, labels, and parsed body states are tested together in HelpTab tests. -->
<!-- fallow-ignore-next-line complexity -->
<div class="help-tab-container" class:p-2={!isStandalone}>
  <HelpHeader {isStandalone} />
  <GettingStartedChecklist {isStandalone} />

  <div class="space-y-3">
    {#if helpStore.articlesLoading && !helpStore.loadedArticles.length}
      <p class="text-sm text-theme-text" role="status">
        Loading help articles…
      </p>
    {:else if helpStore.articlesError}
      <div class="space-y-3" role="alert">
        <p class="text-sm text-theme-text">
          Help articles could not be loaded.
        </p>
        <button
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
          onclick={reloadPage}>Reload page to retry</button
        >
      </div>
    {:else}
      {#each helpStore.searchResults as article (article.id)}
        <div
          class="border border-theme-border bg-theme-primary/5 rounded overflow-hidden"
        >
          <div
            class="flex items-stretch hover:bg-theme-primary/5 transition-colors"
          >
            <button
              onclick={() => helpStore.toggleArticle(article.id)}
              class="flex-1 px-4 py-3 flex justify-between items-center text-left"
              aria-expanded={helpStore.expandedId === article.id}
            >
              <div class="flex flex-col">
                <span
                  class="text-sm font-bold text-theme-text uppercase font-header tracking-wider"
                  >{article.title}</span
                >
                <div class="flex gap-2 mt-1">
                  {#each article.labels as label}
                    <span
                      class="text-xs bg-theme-primary/10 text-theme-text px-1.5 py-0.5 rounded uppercase font-bold font-header tracking-tighter"
                      >#{label}</span
                    >
                  {/each}
                </div>
              </div>
              <span
                class="icon-[lucide--chevron-down] w-4 h-4 text-theme-muted transition-transform {helpStore.expandedId ===
                article.id
                  ? 'rotate-180 text-theme-primary'
                  : ''}"
              ></span>
            </button>

            <button
              type="button"
              onclick={() => helpStore.copyShareLink(article.id)}
              class="px-4 text-theme-text hover:text-theme-text transition-colors border-l border-theme-border/50"
              title="Copy direct link"
              aria-label="Copy direct link to {article.title}"
            >
              <span aria-hidden="true" class="icon-[lucide--link] w-3.5 h-3.5"
              ></span>
            </button>
          </div>

          {#if helpStore.expandedId === article.id}
            <div
              class="px-4 pb-5 pt-2 border-t border-theme-border"
              transition:slide
            >
              <div
                class="text-sm text-theme-text/90 leading-relaxed prose prose-theme prose-p:my-3 prose-headings:text-theme-primary prose-headings:text-sm prose-headings:font-bold prose-headings:uppercase font-header prose-headings: prose-headings:tracking-widest prose-headings:mt-6 prose-headings:mb-3 prose-strong:text-theme-primary prose-code:text-theme-primary prose-li:my-1"
              >
                {#await parseContent(article.content) then html}
                  {@html html}
                {/await}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="text-center py-12 border border-dashed border-theme-border rounded"
        >
          <div
            class="icon-[lucide--search-x] w-8 h-8 text-theme-text mx-auto mb-3"
          ></div>
          <p
            class="text-xs text-theme-text uppercase font-mono tracking-[0.2em]"
          >
            No matching protocols found
          </p>
        </div>
      {/each}
    {/if}
  </div>
</div>
