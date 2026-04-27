<script lang="ts">
  import DiceRollResult from "$lib/components/dice/DiceRollResult.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import type { ChatMessagePayload } from "../../../types/vtt";

  let { message } = $props<{ message: ChatMessagePayload }>();

  const isMe = $derived(message.senderId === (mapSession.myPeerId || "host"));
</script>

<div class="flex flex-col {isMe ? 'items-end' : 'items-start'} gap-1">
  <div class="flex items-center gap-2 px-1">
    <span
      class="text-[9px] font-bold uppercase tracking-widest text-theme-muted font-header"
    >
      {message.sender}
    </span>
    <span class="text-[8px] opacity-40 font-mono">
      {new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  </div>

  <div
    class="max-w-[95%] sm:max-w-[90%] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs shadow-sm border
           {isMe
      ? 'bg-theme-primary/10 border-theme-primary/30 text-theme-text rounded-tr-none'
      : 'bg-theme-surface border-theme-border rounded-tl-none text-theme-text shadow-inner'}"
  >
    {#if message.roll}
      <DiceRollResult result={message.roll} />
    {:else}
      <p class="leading-relaxed whitespace-pre-wrap font-body break-words">
        {message.content}
      </p>
    {/if}
  </div>
</div>
