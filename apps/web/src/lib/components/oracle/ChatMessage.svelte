<script lang="ts">
  import { browser } from "$app/environment";
  import DOMPurify from "dompurify";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { parseOracleResponse } from "editor-core";
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { parserService } from "$lib/services/parser";
  import { ClipboardService } from "$lib/services/ClipboardService";
  import ImageMessage from "./ImageMessage.svelte";
  import RollMessage from "./RollMessage.svelte";
  import ConnectionWizard from "./ConnectionWizard.svelte";
  import MergeWizard from "./MergeWizard.svelte";
  import {
    canOverrideTarget,
    getTargetEntityId,
    isLoreMessage,
    renderMessageHtml,
    shouldShowActions,
    shouldShowCreateAction,
  } from "./chat-message.helpers";
  import { ChatMessageActions } from "./chat-message.actions";
  import { sanitizeId } from "$lib/utils/markdown";

  let { message = $bindable() }: { message: ChatMessage } = $props();
  const chatMessageActions = new ChatMessageActions({
    oracle,
    vault,
    graph,
  });
  const clipboardService = new ClipboardService();

  let targetEntity = $derived(
    getTargetEntityId(message, vault.selectedEntityId)
      ? vault.entities[getTargetEntityId(message, vault.selectedEntityId)!]
      : null,
  );
  let activeEntity = $derived(
    vault.selectedEntityId ? vault.entities[vault.selectedEntityId] : null,
  );
  let canOverride = $derived(
    canOverrideTarget(targetEntity?.id ?? null, activeEntity?.id ?? null),
  );

  let isSaved = $state(false);
  let isCopied = $state(false);
  let htmlCache = $state("");
  let lastParsedContent = "";

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

  let isLastAction = $derived(
    oracle.undoStack.length > 0 &&
      oracle.undoStack[oracle.undoStack.length - 1].messageId === message.id,
  );
  let parsed = $derived(parseOracleResponse(message.content || ""));
  let detectedId = $derived(parsed.title ? sanitizeId(parsed.title) : null);
  let alreadyExists = $derived(
    detectedId ? !!vault.entities[detectedId] : false,
  );
  let showCreate = $derived(
    shouldShowCreateAction(parsed, alreadyExists, isSaved),
  );
  let isLore = $derived(isLoreMessage(message, oracle.messages));
  let showActions = $derived(
    shouldShowActions(message, parsed, oracle.isLoading),
  );

  $effect(() => {
    if (message.content && message.content !== lastParsedContent) {
      const currentContent = message.content;
      renderMessageHtml(currentContent, parserService, browser, DOMPurify)
        .then((html) => {
          if (currentContent !== message.content) return;
          htmlCache = html;
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

    try {
      let contentToCopy = htmlCache;
      if (!contentToCopy) {
        contentToCopy = await renderMessageHtml(
          message.content,
          parserService,
          browser,
          DOMPurify,
        );
      }

      const success = await clipboardService.copyHtmlAndText(
        contentToCopy,
        message.content,
      );

      if (success) {
        isCopied = true;
        setTimeout(() => (isCopied = false), 2000);
      }
    } catch (err) {
      console.error("[ChatMessage] Clipboard copy failed:", err);
    }
  }

  const applySmart = async () => {
    await chatMessageActions.applySmart({
      message,
      parsed,
      activeEntityId: activeEntity?.id ?? null,
      setSaved: (saved) => {
        isSaved = saved;
      },
    });
  };

  const createAsNode = async () => {
    await chatMessageActions.createAsNode({
      message,
      parsed,
      setSaved: (saved) => {
        isSaved = saved;
      },
    });
  };

  const copyToChronicle = async () => {
    await chatMessageActions.copyToChronicle({
      message,
      activeEntityId: activeEntity?.id ?? null,
      setSaved: (saved) => {
        isSaved = saved;
      },
    });
  };

  const copyToLore = async () => {
    await chatMessageActions.copyToLore({
      message,
      activeEntityId: activeEntity?.id ?? null,
      setSaved: (saved) => {
        isSaved = saved;
      },
    });
  };

  const handleUndo = async () => {
    await chatMessageActions.undo();
  };
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
