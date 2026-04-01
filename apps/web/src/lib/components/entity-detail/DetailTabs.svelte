<script lang="ts">
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import {
    createEntityDetailTabIds,
    getNextEntityDetailTab,
    type EntityDetailTab,
  } from "./detail-tabs";

  let {
    entity,
    activeTab = $bindable(),
    isEditing,
    editType = $bindable(),
    idPrefix,
  } = $props<{
    entity: Entity;
    activeTab: EntityDetailTab;
    isEditing: boolean;
    editType: string;
    idPrefix: string;
  }>();

  const { tabIds, panelIds } = createEntityDetailTabIds(idPrefix);

  const handleTabKeydown = (event: KeyboardEvent) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const nextTab = getNextEntityDetailTab(activeTab, event.key);
    activeTab = nextTab;
    document.getElementById(tabIds[nextTab])?.focus();
  };
</script>

<div class="px-4 md:p-6">
  {#if isEditing}
    <div class="mb-4">
      <label
        class="block text-[10px] text-theme-secondary font-bold mb-1"
        for="entity-type">CATEGORY</label
      >
      <select
        id="entity-type"
        bind:value={editType}
        class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary w-full rounded"
      >
        {#each categories.list as cat}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>
    </div>
  {:else}
    <div
      class="text-xs font-bold tracking-widest text-theme-secondary uppercase font-header mb-4"
    >
      {entity.type}
    </div>
  {/if}

  <div
    role="tablist"
    aria-label="Entity detail sections"
    class="flex flex-wrap md:flex-nowrap gap-x-4 md:gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2 font-header"
    onkeydown={handleTabKeydown}
  >
    <button
      id={tabIds.status}
      type="button"
      data-testid="tab-status"
      role="tab"
      aria-selected={activeTab === "status"}
      aria-controls={panelIds.status}
      tabindex={activeTab === "status" ? 0 : -1}
      class={activeTab === "status"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "status")}
      >{themeStore.jargon.tab_status.toUpperCase()}</button
    >
    <button
      id={tabIds.lore}
      type="button"
      data-testid="tab-lore"
      role="tab"
      aria-selected={activeTab === "lore"}
      aria-controls={panelIds.lore}
      tabindex={activeTab === "lore" ? 0 : -1}
      class={activeTab === "lore"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => {
        activeTab = "lore";
      }}>{themeStore.jargon.tab_lore.toUpperCase()}</button
    >
    <button
      id={tabIds.inventory}
      type="button"
      data-testid="tab-inventory"
      role="tab"
      aria-selected={activeTab === "inventory"}
      aria-controls={panelIds.inventory}
      tabindex={activeTab === "inventory" ? 0 : -1}
      class={activeTab === "inventory"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "inventory")}
      >{themeStore.jargon.tab_inventory.toUpperCase()}</button
    >
    <button
      id={tabIds.map}
      type="button"
      data-testid="tab-map"
      role="tab"
      aria-selected={activeTab === "map"}
      aria-controls={panelIds.map}
      tabindex={activeTab === "map" ? 0 : -1}
      class={activeTab === "map"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "map")}>MAP</button
    >
  </div>
</div>
