<script lang="ts">
  import { onMount } from "svelte";
  import HelpTab from "#lib/components/help/HelpTab.svelte";
  import { helpStore } from "#lib/stores/help.svelte.js";
  import { createHelpHashArticleSelector } from "#lib/components/help/help-direct-link.js";
  let articleLoadFailed = $state(false);

  onMount(() => {
    const selector = createHelpHashArticleSelector({
      getHash: () => window.location.hash,
      selectArticle: (id) => helpStore.selectArticle(id),
      clearSelection: () => helpStore.clearArticleSelection(),
      ensureArticles: () => helpStore.ensureArticles(),
      onStart: () => (articleLoadFailed = false),
      onError: () => (articleLoadFailed = true),
    });
    void selector.selectFromHash();
    window.addEventListener("hashchange", selector.selectFromHash);
    return () => {
      selector.dispose();
      window.removeEventListener("hashchange", selector.selectFromHash);
    };
  });
</script>

<svelte:head>
  <title>Codex Cryptica | Documentation</title>
</svelte:head>

<div
  class="min-h-full shrink-0 w-full bg-theme-background p-6 lg:p-12 max-w-5xl mx-auto"
>
  <div class="mb-12">
    <h1
      class="text-2xl font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-2"
    >
      Documentation
    </h1>
    <p class="text-xs text-theme-muted uppercase font-mono tracking-widest">
      Operational protocols & system guides
    </p>
  </div>

  {#if helpStore.articlesLoading && !helpStore.loadedArticles.length}
    <p class="text-sm text-theme-text" role="status">Loading help articles…</p>
  {:else if articleLoadFailed}
    <div class="space-y-3" role="alert">
      <p class="text-sm text-theme-text">Help articles could not be loaded.</p>
      <button
        class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        onclick={() => window.location.reload()}>Reload page to retry</button
      >
    </div>
  {:else}
    <HelpTab isStandalone={true} />
  {/if}
</div>
