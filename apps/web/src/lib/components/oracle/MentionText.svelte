<script lang="ts">
  import { segmentText, type Mention } from "entity-mention-engine";

  let {
    text,
    mentions = [],
    lookup,
    onOpen,
  }: {
    text: string;
    mentions?: Mention[];
    /** Returns the live title for a visible entity, or undefined when it is gone. */
    lookup: (entityId: string) => string | undefined;
    onOpen: (entityId: string) => void;
  } = $props();

  const segments = $derived(segmentText(text, mentions));
</script>

{#each segments as segment, index (index)}
  {#if segment.kind === "text"}
    {segment.text}
  {:else}
    {@const title = lookup(segment.entityId)}
    {#if title}
      <button
        type="button"
        class="inline rounded px-0.5 font-medium text-theme-primary underline decoration-dotted underline-offset-2 hover:text-theme-secondary focus-visible:outline-2 focus-visible:outline-theme-primary"
        aria-label={`Open ${title}`}
        onclick={() => onOpen(segment.entityId)}>@{title}</button
      >
    {:else}
      <span
        class="italic text-theme-muted"
        aria-label={`@${segment.displayName}, entity unavailable`}
        title="This entity is no longer in your Vault"
        >@{segment.displayName}</span
      >
    {/if}
  {/if}
{/each}
