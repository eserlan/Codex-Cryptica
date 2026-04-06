<script lang="ts">
  import type { ChatMessagePayload } from "$types/vtt";
  import { mapSession } from "$lib/stores/map-session.svelte";

  let { message } = $props<{ message: ChatMessagePayload }>();

  const isMe = $derived(message.senderId === (mapSession.myPeerId || "host"));
</script>

<div class="flex flex-col {isMe ? 'items-end' : 'items-start'} gap-1">
  <!-- Meta (Sender & Time) -->
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

  <!-- Message Bubble -->
  <div
    class="max-w-[90%] rounded-lg px-3 py-2 text-xs shadow-sm border
           {isMe
      ? 'bg-theme-primary/10 border-theme-primary/30 text-theme-text rounded-tr-none'
      : 'bg-theme-surface border-theme-border rounded-tl-none text-theme-text shadow-inner'}"
  >
    {#if message.roll}
      <div class="space-y-2">
        <!-- Formula -->
        <div
          class="flex items-center gap-2 border-b border-theme-text/10 pb-1.5 mb-1.5"
        >
          <span
            class="icon-[lucide--dice-5] w-3 h-3 text-theme-primary animate-pulse"
          ></span>
          <span class="font-bold font-mono tracking-tight text-theme-primary"
            >{message.roll.formula}</span
          >
        </div>

        <!-- Individual Rolls -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each message.roll.parts as part}
            {#if part.type === "dice"}
              {#each part.rolls || [] as roll, i}
                <div class="relative group">
                  <span
                    class="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded border border-theme-border bg-theme-bg/50 font-bold font-mono text-[11px] {part.dropped?.includes(
                      i,
                    )
                      ? 'line-through opacity-30 grayscale'
                      : 'shadow-sm'}"
                  >
                    {roll}
                  </span>
                  {#if part.sides}
                    <span
                      class="absolute -top-1.5 -right-1.5 text-[7px] bg-theme-border text-theme-muted px-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >d{part.sides}</span
                    >
                  {/if}
                </div>
              {/each}
            {:else}
              <span class="text-theme-muted font-bold font-mono text-sm px-1"
                >{part.value >= 0 ? "+" : "−"}{Math.abs(part.value)}</span
              >
            {/if}
          {/each}
        </div>

        <!-- Result -->
        <div
          class="flex items-center justify-between pt-1.5 border-t border-theme-text/10 mt-1.5"
        >
          <span
            class="text-[9px] uppercase font-bold tracking-[0.2em] opacity-50 font-header"
            >Result</span
          >
          <span
            class="text-xl font-bold font-mono text-theme-primary drop-shadow-[0_0_8px_rgba(var(--color-primary),0.3)]"
            >{message.roll.total}</span
          >
        </div>
      </div>
    {:else}
      <p class="leading-relaxed whitespace-pre-wrap font-body break-words">
        {message.content}
      </p>
    {/if}
  </div>
</div>
