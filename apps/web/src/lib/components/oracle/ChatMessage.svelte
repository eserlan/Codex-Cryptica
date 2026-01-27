<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";

  let { message }: { message: ChatMessage } = $props();

  let html = $derived(DOMPurify.sanitize(marked.parse(message.content) as string));
</script>

<div class="flex flex-col gap-1 mb-4 {message.role === 'user' ? 'items-end' : 'items-start'}">
  <div class="text-[10px] uppercase tracking-wider text-gray-500">
    {message.role}
  </div>
  <div class="px-4 py-2 rounded-lg max-w-[85%] text-sm leading-relaxed
    {message.role === 'user' 
      ? 'bg-green-900/30 text-green-100 border border-green-800/50' 
      : 'bg-zinc-900/50 text-gray-200 border border-zinc-800'}">
    {#if message.role === 'assistant'}
      <div class="prose prose-invert prose-sm">
        {@html html}
      </div>
    {:else}
      {message.content}
    {/if}
  </div>
</div>
