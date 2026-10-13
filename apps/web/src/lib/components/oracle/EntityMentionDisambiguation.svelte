<script lang="ts" module>
  export interface MentionCandidate {
    id: string;
    title: string;
    type: string;
  }
</script>

<script lang="ts">
  let { name, candidates, onChoose, onSendAsText } = $props<{
    name: string;
    candidates: MentionCandidate[];
    onChoose: (entityId: string) => void;
    onSendAsText: () => void;
  }>();
</script>

<div
  role="group"
  aria-label={`Choose which entity “${name}” means`}
  class="mb-2 rounded-lg border border-theme-primary/40 bg-theme-surface p-3 shadow-lg"
  data-testid="entity-mention-disambiguation"
>
  <p class="mb-2 text-sm text-theme-text">
    More than one entity matches <strong>@{name}</strong>. Choose one, or send
    the message as plain text.
  </p>
  <div class="flex flex-wrap gap-2">
    {#each candidates as candidate (candidate.id)}
      <button
        type="button"
        class="min-h-12 rounded-md border border-theme-border bg-theme-bg px-3 py-2 text-left text-sm text-theme-text hover:border-theme-primary"
        onclick={() => onChoose(candidate.id)}
      >
        <span class="font-medium">{candidate.title}</span>
        <span class="ml-1 text-xs uppercase tracking-wide text-theme-muted"
          >{candidate.type}</span
        >
      </button>
    {/each}
    <button
      type="button"
      class="min-h-12 rounded-md px-3 py-2 text-sm text-theme-muted underline underline-offset-2 hover:text-theme-text"
      onclick={() => onSendAsText()}
    >
      Send as plain text
    </button>
  </div>
</div>
