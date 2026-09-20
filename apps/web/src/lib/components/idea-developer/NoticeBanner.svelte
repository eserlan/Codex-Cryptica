<script lang="ts">
  import type { IdeaDeveloperNotice } from "$lib/stores/idea-developer.svelte";

  let { notice }: { notice: IdeaDeveloperNotice | null } = $props();

  function retryTime(retryAt: number): string {
    return new Date(retryAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

{#if notice}
  <div
    role="alert"
    class="rounded-lg border border-theme-border/70 bg-theme-surface/50 p-3 text-lg sm:text-base text-theme-text"
  >
    <p>{notice.message}</p>
    {#if notice.kind === "limited"}
      <p class="mt-1 text-base sm:text-sm text-theme-muted">
        Available again at
        <time data-testid="retry-time">{retryTime(notice.retryAt)}</time>
      </p>
    {/if}
  </div>
{/if}
