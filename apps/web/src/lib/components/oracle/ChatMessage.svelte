<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";

  let { message }: { message: ChatMessage } = $props();

  let html = $derived(
    DOMPurify.sanitize(marked.parse(message.content || "") as string),
  );
  let targetEntity = $derived(
    message.archiveTargetId || message.entityId
      ? vault.entities[message.archiveTargetId || message.entityId!]
      : null,
  );
  let activeEntity = $derived(
    vault.selectedEntityId ? vault.entities[vault.selectedEntityId] : null,
  );
  let canOverride = $derived(
    activeEntity && (!targetEntity || activeEntity.id !== targetEntity.id),
  );

  let isSaved = $state(false);
  const LORE_THRESHOLD = 400; // Character limit: summary (Chronicle) vs detailed (Lore).

  // Intelligent intent detection for archival type
  let isLore = $derived.by(() => {
    // 1. Check if user explicitly asked for a short format in the PREVIOUS message
    const msgIndex = oracle.messages.findIndex((m) => m.id === message.id);
    if (msgIndex > 0) {
      const prevMsg = oracle.messages[msgIndex - 1];
      if (prevMsg.role === "user") {
        const query = prevMsg.content.toLowerCase();
        if (
          query.includes("blurb") ||
          query.includes("chronicle") ||
          query.includes("short desc")
        ) {
          return false;
        }
        if (
          query.includes("expansive") ||
          query.includes("detailed") ||
          query.includes("lore") ||
          query.includes("deep dive")
        ) {
          return true;
        }
      }
    }

    // 2. Default to length-based heuristic
    return message.content.length >= LORE_THRESHOLD;
  });

  const copyToChronicle = () => {
    const finalTargetId = message.archiveTargetId || message.entityId || (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const existing = vault.entities[finalTargetId]?.content || "";
    const newContent = existing
      ? `${existing}\n\n---\n${message.content}`
      : message.content;

    vault.selectedEntityId = finalTargetId;
    vault.activeDetailTab = "status";
    vault.updateEntity(finalTargetId, { content: newContent });
    isSaved = true;
  };

  const copyToLore = () => {
    const finalTargetId = message.archiveTargetId || message.entityId || (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const existing = vault.entities[finalTargetId]?.lore || "";
    const newContent = existing
      ? `${existing}\n\n---\n${message.content}`
      : message.content;

    vault.selectedEntityId = finalTargetId;
    vault.activeDetailTab = "lore";
    vault.updateEntity(finalTargetId, { lore: newContent });
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

      {#if (targetEntity || activeEntity) && message.content.length > 20 && !isSaved}
        <div
          class="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2 justify-end"
          transition:fade
        >
          {#if canOverride}
            <button
              onclick={() =>
                oracle.updateMessageEntity(message.id, activeEntity!.id)}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-white max-w-[200px]"
              title="Change target to your current selection: {activeEntity!
                .title}"
            >
              <span class="icon-[lucide--refresh-cw] w-3 h-3 shrink-0"></span>
              <span class="truncate"
                >USE: {activeEntity!.title.toUpperCase()}</span
              >
            </button>
          {/if}

          {#if !isLore}
            <button
              onclick={copyToChronicle}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:bg-purple-600 hover:text-black hover:border-purple-600 max-w-[250px]"
              title="Save to {(targetEntity || activeEntity!).title}"
            >
              <span class="icon-[lucide--copy-plus] w-3 h-3 shrink-0"></span>
              <span class="truncate"
                >COPY TO CHRONICLE ({(targetEntity || activeEntity!).title.toUpperCase()})</span
              >
            </button>
          {:else}
            <button
              onclick={copyToLore}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-blue-900/20 text-blue-400 border border-blue-800/30 hover:bg-blue-600 hover:text-black hover:border-blue-600 max-w-[250px]"
              title="Save to {(targetEntity || activeEntity!).title}"
            >
              <span class="icon-[lucide--scroll-text] w-3 h-3 shrink-0"></span>
              <span class="truncate"
                >COPY TO LORE ({(targetEntity || activeEntity!).title.toUpperCase()})</span
              >
            </button>
          {/if}
        </div>
      {/if}
    {:else}
      {message.content}
    {/if}
  </div>
</div>
