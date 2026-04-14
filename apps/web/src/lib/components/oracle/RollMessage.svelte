<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { slide } from "svelte/transition";
  import DiceRollResult from "$lib/components/dice/DiceRollResult.svelte";

  let { message }: { message: ChatMessage } = $props();
  const result = $derived(message.rollResult);
</script>

{#if result}
  <div transition:slide>
    <DiceRollResult {result} />
  </div>
{/if}
