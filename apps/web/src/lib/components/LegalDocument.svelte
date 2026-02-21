<script lang="ts">
  import { onMount } from "svelte";
  import { parse } from "marked";
  import { base } from "$app/paths";

  let {
    fileName,
    title,
    initialContent = "",
  } = $props<{ fileName: string; title: string; initialContent?: string }>();
  let content = $state("");

  function updateContent(text: string) {
    content = parse(text) as string;
  }

  // Pre-parse if initial content is provided (for SSR/Prerender)
  $effect.pre(() => {
    if (initialContent && !content) {
      updateContent(initialContent);
    }
  });

  onMount(async () => {
    // If no initial content (e.g. client-side navigation or hydration mismatch), fetch it
    if (!initialContent) {
      try {
        const res = await fetch(`${base}/${fileName}`);
        if (!res.ok)
          throw new Error(`Failed to fetch ${fileName}: ${res.statusText}`);
        const text = await res.text();
        updateContent(text);
      } catch (err) {
        console.error("LegalDocument error:", err);
        content = `<div class="p-4 border border-red-900/50 bg-red-900/10 text-red-400 font-mono">
                <h3 class="text-red-500! mt-0!">OFFLINE ERROR</h3>
                <p class="mb-0!">Could not retrieve document. Please check your connection.</p>
            </div>`;
      }
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
  class="max-w-3xl mx-auto px-6 py-12 bg-theme-bg min-h-screen"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mb-8 border-b border-theme-border/30 pb-4">
    <a
      href="{base}/"
      class="text-theme-primary hover:text-theme-secondary font-mono text-sm flex items-center gap-2"
    >
      <span class="icon-[lucide--arrow-left] w-4 h-4"></span>
      BACK TO CRYPTICA
    </a>
  </div>

  <div class="legal-content font-mono text-theme-text/90">
    {@html content}
  </div>
</div>

<style>
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
