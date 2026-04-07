<script lang="ts">
  import type { Entity } from "schema";
  import { fade } from "svelte/transition";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  // Sub-components
  import DetailHeader from "./entity-detail/DetailHeader.svelte";
  import DetailImage from "./entity-detail/DetailImage.svelte";
  import DetailTabs from "./entity-detail/DetailTabs.svelte";
  import DetailStatusTab from "./entity-detail/DetailStatusTab.svelte";
  import DetailLoreTab from "./entity-detail/DetailLoreTab.svelte";
  import DetailMapTab from "./entity-detail/DetailMapTab.svelte";
  import DetailFooter from "./entity-detail/DetailFooter.svelte";
  import {
    createEntityDetailTabIds,
    type EntityDetailTab,
  } from "./entity-detail/detail-tabs";

  let { entity: _entity, onClose } = $props<{
    entity: Entity | null;
    onClose: () => void;
  }>();

  const tabInstanceId = $props.id();

  // We re-derive the entity from the vault store directly to ensure
  // we pick up reactive updates to its content/lore fields after
  // lazy loading from Dexie.
  let entity = $derived(_entity?.id ? vault.entities[_entity.id] : null);

  // Lazy-load content when sidebar opens or navigates
  $effect(() => {
    if (entity?.id) {
      vault.loadEntityContent(entity.id);
    }
  });

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

  let activeTab = $state<EntityDetailTab>("status");
  let isSaving = $state(false);
  const { tabIds, panelIds } = createEntityDetailTabIds(tabInstanceId);

  $effect(() => {
    if (vault.isGuest && activeTab === "lore") {
      activeTab = "status";
    }
  });

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
    isSaving = true;
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
      uiStore.notify(
        "Failed to save changes. Your latest edits were not saved.",
        "info",
      );
    } finally {
      isSaving = false;
    }
  };

  const handleDelete = async () => {
    if (!entity) return;
    const confirmed = await uiStore.confirm({
      title: "Delete Entity",
      message: `Are you sure you want to permanently delete "${entity.title}"? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      cancelLabel: "Keep entity",
      isDangerous: true,
    });

    if (confirmed) {
      try {
        await vault.deleteEntity(entity.id);
        onClose();
      } catch (err: any) {
        console.error("Failed to delete entity", err);
        uiStore.notify(`Error: ${err.message}`, "error");
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
      {#if uiStore.isDemoMode}
        <div
          class="bg-theme-primary/10 border-b border-theme-primary/30 px-4 py-1.5 text-[9px] font-bold text-theme-primary tracking-widest text-center animate-pulse"
        >
          TRANSIENT MODE: CHANGES WILL NOT BE SAVED
        </div>
      {/if}
      <div
        style:background-image="var(--bg-texture-overlay)"
        class="bg-theme-surface"
      >
        <DetailImage {entity} {isEditing} bind:editImage />

        <DetailTabs
          {entity}
          bind:activeTab
          {isEditing}
          bind:editType
          idPrefix={tabInstanceId}
        />
      </div>

      <div class="p-4 md:p-6 flex-1">
        <div
          role="tabpanel"
          id={panelIds.status}
          aria-labelledby={tabIds.status}
          hidden={activeTab !== "status"}
        >
          {#if activeTab === "status"}
            <DetailStatusTab
              {entity}
              {isEditing}
              {editType}
              bind:editContent
              bind:editStartDate
              bind:editEndDate
              bind:editLore
            />
          {/if}
        </div>
        <div
          role="tabpanel"
          id={panelIds.lore}
          aria-labelledby={tabIds.lore}
          hidden={activeTab !== "lore" || vault.isGuest}
        >
          {#if activeTab === "lore" && !vault.isGuest}
            <DetailLoreTab {entity} {isEditing} bind:editLore />
          {/if}
        </div>
        <div
          role="tabpanel"
          id={panelIds.inventory}
          aria-labelledby={tabIds.inventory}
          hidden={activeTab !== "inventory"}
        >
          {#if activeTab === "inventory"}
            <div class="text-theme-muted italic text-sm">
              Inventory coming soon...
            </div>
          {/if}
        </div>
        <div
          role="tabpanel"
          id={panelIds.map}
          aria-labelledby={tabIds.map}
          hidden={activeTab !== "map"}
        >
          {#if activeTab === "map"}
            <DetailMapTab {entity} />
          {/if}
        </div>
      </div>
    </div>

    <DetailFooter
      {isEditing}
      {isSaving}
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
