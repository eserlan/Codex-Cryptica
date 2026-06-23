<script lang="ts">
  import { marked } from "marked";
  import { gfmHeadingId } from "marked-gfm-heading-id";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  // Enable heading IDs for table of contents anchors
  marked.use(gfmHeadingId());

  let { content = "" } = $props<{
    content?: string;
  }>();

  // Ensure all root-relative links/images in Markdown respect the SvelteKit base path
  // Matches ](/path) and src="/path"
  const processedContent = $derived(
    content
      .replace(/\]\(\//g, `](${base}/`)
      .replace(/src="\//g, `src="${base}/`),
  );
  const renderedHtml = $derived(marked.parse(processedContent));
  const sanitizedHtml = $derived(
    browser
      ? DOMPurify.sanitize(renderedHtml as string, {
          ALLOWED_URI_REGEXP:
            /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
        })
      : renderedHtml,
  );
</script>

<article
  class="blog-content prose prose-invert max-w-none prose-p:text-theme-text/80 prose-headings:text-theme-text prose-a:text-theme-primary hover:prose-a:text-theme-primary/80 prose-strong:text-theme-text prose-code:text-theme-primary/90 prose-pre:bg-theme-surface prose-pre:border prose-pre:border-theme-border"
  onclickcapture={(e) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      modalUIStore.openLightbox(img.src, img.alt || "Image", {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }}
  onkeydowncapture={(e) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (target && target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        modalUIStore.openLightbox(img.src, img.alt || "Image", {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }}
  role="presentation"
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
  .blog-content :global(img) {
    cursor: zoom-in;
    transition: transform 0.2s ease-in-out;
  }
  .blog-content :global(img:hover) {
    transform: scale(1.02);
  }
</style>
