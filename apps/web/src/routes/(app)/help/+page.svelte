<script lang="ts">
  import { onMount } from "svelte";
  import HelpTab from "$lib/components/help/HelpTab.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { getHelpArticleIdFromHash } from "$lib/components/help/help-direct-link";

  const selectArticleFromHash = () => {
    const articleId = getHelpArticleIdFromHash(window.location.hash);
    if (articleId) {
      helpStore.selectArticle(articleId);
    } else {
      helpStore.clearArticleSelection();
    }
  };

  onMount(() => {
    selectArticleFromHash();
    window.addEventListener("hashchange", selectArticleFromHash);
    return () => window.removeEventListener("hashchange", selectArticleFromHash);
  });
</script>

<svelte:head>
  <title>Codex Cryptica | Documentation</title>
</svelte:head>

<div class="min-h-screen bg-theme-background p-6 lg:p-12 max-w-5xl mx-auto">
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

  <HelpTab isStandalone={true} />
</div>
