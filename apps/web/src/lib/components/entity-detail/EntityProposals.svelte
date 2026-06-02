<script lang="ts">
  import { entityProposalService } from "$lib/services/entity-proposal.service";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";

  let { content, isEditing = false } = $props<{
    content: string;
    isEditing?: boolean;
  }>();

  // The Set of existing entity titles
  const existingTitles = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace Object.values().map() with an imperative loop
    const titles = new Set<string>();
    const entities = vault.entities || {};
    for (const key in entities) {
      if (Object.prototype.hasOwnProperty.call(entities, key)) {
        titles.add(entities[key].title);
      }
    }
    return titles;
  });

  // The list of proposed entity titles
  const proposals = $derived(
    entityProposalService.extractProposals(content, existingTitles),
  );

  // Pending creations state
  let isCreating = $state<Record<string, boolean>>({});

  async function handleCreate(title: string) {
    if (isCreating[title]) return;
    isCreating[title] = true;
    try {
      const { entity, categoryInferred } =
        await entityProposalService.acceptProposal(
          title,
          content,
          oracle.apiKey,
        );

      if (!categoryInferred && oracle.apiKey) {
        notificationStore.notify(
          `Created "${entity.title}" (AI categorization failed)`,
          "info",
        );
      } else {
        notificationStore.notify(`Created "${entity.title}"`, "success");
      }
    } catch (e: any) {
      console.error(e);
      notificationStore.notify(
        `Failed to create "${title}": ${e.message}`,
        "error",
      );
    } finally {
      isCreating[title] = false;
    }
  }
</script>

{#if !isEditing && !vault.isGuest && proposals.length > 0}
  <div
    class="mt-8 border-t border-theme-border pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
  >
    <div class="flex items-center justify-between mb-4">
      <h3
        class="text-theme-secondary font-body italic text-lg flex items-center gap-2"
      >
        <span class="icon-[lucide--file-plus-2] w-4 h-4 text-theme-primary"
        ></span>
        <span>Proposed Entities</span>
      </h3>
      <span
        class="text-xs text-theme-muted bg-theme-bg/50 px-2 py-1 rounded-full border border-theme-border"
      >
        {proposals.length} New
      </span>
    </div>

    <div class="space-y-4">
      {#each proposals as title}
        <div
          class="bg-theme-bg/30 border border-theme-border/50 rounded-lg p-3 flex justify-between items-center hover:border-theme-primary/30 transition-colors group"
        >
          <span class="text-theme-text font-bold text-sm">{title}</span>
          <button
            type="button"
            class="px-3 py-1 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary rounded text-xs transition-colors disabled:opacity-50"
            disabled={isCreating[title]}
            onclick={() => handleCreate(title)}
            title="Create Entity"
            aria-label="Create proposed entity {title}"
          >
            {#if isCreating[title]}
              <span class="icon-[lucide--loader-2] w-3 h-3 animate-spin"></span>
            {:else}
              Create
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}
