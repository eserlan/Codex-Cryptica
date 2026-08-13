<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { parseOracleResponse } from "editor-core";
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import ImageMessage from "./ImageMessage.svelte";
  import RollMessage from "./RollMessage.svelte";
  import ConnectionWizard from "./ConnectionWizard.svelte";
  import MergeWizard from "./MergeWizard.svelte";
  import DiscoveryChip from "./DiscoveryChip.svelte";
  import {
    canOverrideTarget,
    getTargetEntityId,
    isLoreMessage,
    shouldShowActions,
    shouldShowCreateAction,
  } from "./chat-message.helpers";
  import { ChatMessageController } from "./chat-message-controller.svelte";
  import { sanitizeId } from "$lib/utils/markdown";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import Autocomplete from "../ui/Autocomplete.svelte";

  let { message = $bindable() }: { message: ChatMessage } = $props();
  const controller = new ChatMessageController({
    oracle,
    vault,
    graph,
    revisionService,
  });

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

  onMount(() => {
    controller.subscribeToUndo(message);
    return () => {
      controller.destroy();
    };
  });

  $effect(() => {
    controller.consumeSelectedEntity(message);
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
    shouldShowCreateAction(parsed, alreadyExists, controller.isSaved),
  );
  let isLore = $derived(isLoreMessage(message, oracle.messages));
  let showActions = $derived(
    shouldShowActions(message, parsed, oracle.isLoading),
  );
  let visibleProposals = $derived(controller.getVisibleProposals(message));

  $effect(() => {
    controller.resetSavedWhenDraftCleared(message, isLastAction);
  });

  $effect(() => {
    controller.renderContent(message);
  });

  const applySmart = async () => {
    await controller.applySmart({
      message,
      parsed,
      activeEntityId: activeEntity?.id ?? null,
    });
  };

  const createAsNode = async () => {
    await controller.createAsNode({ message, parsed });
  };

  const copyToChronicle = async () => {
    await controller.copyToChronicle({
      message,
      activeEntityId: activeEntity?.id ?? null,
    });
  };

  const copyToLore = async () => {
    await controller.copyToLore({
      message,
      activeEntityId: activeEntity?.id ?? null,
    });
  };

  const handleUndo = async () => {
    await controller.undo();
  };
</script>

<div
  class="flex flex-col gap-1 {message.role === 'user'
    ? 'items-end'
    : 'items-start'}"
  data-testid="chat-message"
  data-role={message.role}
>
  <div
    class="px-3 sm:px-4 py-2 rounded-lg max-w-[92%] sm:max-w-[85%] text-sm leading-relaxed relative group/msg overflow-hidden font-body
    {message.role === 'user'
      ? 'bg-theme-primary/15 text-theme-text border border-theme-primary/40 shadow-lg shadow-theme-primary/5'
      : 'bg-theme-surface border border-theme-border text-theme-text'}"
  >
    {#if message.role === "assistant" || message.role === "system"}
      {#if message.type === "wizard" && !vault.isGuest}
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
            {#if controller.htmlCache}
              {@html controller.htmlCache}
            {:else}
              <div class="space-y-2 animate-pulse py-1">
                <div class="bg-theme-border/20 h-3 w-full rounded"></div>
                <div class="bg-theme-border/20 h-3 w-[90%] rounded"></div>
                <div class="bg-theme-border/20 h-3 w-[95%] rounded"></div>
              </div>
            {/if}
          </div>
        {/if}

        {#if visibleProposals.length > 0}
          <div
            class="mt-3 pt-2 border-t border-theme-border/30"
            data-testid="found-lore-panel"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-theme-primary/20 bg-theme-primary/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-theme-primary/80 font-header transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
              onclick={() =>
                (controller.showDiscoveryChips =
                  !controller.showDiscoveryChips)}
              aria-expanded={controller.showDiscoveryChips}
              aria-controls={`found-lore-${message.id}`}
            >
              <span class="icon-[lucide--sparkles] w-3 h-3"></span>
              <span>Found lore</span>
              <span
                class="rounded-full bg-theme-primary/15 px-1.5 py-0.5 text-[8px] text-theme-primary"
                >{visibleProposals.length}</span
              >
              <span
                class={[
                  "icon-[lucide--chevron-down] w-3 h-3 transition-transform",
                  controller.showDiscoveryChips ? "rotate-180" : "",
                ]}
              ></span>
            </button>

            {#if controller.showDiscoveryChips}
              <div
                id={`found-lore-${message.id}`}
                class="mt-2 flex flex-wrap gap-2 items-center"
                transition:fade
              >
                {#each visibleProposals as proposal (`${proposal.entityId ?? "new"}:${proposal.title}`)}
                  <DiscoveryChip
                    {proposal}
                    onLink={(entityId) =>
                      oracle.updateMessageEntity(message.id, entityId)}
                  />
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Copy Icon (Rich Text) -->
        <div
          class="absolute bottom-1 right-2 opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <button
            onclick={() => controller.copyToClipboard(message)}
            class="p-1 rounded bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary transition-all flex items-center gap-1.5"
            title="Copy rich text to clipboard"
            aria-label="Copy rich text to clipboard"
            type="button"
          >
            {#if controller.isCopied}
              <span
                class="text-[9px] font-bold tracking-tighter uppercase font-header"
                >Copied!</span
              >
              <span
                aria-hidden="true"
                class="icon-[lucide--check] w-3 h-3 text-green-400"
              ></span>
            {:else}
              <span aria-hidden="true" class="icon-[lucide--copy] w-3 h-3"
              ></span>
            {/if}
          </button>
        </div>

        {#if showActions && !vault.isGuest && (message.hasDrawAction || ((targetEntity || activeEntity || showCreate) && message.content.length > 20))}
          {#if !controller.isSaved}
            <div
              class="mt-3 pt-3 border-t border-theme-border flex flex-wrap gap-2 justify-end"
              transition:fade
            >
              {#if controller.isSelectingEntity}
                <div class="w-full mb-2" transition:fade>
                  <Autocomplete
                    bind:selectedId={controller.selectedEntityId}
                    placeholder="Search for an entity..."
                    ariaLabel="Search for an entity"
                  />
                  <button
                    onclick={() => (controller.isSelectingEntity = false)}
                    class="mt-1 text-[9px] text-theme-muted hover:text-theme-primary font-bold uppercase tracking-widest font-header"
                  >
                    Cancel
                  </button>
                </div>
              {/if}

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
                  disabled={controller.activeAction !== null}
                  aria-busy={controller.activeAction === "create"}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black group relative disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if controller.activeAction === "create"}
                    <span
                      class="icon-[lucide--loader-2] w-3.5 h-3.5 shrink-0 animate-spin"
                      aria-hidden="true"
                    ></span>
                  {:else}
                    <span
                      class="icon-[lucide--plus-circle] w-3.5 h-3.5 shrink-0"
                    ></span>
                  {/if}
                  <span class="truncate font-header"
                    >{controller.activeAction === "create"
                      ? "CREATING..."
                      : `CREATE AS ${parsed.type?.toUpperCase() || "NEW NODE"}: ${parsed.title?.toUpperCase()}`}</span
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

              <div
                class="flex items-center rounded text-[10px] font-bold tracking-widest bg-theme-surface border border-theme-border text-theme-muted group/link relative"
              >
                <button
                  onclick={() =>
                    (controller.isSelectingEntity =
                      !controller.isSelectingEntity)}
                  class="flex items-center gap-1.5 px-2 py-1 transition-all hover:bg-theme-primary hover:text-black hover:border-theme-primary"
                  title={message.entityId
                    ? `Linked to ${vault.entities[message.entityId]?.title || "Entity"}`
                    : "Link this message to an entity"}
                  aria-label={message.entityId
                    ? `Linked to ${vault.entities[message.entityId]?.title || "Entity"}. Click to change.`
                    : "Link this message to an entity"}
                  type="button"
                >
                  <span
                    class={message.entityId
                      ? "icon-[lucide--link-2] w-3 h-3 text-theme-primary"
                      : "icon-[lucide--link] w-3 h-3 shrink-0"}
                    aria-hidden="true"
                  ></span>
                  <span class="font-header truncate max-w-[120px]">
                    {message.entityId
                      ? (
                          vault.entities[message.entityId]?.title || "LINKED"
                        ).toUpperCase()
                      : "LINK ENTITY"}
                  </span>
                </button>
                {#if message.entityId}
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      oracle.updateMessageEntity(message.id, null);
                    }}
                    class="pr-1.5 pl-0.5 py-1 hover:text-red-400 transition-colors"
                    title="Clear link"
                    aria-label="Clear entity link"
                    type="button"
                  >
                    <span
                      class="icon-[lucide--x] w-2.5 h-2.5"
                      aria-hidden="true"
                    ></span>
                  </button>
                {/if}
              </div>

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
                    disabled={controller.activeAction !== null}
                    aria-busy={controller.activeAction === "apply"}
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black max-w-[280px] group relative disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save to {(targetEntity || activeEntity!).title}"
                  >
                    {#if controller.activeAction === "apply"}
                      <span
                        class="icon-[lucide--loader-2] w-3 h-3 shrink-0 animate-spin"
                        aria-hidden="true"
                      ></span>
                    {:else}
                      <span class="icon-[lucide--wand-2] w-3 h-3 shrink-0"
                      ></span>
                    {/if}
                    <span class="truncate font-header"
                      >{controller.activeAction === "apply"
                        ? "APPLYING..."
                        : "SMART APPLY TO"}
                      {(
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
                    disabled={controller.activeAction !== null}
                    aria-busy={controller.activeAction === "chronicle"}
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black max-w-[250px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save to {(targetEntity || activeEntity!).title}"
                  >
                    {#if controller.activeAction === "chronicle"}
                      <span
                        class="icon-[lucide--loader-2] w-3 h-3 shrink-0 animate-spin"
                        aria-hidden="true"
                      ></span>
                    {:else}
                      <span class="icon-[lucide--copy-plus] w-3 h-3 shrink-0"
                      ></span>
                    {/if}
                    <span class="truncate font-header"
                      >{controller.activeAction === "chronicle"
                        ? "COPYING..."
                        : "COPY TO CHRONICLE"} ({(
                        targetEntity || activeEntity!
                      ).title.toUpperCase()})</span
                    >
                  </button>
                {:else}
                  <button
                    onclick={copyToLore}
                    disabled={controller.activeAction !== null}
                    aria-busy={controller.activeAction === "lore"}
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-accent/10 text-theme-accent border border-theme-accent/30 hover:bg-theme-accent hover:text-black max-w-[250px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save to {(targetEntity || activeEntity!).title}"
                  >
                    {#if controller.activeAction === "lore"}
                      <span
                        class="icon-[lucide--loader-2] w-3 h-3 shrink-0 animate-spin"
                        aria-hidden="true"
                      ></span>
                    {:else}
                      <span class="icon-[lucide--scroll-text] w-3 h-3 shrink-0"
                      ></span>
                    {/if}
                    <span class="truncate font-header"
                      >{controller.activeAction === "lore"
                        ? "COPYING..."
                        : "COPY TO LORE"} ({(
                        targetEntity || activeEntity!
                      ).title.toUpperCase()})</span
                    >
                  </button>
                {/if}
              {/if}
            </div>
          {:else}
            <!-- Saved/Proposed State -->
            <div
              class="mt-3 pt-2 border-t border-theme-border flex items-center justify-between"
              transition:fade
              role="status"
              aria-live="polite"
            >
              {#if revisionService.pendingDraft?.messageId === message.id}
                <span
                  class="text-[10px] text-theme-primary font-bold uppercase font-header tracking-wider flex items-center gap-1"
                >
                  <span class="icon-[lucide--sparkles] w-3 h-3"></span>
                  DRAFT PROPOSED
                </span>
              {:else}
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
