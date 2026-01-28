<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";

  let { message }: { message: ChatMessage } = $props();

  let html = $derived(
    DOMPurify.sanitize(marked.parse(message.content || "") as string),
  );
  let targetEntity = $derived(
    message.entityId ? vault.entities[message.entityId] : null,
  );

  let isSaved = $state(false);
  const LORE_THRESHOLD = 200;
  let isLore = $derived(message.content.length >= LORE_THRESHOLD);

  const copyToChronicle = () => {
    if (!message.entityId || !message.content) return;
    const existing = vault.entities[message.entityId]?.content || "";
    const newContent = existing ? `${existing}\n\n---\n${message.content}` : message.content;
    
    vault.selectedEntityId = message.entityId;
    vault.activeDetailTab = "status";
    vault.updateEntity(message.entityId, { content: newContent });
    isSaved = true;
  };

  const copyToLore = () => {
    if (!message.entityId || !message.content) return;
    const existing = vault.entities[message.entityId]?.lore || "";
    const newContent = existing ? `${existing}\n\n---\n${message.content}` : message.content;

    vault.selectedEntityId = message.entityId;
    vault.activeDetailTab = "lore";
    vault.updateEntity(message.entityId, { lore: newContent });
    isSaved = true;
  };
</script>

<div
  class="flex flex-col gap-1 mb-4 {message.role === 'user'
    ? 'items-end'
    : 'items-start'}"
>
  <div class="text-[10px] uppercase tracking-wider text-gray-500">
    {message.role}
  </div>
  <div
    class="px-4 py-2 rounded-lg max-w-[85%] text-sm leading-relaxed
    {message.role === 'user'
      ? 'bg-green-900/30 text-green-100 border border-green-800/50'
      : 'bg-zinc-900/50 text-gray-200 border border-zinc-800'}"
  >
    {#if message.role === "assistant"}
      <div class="prose prose-invert prose-sm">
        {@html html}
      </div>

      {#if targetEntity && message.content.length > 20 && !isSaved}
        <div
          class="mt-3 pt-3 border-t border-zinc-800 flex justify-end"
          transition:fade
        >
          {#if !isLore}
            <button
              onclick={copyToChronicle}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:bg-purple-600 hover:text-black hover:border-purple-600"
              title="Save to primary Chronicle"
            >
              <span class="icon-[lucide--copy-plus] w-3 h-3"></span>
              COPY TO CHRONICLE
            </button>
          {:else}
            <button
              onclick={copyToLore}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-blue-900/20 text-blue-400 border border-blue-800/30 hover:bg-blue-600 hover:text-black hover:border-blue-600"
              title="Save to detailed Lore & Notes"
            >
              <span class="icon-[lucide--scroll-text] w-3 h-3"></span>
              COPY TO LORE
            </button>
          {/if}
        </div>
      {/if}
    {:else}
      {message.content}
    {/if}
  </div>
</div>
