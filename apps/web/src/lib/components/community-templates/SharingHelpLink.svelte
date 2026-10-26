<script lang="ts">
  import { helpStore } from "#lib/stores/help.svelte.js";
  import { FEATURE_HELP_ARTICLES } from "#lib/config/help-content.js";

  let {
    openHelp = (id: string) => helpStore.openHelpToArticle(id),
  }: { openHelp?: (articleId: string) => void } = $props();
</script>

<button
  type="button"
  class="text-xs text-theme-primary underline"
  onclick={() => openHelp(FEATURE_HELP_ARTICLES.SHARING_ENTITY_TEMPLATES)}
  >How sharing works</button
>
