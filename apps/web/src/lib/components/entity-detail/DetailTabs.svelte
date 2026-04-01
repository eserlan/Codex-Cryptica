<script lang="ts">
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";

  let {
    entity,
    activeTab = $bindable(),
    isEditing,
    editType = $bindable(),
  } = $props<{
    entity: Entity;
    activeTab: "status" | "lore" | "inventory" | "map";
    isEditing: boolean;
    editType: string;
  }>();

  let tabStatus = $state<HTMLButtonElement>();
  let tabLore = $state<HTMLButtonElement>();
  let tabInventory = $state<HTMLButtonElement>();
  let tabMap = $state<HTMLButtonElement>();

  const handleTabKeydown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const tabs: ("status" | "lore" | "inventory" | "map")[] = [
        "status",
        "lore",
        "inventory",
        "map",
      ];
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex =
        e.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;

      activeTab = tabs[nextIndex];

      // Wait for Svelte reactivity before focus
      setTimeout(() => {
        if (activeTab === "status") tabStatus?.focus();
        else if (activeTab === "lore") tabLore?.focus();
        else if (activeTab === "inventory") tabInventory?.focus();
        else if (activeTab === "map") tabMap?.focus();
      }, 0);
    }
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
    aria-label="Entity Sections"
    class="flex flex-wrap md:flex-nowrap gap-x-4 md:gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2 font-header"
  >
    <button
      bind:this={tabStatus}
      role="tab"
      id="tab-status"
      aria-selected={activeTab === "status"}
      aria-controls="panel-status"
      tabindex={activeTab === "status" ? 0 : -1}
      data-testid="tab-status"
      class={activeTab === "status"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "status")}
      onkeydown={handleTabKeydown}
      >{themeStore.jargon.tab_status.toUpperCase()}</button
    >
    <button
      bind:this={tabLore}
      role="tab"
      id="tab-lore"
      aria-selected={activeTab === "lore"}
      aria-controls="panel-lore"
      tabindex={activeTab === "lore" ? 0 : -1}
      data-testid="tab-lore"
      class={activeTab === "lore"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => {
        activeTab = "lore";
      }}
      onkeydown={handleTabKeydown}
      >{themeStore.jargon.tab_lore.toUpperCase()}</button
    >
    <button
      bind:this={tabInventory}
      role="tab"
      id="tab-inventory"
      aria-selected={activeTab === "inventory"}
      aria-controls="panel-inventory"
      tabindex={activeTab === "inventory" ? 0 : -1}
      data-testid="tab-inventory"
      class={activeTab === "inventory"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "inventory")}
      onkeydown={handleTabKeydown}
      >{themeStore.jargon.tab_inventory.toUpperCase()}</button
    >
    <button
      bind:this={tabMap}
      role="tab"
      id="tab-map"
      aria-selected={activeTab === "map"}
      aria-controls="panel-map"
      tabindex={activeTab === "map" ? 0 : -1}
      data-testid="tab-map"
      class={activeTab === "map"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "map")}
      onkeydown={handleTabKeydown}
      >MAP</button
    >
  </div>
</div>
