<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import AdventureComposer from "./AdventureComposer.svelte";
  import AdventureLiveTranscript from "./AdventureLiveTranscript.svelte";
  let { manager }: { manager: AdventureManager } = $props();
</script>

<section class="space-y-4" aria-label="Adventure play">
  <AdventureLiveTranscript {manager} />
  <AdventureComposer {manager} />
</section>
