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

  import { onMount } from "svelte";

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

  // Sync isSaved with global undo events
  onMount(() => {
    const channel = new BroadcastChannel("codex-oracle-sync");
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === "UNDO_PERFORMED" && data.messageId === message.id) {
        isSaved = false;
      }
    };
    return () => channel.close();
  });

  const LORE_THRESHOLD = 400; // Character limit: summary (Chronicle) vs detailed (Lore).

  // Only show UNDO button if this message was the last one to perform an action
  let isLastAction = $derived(
    oracle.undoStack.length > 0 && 
    oracle.undoStack[oracle.undoStack.length - 1].messageId === message.id
  );

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

  // Capture state helper
  const captureState = (entityId: string) => {
    const entity = vault.entities[entityId];
    if (!entity) return null;
    try {
      return structuredClone($state.snapshot(entity));
    } catch (e) {
      console.warn("Failed to structuredClone entity, falling back to JSON parse/stringify", e);
      return JSON.parse(JSON.stringify($state.snapshot(entity)));
    }
  };

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
      // 1. Capture State
      const beforeState = captureState(finalTargetId);

      vault.selectedEntityId = finalTargetId;
      // If both updated, default to status, otherwise lore if only lore updated
      vault.activeDetailTab = parsed.chronicle ? "status" : "lore";
      vault.updateEntity(finalTargetId, updates);
      isSaved = true;

      // 2. Push Undo
      if (beforeState) {
        oracle.pushUndoAction(`Smart Apply to ${beforeState.title}`, async () => {
          // Granular revert: only restore the fields we changed
          const undoUpdates: any = {};
          if (parsed.chronicle) undoUpdates.content = beforeState.content;
          if (parsed.lore) undoUpdates.lore = beforeState.lore;
          vault.updateEntity(beforeState.id, undoUpdates);
          isSaved = false; 
        }, message.id);
      }
    }
  };

  const createAsNode = async () => {
    if (!parsed.title || vault.isGuest) return;
    try {
      const type = (parsed.type || "character") as any;
      const connections = [
        ...(parsed.wikiLinks || []),
        ...(parsed.connections || []).map((conn) => {
          const targetName = typeof conn === 'string' ? conn : conn.target;
          const label = typeof conn === 'string' ? conn : (conn.label || conn.target);
          return {
            target: sanitizeId(targetName),
            label: label,
            type: "related_to",
            strength: 1.0,
          };
        }),
      ];

      const id = await vault.createEntity(type, parsed.title, {
        content: parsed.chronicle,
        lore: parsed.lore,
        connections,
        image: parsed.image,
        thumbnail: parsed.thumbnail,
      });

      vault.selectedEntityId = id;
      vault.activeDetailTab = "status";
      isSaved = true;

      // Update message to point to new entity so further applies work
      oracle.updateMessageEntity(message.id, id);

      // Refit the graph to show the new node
      graph.requestFit();

      // Push Undo (Delete)
      oracle.pushUndoAction(`Create Node ${parsed.title}`, async () => {
        await vault.deleteEntity(id);
        // Reset message to point back to nothing or its original entity
        oracle.updateMessageEntity(message.id, null); 
        isSaved = false;
      }, message.id);

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

    // 1. Capture State
    const beforeState = captureState(finalTargetId);

    vault.selectedEntityId = finalTargetId;
    vault.activeDetailTab = "status";
    vault.updateEntity(finalTargetId, { content: newContent });
    isSaved = true;

    // 2. Push Undo
    if (beforeState) {
      oracle.pushUndoAction(`Update Chronicle: ${beforeState.title}`, async () => {
        vault.updateEntity(beforeState.id, { content: beforeState.content });
        isSaved = false;
      }, message.id);
    }
  };

  const copyToLore = () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const newContent = message.content;

    // 1. Capture State
    const beforeState = captureState(finalTargetId);

    vault.selectedEntityId = finalTargetId;
    vault.activeDetailTab = "lore";
    vault.updateEntity(finalTargetId, { lore: newContent });
    isSaved = true;

    // 2. Push Undo
    if (beforeState) {
      oracle.pushUndoAction(`Update Lore: ${beforeState.title}`, async () => {
        vault.updateEntity(beforeState.id, { lore: beforeState.lore });
        isSaved = false;
      }, message.id);
    }
  };

  const handleUndo = async () => {
    await oracle.undo();
    // Local UI update handled by reactivity if we needed it, 
    // but oracle.undo() manages the stack. 
    // We just might want to reset isSaved if we could correlate, 
    // but simply clicking undo is enough.
    // Ideally we track if *this* message was the last action, 
    // but for now global undo is the pattern.
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
      ? 'bg-theme-primary/15 text-theme-text border border-theme-primary/40 shadow-lg shadow-theme-primary/5'
      : 'bg-theme-surface border border-theme-border text-theme-text'}"
  >
    {#if message.role === "assistant"}
      {#if message.type === "image"}
        <ImageMessage {message} />
      {:else}
        <div class="prose prose-sm">
          {@html html}
        </div>

        {#if (targetEntity || activeEntity || showCreate) && message.content.length > 20}
          {#if !isSaved}
            <div
              class="mt-3 pt-3 border-t border-theme-border flex flex-wrap gap-2 justify-end"
              transition:fade
            >
              {#if showCreate}
                <button
                  onclick={createAsNode}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black group relative"
                >
                  <span class="icon-[lucide--plus-circle] w-3.5 h-3.5 shrink-0"
                  ></span>
                  <span class="truncate"
                    >CREATE AS {parsed.type?.toUpperCase() || "NEW NODE"}: {parsed.title?.toUpperCase()}</span
                  >

                  <!-- Tooltip for Create -->
                  <div
                    class="absolute bottom-full right-0 mb-2 w-64 bg-theme-surface border border-theme-border rounded shadow-xl p-2 hidden group-hover:block z-50 text-xs font-normal tracking-normal normal-case"
                  >
                    <p class="text-theme-primary font-bold mb-1">
                      Extracting new entity:
                    </p>
                    <div class="space-y-1 text-theme-text/80">
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
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-surface border border-theme-border text-theme-muted hover:bg-theme-primary hover:text-black hover:border-theme-primary max-w-[200px]"
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
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black max-w-[280px] group relative"
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
                      class="absolute bottom-full right-0 mb-2 w-64 bg-theme-surface border border-theme-border rounded shadow-xl p-2 hidden group-hover:block z-50 text-xs font-normal tracking-normal normal-case"
                    >
                      <div class="mb-2">
                        <span
                          class="text-theme-primary font-bold uppercase text-[9px]"
                          >Chronicle:</span
                        >
                        <p class="line-clamp-2 text-theme-text/80">
                          {parsed.chronicle || "(Empty)"}
                        </p>
                      </div>
                      <div>
                        <span
                          class="text-theme-accent font-bold uppercase text-[9px]"
                          >Lore:</span
                        >
                        <p class="line-clamp-2 text-theme-text/80">
                          {parsed.lore || "(Empty)"}
                        </p>
                      </div>
                    </div>
                  </button>
                {:else if !isLore}
                  <button
                    onclick={copyToChronicle}
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black max-w-[250px]"
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
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-accent/10 text-theme-accent border border-theme-accent/30 hover:bg-theme-accent hover:text-black max-w-[250px]"
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
          {:else}
            <!-- Saved State with Undo -->
            <div
              class="mt-3 pt-2 border-t border-theme-border flex items-center justify-between"
              transition:fade
            >
              <span class="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="icon-[lucide--check-circle] w-3 h-3"></span>
                SAVED
              </span>
              
              {#if isLastAction}
                <button 
                  onclick={handleUndo}
                  class="text-[10px] text-theme-muted hover:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  title="Undo changes (Ctrl+Z)"
                >
                  <span class="icon-[lucide--undo-2] w-3 h-3"></span>
                  UNDO
                </button>
              {/if}
            </div>
          {/if}
        {/if}
      {/if}
    {:else}
      {message.content}
    {/if}
  </div>
</div>
