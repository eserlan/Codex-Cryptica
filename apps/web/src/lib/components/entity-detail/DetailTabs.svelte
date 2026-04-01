<script lang="ts">
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
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
        {#each categories.list as cat (cat.id)}
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
    class="flex flex-wrap md:flex-nowrap gap-x-4 md:gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2 font-header"
  >
    <button
      data-testid="tab-status"
      class={activeTab === "status"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "status")}
      >{themeStore.jargon.tab_status.toUpperCase()}</button
    >
    {#if !vault.isGuest}
      <button
        data-testid="tab-lore"
        class={activeTab === "lore"
          ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
          : "hover:text-theme-text transition"}
        onclick={() => {
          activeTab = "lore";
        }}>{themeStore.jargon.tab_lore.toUpperCase()}</button
      >
    {/if}
    <button
      data-testid="tab-inventory"
      class={activeTab === "inventory"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "inventory")}
      >{themeStore.jargon.tab_inventory.toUpperCase()}</button
    >
    <button
      data-testid="tab-map"
      class={activeTab === "map"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "map")}>MAP</button
    >
  </div>
</div>
