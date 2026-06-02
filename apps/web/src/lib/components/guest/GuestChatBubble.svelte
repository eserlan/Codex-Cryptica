<script lang="ts">
  import type { GuestChatMessage } from "schema";
  import { renderMarkdown } from "$lib/utils/markdown";

  let { message } = $props<{
    message: GuestChatMessage;
  }>();

  const isUser = $derived(message.role === "user");
</script>

<div
  class="flex flex-col gap-1 w-full max-w-[85%] {isUser
    ? 'self-end items-end'
    : 'self-start items-start'}"
>
  <span class="text-[9px] font-bold uppercase tracking-wider text-theme-muted">
    {isUser ? "You" : "Character"}
  </span>

  <div
    class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed border transition-all duration-200
    {isUser
      ? 'bg-theme-primary/10 border-theme-primary/20 text-theme-text rounded-tr-none shadow-[0_2px_8px_rgba(var(--color-theme-primary-rgb),0.05)]'
      : 'bg-theme-surface border-theme-border text-theme-text rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}"
  >
    {#if isUser}
      <p class="whitespace-pre-wrap">{message.content}</p>
    {:else}
      <div class="prose-content max-w-none">
        {@html renderMarkdown(message.content)}
      </div>
    {/if}
  </div>

  <span class="text-[8px] text-theme-muted select-none">
    {new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </span>
</div>
