<script lang="ts">
  import { marked } from "marked";
  import { gfmHeadingId } from "marked-gfm-heading-id";
  import DOMPurify from "isomorphic-dompurify";
  import { base } from "$app/paths";

  // Enable heading IDs for table of contents anchors
  marked.use(gfmHeadingId());

  let { content = "" } = $props<{
    content?: string;
  }>();

  // Ensure root-relative links in Markdown respect the SvelteKit base path
  const processedContent = $derived(content.replaceAll("](/)", `](${base}/)`));
  const renderedHtml = $derived(marked.parse(processedContent));
  const sanitizedHtml = $derived(DOMPurify.sanitize(renderedHtml as string));
</script>

<article
  class="blog-content prose prose-invert max-w-none prose-p:text-theme-text/80 prose-headings:text-theme-text prose-a:text-theme-primary hover:prose-a:text-theme-primary/80 prose-strong:text-theme-text prose-code:text-theme-primary/90 prose-pre:bg-theme-surface prose-pre:border prose-pre:border-theme-border"
>
  {@html sanitizedHtml}
</article>

<style>
  /* Tailwind 4 @apply or specific overrides if needed */
  .blog-content :global(h1) {
    font-family: var(--font-header);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }
  .blog-content :global(h2) {
    font-family: var(--font-header);
    letter-spacing: 0.05em;
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-theme-border);
    padding-bottom: 0.5rem;
  }
  .blog-content :global(h3) {
    font-family: var(--font-header);
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  .blog-content :global(p) {
    line-height: 1.8;
    margin-bottom: 1.5rem;
  }
  .blog-content :global(ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .blog-content :global(li) {
    margin-bottom: 0.5rem;
  }
</style>
