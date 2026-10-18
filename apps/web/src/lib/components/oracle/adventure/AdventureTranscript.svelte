<script lang="ts">
  import type { PlayerTranscript } from "@codex/adventure-engine";
  let { transcript }: { transcript: PlayerTranscript } = $props();
</script>

<section class="space-y-3" aria-labelledby="adventure-transcript-heading">
  <h2
    id="adventure-transcript-heading"
    class="text-lg font-semibold text-theme-primary"
  >
    {transcript.title}
  </h2>
  {#each transcript.turns as turn (turn.sequence)}<article
      class="rounded-lg border border-theme-border p-3"
    >
      <p class="text-sm text-theme-primary">{turn.playerAction}</p>
      <p class="mt-2 text-sm text-theme-secondary">{turn.narration}</p>
    </article>{/each}
</section>
