<script lang="ts">
  import type { Entity } from "schema";
  import { fade } from "svelte/transition";
  import { vault } from "$lib/stores/vault.svelte";

  // Sub-components
  import DetailHeader from "./entity-detail/DetailHeader.svelte";
  import DetailImage from "./entity-detail/DetailImage.svelte";
  import DetailTabs from "./entity-detail/DetailTabs.svelte";
  import DetailStatusTab from "./entity-detail/DetailStatusTab.svelte";
  import DetailLoreTab from "./entity-detail/DetailLoreTab.svelte";
  import DetailFooter from "./entity-detail/DetailFooter.svelte";

  let { entity, onClose } = $props<{
    entity: Entity | null;
    onClose: () => void;
  }>();

  let isEditing = $state(false);
  let previousEntityId = $state<string | undefined>(undefined);

  $effect(() => {
    if (entity?.id !== previousEntityId) {
      isEditing = false;
      previousEntityId = entity?.id;
    }
  });

  // Edit State
  let editTitle = $state("");
  let editContent = $state("");
  let editLore = $state("");
  let editType = $state("");
  let editImage = $state("");
  let editDate = $state<Entity["date"]>();
  let editStartDate = $state<Entity["start_date"]>();
  let editEndDate = $state<Entity["end_date"]>();

  let activeTab = $state<"status" | "lore" | "inventory">("status");

  const startEditing = () => {
    if (!entity) return;
    editTitle = entity.title;
    editContent = entity.content || "";
    editLore = entity.lore || "";
    editType = entity.type;
    editImage = entity.image || "";
    editDate = entity.date;
    editStartDate = entity.start_date;
    editEndDate = entity.end_date;
    isEditing = true;
  };

  const cancelEditing = () => {
    isEditing = false;
  };

  const saveChanges = async () => {
    if (!entity) return;
    try {
      await vault.updateEntity(entity.id, {
        title: editTitle,
        content: editContent,
        lore: editLore,
        image: editImage,
        date: editDate,
        start_date: editStartDate,
        end_date: editEndDate,
        type: editType,
      });
      isEditing = false;
    } catch (err) {
      console.error("Failed to save changes", err);
    }
  };

  const handleDelete = async () => {
    if (!entity) return;
    if (
      confirm(
        `Are you sure you want to permanently delete "${entity.title}"? This cannot be undone.`,
      )
    ) {
      try {
        await vault.deleteEntity(entity.id);
        onClose();
      } catch (err: any) {
        console.error("Failed to delete entity", err);
        alert(`Error: ${err.message}`);
      }
    }
  };
</script>

{#if entity}
  <aside
    transition:fade={{ duration: 200 }}
    class="pointer-events-auto flex h-full w-full md:w-[400px] lg:w-[450px] flex-col overflow-hidden border-l border-theme-border bg-theme-surface shadow-2xl transition-all duration-300 font-mono max-md:absolute max-md:right-0 max-md:bottom-0 max-md:h-[calc(100%-60px)] relative z-50"
    style:background-image="var(--bg-theme-surface)"
    style:background-size="cover"
    ontouchmove={(e) => e.stopPropagation()}
    onwheel={(e) => e.stopPropagation()}
    data-testid="entity-detail-panel"
  >
    <DetailHeader {entity} {isEditing} bind:editTitle {onClose} />

    <div
      class="flex-1 overflow-y-auto custom-scrollbar bg-theme-bg flex flex-col"
      style:background-image="var(--bg-texture-overlay)"
    >
      <div
        style="background-image: var(--bg-texture-overlay)"
        class="bg-theme-surface"
      >
        <DetailImage {entity} {isEditing} bind:editImage />

        <DetailTabs {entity} bind:activeTab {isEditing} bind:editType />
      </div>

      <div class="p-4 md:p-6 flex-1">
        {#if activeTab === "status"}
          <DetailStatusTab
            {entity}
            {isEditing}
            {editType}
            bind:editContent
            bind:editStartDate
            bind:editEndDate
          />
        {:else if activeTab === "lore"}
          <DetailLoreTab {entity} {isEditing} bind:editLore />
        {:else if activeTab === "inventory"}
          <div class="text-theme-muted italic text-sm">
            Inventory coming soon...
          </div>
        {/if}
      </div>
    </div>

    <DetailFooter
      {isEditing}
      onCancel={cancelEditing}
      onSave={saveChanges}
      onDelete={handleDelete}
      onStartEdit={startEditing}
    />
  </aside>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #15803d;
    border-radius: 2px;
  }
</style>
