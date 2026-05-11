<script lang="ts">
  import { parserService } from "$lib/services/parser";
  import { browser } from "$app/environment";
  import { renderMarkdown } from "$lib/utils/markdown";
  import DOMPurify from "dompurify";
  import { base } from "$app/paths";

  let { data } = $props();
  const { article } = data;

  const parseContent = (content: string) => {
    return (async () => {
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
  };
</script>

<svelte:head>
  <title>Codex Cryptica | {article.title}</title>
</svelte:head>

<div class="min-h-screen bg-theme-background p-6 lg:p-12 max-w-5xl mx-auto">
  <div class="mb-12 flex justify-between items-end">
    <div>
      <h1
        class="text-2xl font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-2"
      >
        {article.title}
      </h1>
      <p class="text-xs text-theme-muted uppercase font-mono tracking-widest">
        Operational protocol: {article.id}
      </p>
    </div>
    <a
      href="{base}/help"
      class="text-xs text-theme-muted hover:text-theme-primary transition-colors uppercase font-mono tracking-widest flex items-center gap-2"
    >
      <span class="icon-[lucide--chevron-left] w-4 h-4"></span>
      All Protocols
    </a>
  </div>

  <div class="border border-theme-border bg-theme-primary/5 rounded p-8 pb-12">
    <div
      class="text-sm text-theme-text/90 leading-relaxed prose prose-theme prose-p:my-4 prose-headings:text-theme-primary prose-headings:text-sm prose-headings:font-bold prose-headings:uppercase font-header prose-headings:tracking-widest prose-headings:mt-8 prose-headings:mb-4 prose-strong:text-theme-primary prose-code:text-theme-primary prose-li:my-1 max-w-none"
    >
      {#await parseContent(article.content) then html}
        {@html html}
      {/await}
    </div>
  </div>
</div>
