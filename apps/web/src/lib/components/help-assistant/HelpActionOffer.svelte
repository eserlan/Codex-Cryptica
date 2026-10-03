<script lang="ts">
  import type { GuidanceAction } from "help-engine";

  let {
    action,
    onAccept,
    onDismiss,
  }: {
    action: GuidanceAction;
    onAccept: () => void;
    onDismiss: () => void;
  } = $props();

  const summary = $derived(
    action.then ? `${action.label}, then ${action.then.label}` : action.label,
  );
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-primary/40 bg-theme-surface/60 p-3"
  data-testid="help-action-offer"
>
  <p class="text-body-ui text-theme-text">
    <span class="font-bold text-theme-primary">I can show you:</span>
    {summary}
  </p>
  <p class="text-meta text-theme-muted">
    This only points at things on screen. It won't change anything in your
    vault.
  </p>
  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={onAccept}
      class="touch-target rounded bg-theme-primary px-3 py-1.5 text-meta font-bold uppercase tracking-wider text-theme-bg transition hover:bg-theme-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      Show me
    </button>
    <button
      type="button"
      onclick={onDismiss}
      class="touch-target rounded px-3 py-1.5 text-meta font-bold uppercase tracking-wider text-theme-muted transition hover:text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      No thanks
    </button>
  </div>
</div>
