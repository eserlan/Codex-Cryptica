<script lang="ts">
  import type { DiscoveryProposal } from "@codex/oracle-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    dispatchSearchEntityFocus,
  } from "$lib/components/search/search-focus";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

  interface Props {
    proposal: DiscoveryProposal;
    onCommit?: () => void;
    onLink?: (entityId: string) => void;
  }

  let { proposal, onCommit, onLink }: Props = $props();
  let isCommitting = $state(false);

  let isGuest = $derived(vault.isGuest || sessionModeStore.isDemoMode);

  async function handleCommit() {
    if (isCommitting || isGuest) return;
    isCommitting = true;
    try {
      if (proposal.entityId) {
        const existing = vault.entities[proposal.entityId];
        if (existing) {
          const revised = await oracle.reviseDiscoveryProposal(proposal);
          await vault.updateEntity(proposal.entityId, {
            content: revised.content,
            lore: revised.lore,
          });
          const connectionCount =
            await oracle.handleDiscoveryConnectionsForEntity(proposal.entityId);
          notificationStore.notify(
            buildCommitNotice("Updated", proposal.title, connectionCount),
            "success",
          );
        }
      } else {
        // New Entity — revise draft through AI to structure chronicle/lore properly
        const revised = await oracle.reviseNewEntityDraft(
          proposal.title,
          proposal.type,
          proposal.draft,
        );
        const entityId = await vault.createEntity(
          (revised.categoryId || proposal.type) as any,
          proposal.title,
          {
            content: revised.content,
            lore: revised.lore,
          },
        );
        const connectionCount =
          await oracle.handleDiscoveryConnectionsForEntity(entityId);
        notificationStore.notify(
          buildCommitNotice("Created", proposal.title, connectionCount),
          "success",
        );
      }
      onCommit?.();
    } finally {
      isCommitting = false;
    }
  }

  function handleOpenEntity() {
    if (!proposal.entityId) return;

    dispatchSearchEntityFocus(proposal.entityId, DEFAULT_SEARCH_ENTITY_ZOOM);
    vault.selectedEntityId = proposal.entityId;
  }

  function buildCommitNotice(
    action: "Created" | "Updated",
    title: string,
    _connectionCount: number | void,
  ) {
    if (discoveryPolicyStore.connectionDiscoveryMode === "off") {
      return `${action} ${title}`;
    }

    return `${action} ${title}; connection suggestions queued`;
  }

  let typeIcon = $derived(
    {
      npc: "icon-[lucide--user]",
      character: "icon-[lucide--user]",
      location: "icon-[lucide--map-pin]",
      item: "icon-[lucide--package]",
      faction: "icon-[lucide--users]",
      event: "icon-[lucide--calendar]",
      concept: "icon-[lucide--lightbulb]",
    }[proposal.type] || "icon-[lucide--file-text]",
  );

  let chipBodyClass = $derived(
    `min-w-0 flex flex-1 items-center gap-1.5 text-left rounded-full px-0.5 py-0.5 transition-colors ${
      proposal.entityId
        ? "hover:bg-theme-primary/10 cursor-pointer"
        : "cursor-default"
    }`,
  );

  let openEntityLabel = $derived(
    proposal.entityId
      ? `Open ${proposal.title} in the entity sidebar`
      : `${proposal.title} is not yet linked to an existing record`,
  );

  let openEntityTitle = $derived(
    proposal.entityId
      ? "Open entity and focus it in the graph"
      : "Create this record first to open it",
  );

  let commitTitle = $derived(
    isGuest
      ? "Not available in guest or demo mode"
      : proposal.entityId
        ? "Update existing record"
        : "Add to Vault",
  );

  let commitLabel = $derived(
    isGuest
      ? "Commit unavailable in guest mode"
      : proposal.entityId
        ? `Update ${proposal.title}`
        : `Create ${proposal.title}`,
  );
</script>

<div
  class="flex items-center gap-1.5 p-1 pl-2 pr-2 text-[10px] rounded-full border border-theme-primary/20 bg-theme-primary/5 transition-colors font-body"
>
  <button
    class={chipBodyClass}
    type="button"
    onclick={handleOpenEntity}
    disabled={!proposal.entityId}
    aria-label={openEntityLabel}
    title={openEntityTitle}
  >
    <span class={[typeIcon, "w-3 h-3 text-theme-primary/60"]}></span>
    <span class="truncate font-bold uppercase tracking-wider text-theme-text/90"
      >{proposal.title}</span
    >
    <span class="shrink-0 text-[8px] uppercase opacity-40 font-mono ml-1"
      >{proposal.type}</span
    >
  </button>

  {#if !isGuest}
    <button
      type="button"
      class="ml-2 p-1 hover:bg-theme-primary/20 rounded-full text-theme-primary transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      onclick={handleCommit}
      disabled={isCommitting}
      aria-busy={isCommitting}
      title={commitTitle}
      aria-label={commitLabel}
    >
      {#if isCommitting}
        <span
          aria-hidden="true"
          class="icon-[lucide--loader-2] w-3 h-3 animate-spin"
        ></span>
      {:else if proposal.entityId}
        <span aria-hidden="true" class="icon-[lucide--refresh-cw] w-3 h-3"
        ></span>
      {:else}
        <span aria-hidden="true" class="icon-[lucide--plus] w-3 h-3"></span>
      {/if}
    </button>

    {#if proposal.entityId && onLink}
      <button
        class="ml-1 p-1 hover:bg-theme-primary/20 rounded-full text-theme-primary transition-colors cursor-pointer flex items-center justify-center border-l border-theme-primary/10 pl-2"
        onclick={() => onLink(proposal.entityId!)}
        title="Link message to this entity"
        aria-label={`Link message to ${proposal.title}`}
      >
        <span class="icon-[lucide--link] w-3 h-3"></span>
      </button>
    {/if}
  {/if}
</div>
