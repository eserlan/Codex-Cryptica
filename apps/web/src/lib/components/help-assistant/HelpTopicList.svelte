<script lang="ts">
  import type { HelpTopic } from "help-engine";

  let {
    topics,
    onOpenArticle,
  }: {
    topics: HelpTopic[];
    onOpenArticle: (helpId: string) => void;
  } = $props();
</script>

<ul class="flex flex-col gap-1">
  {#each topics as topic (topic.helpId)}
    <li>
      <button
        type="button"
        onclick={() => onOpenArticle(topic.helpId)}
        class="text-left text-xs text-theme-primary underline hover:text-theme-secondary focus-visible:outline-2 focus-visible:outline-theme-primary"
      >
        {topic.title}
      </button>
    </li>
  {/each}
</ul>
