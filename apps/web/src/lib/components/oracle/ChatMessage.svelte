<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";
  import ImageMessage from "./ImageMessage.svelte";
  import { parseOracleResponse } from "editor-core";
  import { sanitizeId } from "$lib/utils/markdown";
  import { graph } from "$lib/stores/graph.svelte";

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

  let parsed = $derived(parseOracleResponse(message.content || ""));
  let detectedId = $derived(parsed.title ? sanitizeId(parsed.title) : null);
  let alreadyExists = $derived(
    detectedId ? !!vault.entities[detectedId] : false,
  );
  let showCreate = $derived(parsed.title && !alreadyExists && !isSaved);

  const applySmart = () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;

    // We want to update both fields if they exist in the parsed result
    const updates: Partial<{ content: string; lore: string }> = {};
    const entity = vault.entities[finalTargetId];
    if (!entity) return;

    if (parsed.chronicle) {
      updates.content = parsed.chronicle;
    }

    if (parsed.lore) {
      updates.lore = parsed.lore;
    }

    if (Object.keys(updates).length > 0) {
      vault.selectedEntityId = finalTargetId;
      // If both updated, default to status, otherwise lore if only lore updated
      vault.activeDetailTab = parsed.chronicle ? "status" : "lore";
      vault.updateEntity(finalTargetId, updates);
      isSaved = true;
    }
  };

  const createAsNode = async () => {
    if (!parsed.title || vault.isGuest) return;
    try {
      const type = (parsed.type || "npc") as any;
      const id = await vault.createEntity(type, parsed.title, {
        content: parsed.chronicle,
        lore: parsed.lore,
        connections: parsed.wikiLinks || [],
      });

      vault.selectedEntityId = id;
      vault.activeDetailTab = "status";
      isSaved = true;

      // Update message to point to new entity so further applies work
      oracle.updateMessageEntity(message.id, id);

      // Refit the graph to show the new node
      graph.requestFit();
    } catch (e) {
      console.error("Failed to create node from chat", e);
    }
  };

  const copyToChronicle = () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const newContent = message.content;

    vault.selectedEntityId = finalTargetId;
    vault.activeDetailTab = "status";
    vault.updateEntity(finalTargetId, { content: newContent });
    isSaved = true;
  };

  const copyToLore = () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const newContent = message.content;

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
  <div
    class="px-4 py-2 rounded-lg max-w-[85%] text-sm leading-relaxed
    {message.role === 'user'
      ? 'bg-green-900/30 text-green-100 border border-green-800/50'
      : 'bg-zinc-900/50 text-gray-200 border border-zinc-800'}"
  >
    {#if message.role === "assistant"}
      {#if message.type === "image"}
        <ImageMessage {message} />
      {:else}
        <div class="prose prose-invert prose-sm">
          {@html html}
        </div>

        {#if (targetEntity || activeEntity || showCreate) && message.content.length > 20 && !isSaved}
          <div
            class="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2 justify-end"
            transition:fade
          >
            {#if showCreate}
              <button
                onclick={createAsNode}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-green-900/40 text-green-300 border border-green-500/30 hover:bg-green-600 hover:text-white hover:border-green-500 group relative"
              >
                <span class="icon-[lucide--plus-circle] w-3.5 h-3.5 shrink-0"
                ></span>
                <span class="truncate"
                  >CREATE AS {parsed.type?.toUpperCase() || "NEW NODE"}: {parsed.title?.toUpperCase()}</span
                >

                <!-- Tooltip for Create -->
                <div
                  class="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900 border border-zinc-700 rounded shadow-xl p-2 hidden group-hover:block z-50 text-xs font-normal tracking-normal normal-case"
                >
                  <p class="text-green-400 font-bold mb-1">
                    Extracting new entity:
                  </p>
                  <div class="space-y-1 text-zinc-400">
                    <p><b>Name:</b> {parsed.title}</p>
                    <p><b>Type:</b> {parsed.type || "npc"}</p>
                    {#if parsed.wikiLinks && parsed.wikiLinks.length > 0}
                      <p>
                        <b>Connections:</b>
                        {parsed.wikiLinks.length} found
                      </p>
                    {/if}
                  </div>
                </div>
              </button>
            {/if}

            {#if targetEntity || activeEntity}
              {#if canOverride}
                <button
                  onclick={() =>
                    oracle.updateMessageEntity(message.id, activeEntity!.id)}
                  class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-white max-w-[200px]"
                  title="Change target to your current selection: {activeEntity!
                    .title}"
                >
                  <span class="icon-[lucide--refresh-cw] w-3 h-3 shrink-0"
                  ></span>
                  <span class="truncate"
                    >USE: {activeEntity!.title.toUpperCase()}</span
                  >
                </button>
              {/if}

              {#if parsed.wasSplit}
                <button
                  onclick={applySmart}
                  class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 max-w-[280px] group relative"
                  title="Save to {(targetEntity || activeEntity!).title}"
                >
                  <span class="icon-[lucide--wand-2] w-3 h-3 shrink-0"></span>
                  <span class="truncate"
                    >SMART APPLY TO {(
                      targetEntity || activeEntity!
                    ).title.toUpperCase()}</span
                  >

                  <!-- Tooltip Preview -->
                  <div
                    class="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900 border border-zinc-700 rounded shadow-xl p-2 hidden group-hover:block z-50 text-xs font-normal tracking-normal normal-case"
                  >
                    <div class="mb-2">
                      <span
                        class="text-green-400 font-bold uppercase text-[9px]"
                        >Chronicle:</span
                      >
                      <p class="line-clamp-2 text-zinc-400">
                        {parsed.chronicle || "(Empty)"}
                      </p>
                    </div>
                    <div>
                      <span class="text-blue-400 font-bold uppercase text-[9px]"
                        >Lore:</span
                      >
                      <p class="line-clamp-2 text-zinc-400">
                        {parsed.lore || "(Empty)"}
                      </p>
                    </div>
                  </div>
                </button>
              {:else if !isLore}
                <button
                  onclick={copyToChronicle}
                  class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:bg-purple-600 hover:text-black hover:border-purple-600 max-w-[250px]"
                  title="Save to {(targetEntity || activeEntity!).title}"
                >
                  <span class="icon-[lucide--copy-plus] w-3 h-3 shrink-0"
                  ></span>
                  <span class="truncate"
                    >COPY TO CHRONICLE ({(
                      targetEntity || activeEntity!
                    ).title.toUpperCase()})</span
                  >
                </button>
              {:else}
                <button
                  onclick={copyToLore}
                  class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-blue-900/20 text-blue-400 border border-blue-800/30 hover:bg-blue-600 hover:text-black hover:border-blue-600 max-w-[250px]"
                  title="Save to {(targetEntity || activeEntity!).title}"
                >
                  <span class="icon-[lucide--scroll-text] w-3 h-3 shrink-0"
                  ></span>
                  <span class="truncate"
                    >COPY TO LORE ({(
                      targetEntity || activeEntity!
                    ).title.toUpperCase()})</span
                  >
                </button>
              {/if}
            {/if}
          </div>
        {/if}
      {/if}
    {:else}
      {message.content}
    {/if}
  </div>
</div>
