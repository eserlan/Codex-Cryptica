<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import { parserService } from "$lib/services/parser";
  import { browser } from "$app/environment";
  import DOMPurify from "dompurify";
  import ImageMessage from "./ImageMessage.svelte";
  import RollMessage from "./RollMessage.svelte";
  import ConnectionWizard from "./ConnectionWizard.svelte";
  import MergeWizard from "./MergeWizard.svelte";
  import { parseOracleResponse } from "editor-core";
  import { sanitizeId } from "$lib/utils/markdown";
  import { graph } from "$lib/stores/graph.svelte";

  import { onMount } from "svelte";

  let { message = $bindable() }: { message: ChatMessage } = $props();

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
      oracle.undoStack[oracle.undoStack.length - 1].messageId === message.id,
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

  let showActions = $derived.by(() => {
    if (message.role !== "assistant") return false;
    if (
      message.type === "image" ||
      message.type === "roll" ||
      message.type === "wizard"
    )
      return false;

    // Structured response detected
    if (parsed.wasSplit || (parsed.title && parsed.title.length > 3))
      return true;

    // Content length heuristic (only check after generation finishes)
    if (
      !oracle.isLoading &&
      message.content &&
      message.content.length > LORE_THRESHOLD
    )
      return true;

    return false;
  });

  // Capture state helper
  const captureState = (entityId: string) => {
    const entity = vault.entities[entityId];
    if (!entity) return null;
    try {
      return structuredClone($state.snapshot(entity));
    } catch (e) {
      console.warn(
        "Failed to structuredClone entity, falling back to JSON parse/stringify",
        e,
      );
      return JSON.parse(JSON.stringify($state.snapshot(entity)));
    }
  };

  const applySmart = async () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);

    console.log("[Oracle] Smart Apply triggered for:", finalTargetId);

    if (!finalTargetId || !message.content) {
      console.warn("[Oracle] Smart Apply aborted: Missing target or content");
      return;
    }

    // We want to update both fields if they exist in the parsed result
    const updates: Partial<{ content: string; lore: string }> = {};
    const entity = vault.entities[finalTargetId];
    if (!entity) {
      console.error(
        "[Oracle] Smart Apply failed: Entity not found in vault",
        finalTargetId,
      );
      return;
    }

    if (parsed.chronicle) {
      updates.content = parsed.chronicle;
    }

    if (parsed.lore) {
      updates.lore = parsed.lore;
    }

    console.log("[Oracle] Smart Apply updates:", updates);

    if (Object.keys(updates).length > 0) {
      // 1. Capture State
      const beforeState = captureState(finalTargetId);

      vault.selectedEntityId = finalTargetId;
      await vault.updateEntity(finalTargetId, updates);
      isSaved = true;

      // 2. Push Undo
      if (beforeState) {
        oracle.pushUndoAction(
          `Smart Apply to ${beforeState.title}`,
          async () => {
            // Granular revert: only restore the fields we changed
            const undoUpdates: any = {};
            if (parsed.chronicle) undoUpdates.content = beforeState.content;
            if (parsed.lore) undoUpdates.lore = beforeState.lore;
            await vault.updateEntity(beforeState.id, undoUpdates);
            isSaved = false;
          },
          message.id,
        );
      }
    } else {
      console.warn("[Oracle] Smart Apply aborted: No updates extracted");
    }
  };

  const createAsNode = async () => {
    if (!parsed.title || vault.isGuest) return;
    try {
      const type = (parsed.type || "character") as any;
      const connections = [
        ...(parsed.connections || []).map((conn) => {
          const targetName = typeof conn === "string" ? conn : conn.target;
          const label =
            typeof conn === "string" ? conn : conn.label || conn.target;
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
      isSaved = true;

      // Update message to point to new entity so further applies work
      oracle.updateMessageEntity(message.id, id);

      // Refit the graph to show the new node
      graph.requestFit();

      // Push Undo (Delete)
      oracle.pushUndoAction(
        `Create Node ${parsed.title}`,
        async () => {
          await vault.deleteEntity(id);
          // Reset message to point back to nothing or its original entity
          oracle.updateMessageEntity(message.id, null);
          isSaved = false;
        },
        message.id,
      );
    } catch (e) {
      console.error("Failed to create node from chat", e);
    }
  };

  const copyToChronicle = async () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const newContent = message.content;

    // 1. Capture State
    const beforeState = captureState(finalTargetId);

    vault.selectedEntityId = finalTargetId;
    await vault.updateEntity(finalTargetId, { content: newContent });
    isSaved = true;

    // 2. Push Undo
    if (beforeState) {
      oracle.pushUndoAction(
        `Update Chronicle: ${beforeState.title}`,
        async () => {
          await vault.updateEntity(beforeState.id, {
            content: beforeState.content,
          });
          isSaved = false;
        },
        message.id,
      );
    }
  };

  const copyToLore = async () => {
    const finalTargetId =
      message.archiveTargetId ||
      message.entityId ||
      (activeEntity ? activeEntity.id : null);
    if (!finalTargetId || !message.content) return;
    const newContent = message.content;

    // 1. Capture State
    const beforeState = captureState(finalTargetId);

    vault.selectedEntityId = finalTargetId;
    await vault.updateEntity(finalTargetId, { lore: newContent });
    isSaved = true;

    // 2. Push Undo
    if (beforeState) {
      oracle.pushUndoAction(
        `Update Lore: ${beforeState.title}`,
        async () => {
          await vault.updateEntity(beforeState.id, { lore: beforeState.lore });
          isSaved = false;
        },
        message.id,
      );
    }
  };

  const handleUndo = async () => {
    await oracle.undo();
  };

  let isCopied = $state(false);

  // Cache parsed HTML for both display and clipboard
  let htmlCache = $state("");
  let lastParsedContent = "";
  $effect(() => {
    if (message.content && message.content !== lastParsedContent) {
      const currentContent = message.content;
      parserService
        .parse(message.content)
        .then((html) => {
          if (currentContent !== message.content) return;
          htmlCache = browser
            ? DOMPurify.sanitize(html, {
                ALLOWED_URI_REGEXP:
                  /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
              })
            : html;
          lastParsedContent = currentContent;
        })
        .catch((err) => {
          console.error("[ChatMessage] Parsing failed:", err);
          htmlCache = `<p class="text-red-400">Failed to render chronicle.</p>`;
        });
    }
  });

  async function copyToClipboard() {
    if (!message.content) return;

    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        let contentToCopy = htmlCache;
        if (!contentToCopy) {
          const rawHtml = await parserService.parse(message.content);
          contentToCopy = browser
            ? DOMPurify.sanitize(rawHtml, {
                ALLOWED_URI_REGEXP:
                  /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
              })
            : rawHtml;
        }
        const blobHtml = new Blob([contentToCopy], { type: "text/html" });
        const blobText = new Blob([message.content], { type: "text/plain" });
        const data = [
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ];
        await navigator.clipboard.write(data);
        isCopied = true;
        setTimeout(() => (isCopied = false), 2000);
        return;
      } catch (err) {
        console.warn("[ChatMessage] Rich text copy failed, falling back:", err);
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
        isCopied = true;
        setTimeout(() => (isCopied = false), 2000);
      }
    } catch (e) {
      console.error("[ChatMessage] Clipboard fallback failed:", e);
    }
  }
</script>

<div
  class="flex flex-col gap-1 mb-4 {message.role === 'user'
    ? 'items-end'
    : 'items-start'}"
  data-testid="chat-message"
  data-role={message.role}
>
  <div
    class="px-4 py-2 rounded-lg max-w-[85%] text-sm leading-relaxed relative group/msg overflow-hidden font-body
    {message.role === 'user'
      ? 'bg-theme-primary/15 text-theme-text border border-theme-primary/40 shadow-lg shadow-theme-primary/5'
      : 'bg-theme-surface border border-theme-border text-theme-text'}"
  >
    {#if message.role === "assistant" || message.role === "system"}
      {#if message.type === "wizard"}
        {#if message.wizardType === "connection"}
          <ConnectionWizard bind:message />
        {:else if message.wizardType === "merge"}
          <MergeWizard bind:message />
        {/if}
      {:else}
        {#if message.type === "image"}
          <ImageMessage {message} />
        {/if}

        {#if message.type === "roll"}
          <RollMessage {message} />
        {/if}

        {#if message.content}
          <div
            class="prose prose-sm {message.type === 'image' ||
            message.type === 'roll'
              ? 'mt-4 border-t border-theme-border/30 pt-2'
              : ''}"
          >
            {#if htmlCache}
              {@html htmlCache}
            {:else}
              <div class="space-y-2 animate-pulse py-1">
                <div class="bg-theme-border/20 h-3 w-full rounded"></div>
                <div class="bg-theme-border/20 h-3 w-[90%] rounded"></div>
                <div class="bg-theme-border/20 h-3 w-[95%] rounded"></div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Copy Icon (Rich Text) -->
        <div
          class="absolute bottom-1 right-2 opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <button
            onclick={copyToClipboard}
            class="p-1 rounded bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary transition-all flex items-center gap-1.5"
            title="Copy rich text to clipboard"
            aria-label="Copy rich text to clipboard"
            type="button"
          >
            {#if isCopied}
              <span
                class="text-[9px] font-bold tracking-tighter uppercase font-header"
                >Copied!</span
              >
              <span class="icon-[lucide--check] w-3 h-3 text-green-400"></span>
            {:else}
              <span class="icon-[lucide--copy] w-3 h-3"></span>
            {/if}
          </button>
        </div>

        {#if showActions && (message.hasDrawAction || ((targetEntity || activeEntity || showCreate) && message.content.length > 20))}
          {#if !isSaved}
            <div
              class="mt-3 pt-3 border-t border-theme-border flex flex-wrap gap-2 justify-end"
              transition:fade
            >
              {#if message.hasDrawAction}
                <button
                  onclick={() => oracle.drawMessage(message.id)}
                  disabled={message.isDrawing || oracle.isLoading}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-accent/10 text-theme-accent border border-theme-accent/30 hover:bg-theme-accent hover:text-black group relative disabled:opacity-50"
                  aria-label="Draw visualization for this message"
                  aria-busy={message.isDrawing}
                >
                  {#if message.isDrawing}
                    <span
                      class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin"
                      aria-hidden="true"
                    ></span>
                    <span>DRAWING...</span>
                  {:else}
                    <span
                      class="icon-[lucide--palette] w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    ></span>
                    <span class="font-header">DRAW</span>
                  {/if}

                  {#if message.isDrawing && oracle.activeStyleTitle}
                    <div
                      class="absolute bottom-full right-0 mb-2 w-48 bg-theme-surface border border-theme-border rounded shadow-xl p-2 z-50 text-[9px] font-bold tracking-widest uppercase font-header text-theme-primary animate-pulse"
                      aria-live="polite"
                    >
                      Style: {oracle.activeStyleTitle}
                    </div>
                  {/if}
                </button>
              {/if}

              {#if showCreate}
                <button
                  onclick={createAsNode}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black group relative"
                >
                  <span class="icon-[lucide--plus-circle] w-3.5 h-3.5 shrink-0"
                  ></span>
                  <span class="truncate font-header"
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
                    <span class="truncate font-header"
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
                    <span class="truncate font-header"
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
                          class="text-theme-primary font-bold uppercase font-header text-[9px]"
                          >Chronicle:</span
                        >
                        <p class="line-clamp-2 text-theme-text/80">
                          {parsed.chronicle || "(Empty)"}
                        </p>
                      </div>
                      <div>
                        <span
                          class="text-theme-accent font-bold uppercase font-header text-[9px]"
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
                    <span class="truncate font-header"
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
                    <span class="truncate font-header"
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
              <span
                class="text-[10px] text-green-400 font-bold uppercase font-header tracking-wider flex items-center gap-1"
              >
                <span class="icon-[lucide--check-circle] w-3 h-3"></span>
                SAVED
              </span>

              {#if isLastAction}
                <button
                  onclick={handleUndo}
                  class="text-[10px] text-theme-muted hover:text-red-400 font-bold uppercase font-header tracking-wider flex items-center gap-1 transition-colors"
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
