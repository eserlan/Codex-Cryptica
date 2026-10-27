<script lang="ts">
  import { onMount } from "svelte";
  import { parse } from "marked";
  import { asset, resolve } from "$app/paths";
  import BlogTableOfContents from "#lib/components/blog/BlogTableOfContents.svelte";
  import { extractBlogToc } from "#lib/components/blog/blog-toc.js";

  let {
    fileName,
    title,
    initialContent = "",
  }: { fileName: string; title: string; initialContent?: string } = $props();
  // Local state for client-side fetching fallback
  let fetchedContent = $state("");

  // Derived content: prefers prop (SSR/Hydration), falls back to fetched, defaults to empty
  let content = $derived.by(() => {
    if (initialContent) return parse(initialContent) as string;
    if (fetchedContent) return parse(fetchedContent) as string;
    return "";
  });

  // The same heading ids the rendered document carries, for the contents rail.
  let headings = $derived(extractBlogToc(initialContent || fetchedContent));

  onMount(async () => {
    // Only fetch client-side when there was no server-provided content.
    if (initialContent) return;
    try {
      const targetPath = fileName.replace(/^\//, "");
      const res = await fetch(asset(targetPath as any));

      if (!res.ok)
        throw new Error(`Failed to fetch ${fileName}: ${res.statusText}`);

      const text = await res.text();
      fetchedContent = parse(text) as string;
    } catch (err) {
      console.error("LegalDocument error:", err);
      fetchedContent = `<div class="p-4 border border-red-900/50 bg-red-900/10 text-red-400 font-mono">
                <h3 class="text-red-500! mt-0!">OFFLINE ERROR</h3>
                <p class="mb-0!">Could not retrieve document. Please check your connection.</p>
            </div>`;
    }
  });
</script>

<svelte:head>
  <title>{title} | Codex Cryptica</title>
  <meta
    name="description"
    content="{title} for Codex Cryptica RPG Campaign Manager."
  />
</svelte:head>

<div
  class="max-w-5xl mx-auto px-6 py-12 bg-theme-bg min-h-screen"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mb-8 border-b border-theme-border/30 pb-4">
    <a
      href={resolve("/(app)")}
      class="text-theme-text hover:text-theme-secondary font-mono text-sm flex items-center gap-2"
    >
      <span aria-hidden="true" class="icon-[lucide--arrow-left] w-4 h-4"></span>
      BACK TO CRYPTICA
    </a>
  </div>

  <!-- Text stays at reading width; from lg a sticky contents rail uses the
       space beside it. -->
  <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
    <div class="legal-content min-w-0 max-w-3xl font-body text-theme-text/90">
      {@html content}
    </div>
    {#if headings.length >= 2}
      <aside
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        data-testid="legal-contents"
      >
        <BlogTableOfContents {headings} />
      </aside>
    {/if}
  </div>
</div>

<style>
  .legal-content {
    font-family: var(--font-body, ui-sans-serif);
  }

  .legal-content :global(h1),
  .legal-content :global(h2),
  .legal-content :global(h3) {
    font-family: var(--font-header, ui-sans-serif);
  }

  .legal-content :global(h1) {
    font-size: 1.75rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-accent-primary);
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border-primary);
  }

  .legal-content :global(h2) {
    font-family: var(--font-header, ui-sans-serif);
    font-size: 1.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-accent-primary);
    margin-top: 4rem;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--color-border-primary);
  }

  .legal-content :global(h3) {
    font-family: var(--font-header, ui-sans-serif);
    font-size: 1.125rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--color-accent-primary);
    margin-top: 2.5rem;
    margin-bottom: 1rem;
  }

  .legal-content :global(p) {
    line-height: 1.8;
    margin-bottom: 1.5rem;
    font-size: 1rem;
  }

  .legal-content :global(li) {
    line-height: 1.7;
    margin-bottom: 0.75rem;
    font-size: 1rem;
  }

  .legal-content :global(strong) {
    color: var(--color-accent-primary);
    font-weight: 700;
  }

  .legal-content :global(a) {
    color: var(--color-accent-primary);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
    transition: all 0.2s;
  }

  .legal-content :global(a:hover) {
    color: var(--color-accent-dim);
    text-decoration-thickness: 2px;
  }

  @media (max-width: 768px) {
    .legal-content :global(h1) {
      font-size: 1.5rem;
    }
    .legal-content :global(h2) {
      font-size: 1.25rem;
    }
  }
</style>
