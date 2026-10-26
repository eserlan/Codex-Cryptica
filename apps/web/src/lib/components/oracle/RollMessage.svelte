<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import type { RandomSourceRollPayload } from "$lib/stores/dice-history.svelte";
  import { slide } from "svelte/transition";
  import DiceRollResult from "$lib/components/dice/DiceRollResult.svelte";
  import SourceResultMessage from "$lib/components/random/SourceResultMessage.svelte";

  let { message }: { message: ChatMessage } = $props();
  const result = $derived(message.rollResult);

  /**
   * `/table` and `/deck` post their result here too, but a table result has no
   * formula and no dice to show — it is prose from a named source (#2247).
   */
  const sourceResult = $derived(
    result && "sourceName" in result
      ? (result as unknown as RandomSourceRollPayload)
      : undefined,
  );
</script>

{#if sourceResult}
  <div transition:slide>
    <SourceResultMessage result={sourceResult} />
  </div>
{:else if result}
  <div transition:slide>
    <DiceRollResult {result} />
  </div>
{/if}
