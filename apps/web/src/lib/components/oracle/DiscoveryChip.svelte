<script lang="ts">
  import type { DiscoveryProposal } from "@codex/oracle-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$stores/ui.svelte";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    dispatchSearchEntityFocus,
  } from "$lib/components/search/search-focus";

  interface Props {
    proposal: DiscoveryProposal;
    onCommit?: () => void;
  }

  let { proposal, onCommit }: Props = $props();
  let isCommitting = $state(false);

  let isGuest = $derived(vault.isGuest || uiStore.isDemoMode);

  async function handleCommit() {
    if (isCommitting || isGuest) return;
    isCommitting = true;
    try {
      if (proposal.entityId) {
        const existing = vault.entities[proposal.entityId];
        if (existing) {
          const reconciled = await oracle.reconcileDiscoveryProposal(proposal);
          await vault.updateEntity(proposal.entityId, {
            content: reconciled.content,
            lore: reconciled.lore,
          });
          await oracle.proposeConnectionsForEntity(proposal.entityId);
          uiStore.notify(`Updated ${proposal.title}`, "success");
        }
      } else {
        // New Entity
        const entityId = await vault.createEntity(
          proposal.type as any,
          proposal.title,
          {
            lore: proposal.draft.lore,
            content: proposal.draft.chronicle,
          },
        );
        await oracle.proposeConnectionsForEntity(entityId);
        uiStore.notify(`Created ${proposal.title}`, "success");
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

  <button
    class="ml-2 p-1 hover:bg-theme-primary/20 rounded-full text-theme-primary transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
    onclick={handleCommit}
    disabled={isCommitting || isGuest}
    aria-busy={isCommitting}
    title={commitTitle}
    aria-label={commitLabel}
  >
    {#if isCommitting}
      <span class="icon-[lucide--loader-2] w-3 h-3 animate-spin"></span>
    {:else if proposal.entityId}
      <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
    {:else}
      <span class="icon-[lucide--plus] w-3 h-3"></span>
    {/if}
  </button>
</div>
