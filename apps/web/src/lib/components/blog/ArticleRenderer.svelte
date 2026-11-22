<script lang="ts">
  import { marked } from "marked";
  import { gfmHeadingId } from "marked-gfm-heading-id";
  import DOMPurify from "dompurify";
  import { browser } from "$app/env";
  import { basePath } from "#lib/utils/base-path.js";
  import { lightboxStore } from "#lib/stores/ui/lightbox.svelte.js";

  // Enable heading IDs for table of contents anchors
  marked.use(gfmHeadingId());

  let {
    content = "",
  }: {
    content?: string;
  } = $props();

  // Ensure all root-relative links/images in Markdown respect the SvelteKit base path
  // Matches ](/path) and src="/path"
  const processedContent = $derived(
    content
      .replace(/\]\(\//g, `](${basePath()}/`)
      .replace(/src="\//g, `src="${basePath()}/`),
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
  function openImageLightbox(target: EventTarget | null) {
    if (!(target instanceof HTMLImageElement)) return;
    const rect = target.getBoundingClientRect();
    lightboxStore.open(target.src, target.alt || "Image", {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }
</script>

<article
  class="blog-content prose prose-invert max-w-none break-words text-lg leading-relaxed prose-p:text-theme-text/80 prose-headings:text-theme-text prose-a:text-theme-primary hover:prose-a:text-theme-primary/80 prose-strong:text-theme-text prose-code:text-theme-primary/90 prose-pre:bg-theme-surface prose-pre:border prose-pre:border-theme-border prose-pre:overflow-x-auto"
  onclickcapture={(e) => openImageLightbox(e.target)}
  onkeydowncapture={(e) => {
    if (e.key === "Enter") openImageLightbox(e.target);
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
  /* Clear the sticky marketing header (~4.5rem) so TOC jumps land fully visible. */
  .blog-content :global(h2),
  .blog-content :global(h3) {
    scroll-margin-top: 6rem;
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
    line-height: 1.625;
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
