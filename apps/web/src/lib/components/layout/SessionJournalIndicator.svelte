<script lang="ts">
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";

  /**
   * A dot that shows a Session Journal is running (spec 163, FR-019), so a
   * running session is noticeable while the scratchpad panel is closed.
   * Renders nothing unless the tool is the Session Journal item and a journal
   * is running. Taking `toolId` keeps that check out of the (already large)
   * nav templates that render every tool. The meaning is carried by the
   * label, not by colour alone.
   */
  let { toolId, class: className = "" }: { toolId: string; class?: string } =
    $props();
</script>

{#if toolId === "session-journal" && sessionJournalStore.controlState !== "start"}
  <span
    class="h-2.5 w-2.5 rounded-full {className}"
    data-testid="session-journal-indicator"
    role="img"
    aria-label="A session journal is active"
  ></span>
{/if}
