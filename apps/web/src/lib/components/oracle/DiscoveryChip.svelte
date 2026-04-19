<script lang="ts">
  import type { DiscoveryProposal } from "@codex/oracle-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$stores/ui.svelte";

  interface Props {
    proposal: DiscoveryProposal;
    onCommit?: () => void;
  }

  let { proposal, onCommit }: Props = $props();
  let isCommitting = $state(false);

  async function handleCommit() {
    if (isCommitting) return;
    isCommitting = true;
    try {
      if (proposal.entityId) {
        // Smart Update
        const existing = vault.entities[proposal.entityId];
        if (existing) {
          await vault.updateEntity(proposal.entityId, {
            lore: (existing.lore || "") + "\n\n" + proposal.draft.lore,
          });
          uiStore.notify(`Updated ${proposal.title}`, "success");
        }
      } else {
        // New Entity
        await vault.createEntity(proposal.type as any, proposal.title, {
          lore: proposal.draft.lore,
          content: proposal.draft.chronicle,
        });
        uiStore.notify(`Created ${proposal.title}`, "success");
      }
      onCommit?.();
    } finally {
      isCommitting = false;
    }
  }

  const typeIcon = $derived(
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
</script>

<div
  class="flex items-center gap-1.5 p-1 pl-2 pr-2 text-[10px] rounded-full border border-theme-primary/20 bg-theme-primary/5 hover:bg-theme-primary/10 transition-colors font-body"
>
  <span class="{typeIcon} w-3 h-3 text-theme-primary/60"></span>
  <span class="font-bold uppercase tracking-wider text-theme-text/90"
    >{proposal.title}</span
  >
  <span class="text-[8px] uppercase opacity-40 font-mono ml-1"
    >{proposal.type}</span
  >

  <button
    class="ml-2 p-1 hover:bg-theme-primary/20 rounded-full text-theme-primary transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
    onclick={handleCommit}
    disabled={isCommitting}
    aria-busy={isCommitting}
    title={proposal.entityId ? "Update existing record" : "Add to Vault"}
    aria-label={proposal.entityId
      ? `Update ${proposal.title}`
      : `Create ${proposal.title}`}
  >
    {#if proposal.entityId}
      <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
    {:else}
      <span class="icon-[lucide--plus] w-3 h-3"></span>
    {/if}
  </button>
</div>
