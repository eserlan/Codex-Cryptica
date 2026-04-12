<script lang="ts">
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import {
    createEntityDetailTabIds,
    getNextEntityDetailTabInList,
    entityDetailTabs,
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

  let tabIds = $derived.by(() => createEntityDetailTabIds(idPrefix).tabIds);
  let panelIds = $derived.by(() => createEntityDetailTabIds(idPrefix).panelIds);
  let visibleTabs = $derived.by(() =>
    vault.isGuest
      ? entityDetailTabs.filter((tab) => tab !== "lore")
      : entityDetailTabs,
  );
  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");

  const handleTabKeydown = (event: KeyboardEvent) => {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const nextTab = getNextEntityDetailTabInList(
      visibleTabs,
      activeTab,
      event.key,
    );
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
        {#each categories.list as cat (cat.id)}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>
    </div>
  {:else}
    <div
      class="text-xs font-bold tracking-widest uppercase font-header mb-4"
      style:color="var(--theme-meta-text)"
    >
      {entity.type}
    </div>
  {/if}

  <div
    role="tablist"
    aria-label="Entity detail sections"
    tabindex="0"
    class="flex flex-wrap md:flex-nowrap gap-x-4 md:gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2 font-header"
    style:border-color={isFantasyTheme
      ? "var(--theme-selected-border)"
      : undefined}
    onkeydown={handleTabKeydown}
  >
    <button
      id={tabIds.status}
      type="button"
      role="tab"
      aria-selected={activeTab === "status"}
      aria-controls={panelIds.status}
      tabindex={activeTab === "status" ? 0 : -1}
      data-testid="tab-status"
      class={activeTab === "status"
        ? isFantasyTheme
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--theme-focus)]"
          : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : isFantasyTheme
          ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
          : "hover:text-theme-text transition"}
      style:border-color={activeTab === "status" && isFantasyTheme
        ? "var(--theme-focus-border)"
        : undefined}
      style:background-color={activeTab === "status" && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      onclick={() => (activeTab = "status")}
      >{themeStore.jargon.tab_status.toUpperCase()}</button
    >
    {#if !vault.isGuest}
      <button
        id={tabIds.lore}
        type="button"
        role="tab"
        aria-selected={activeTab === "lore"}
        aria-controls={panelIds.lore}
        tabindex={activeTab === "lore" ? 0 : -1}
        data-testid="tab-lore"
        class={activeTab === "lore"
          ? isFantasyTheme
            ? "border px-3 py-1.5 rounded-sm text-[color:var(--theme-focus)]"
            : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
          : isFantasyTheme
            ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
            : "hover:text-theme-text transition"}
        style:border-color={activeTab === "lore" && isFantasyTheme
          ? "var(--theme-focus-border)"
          : undefined}
        style:background-color={activeTab === "lore" && isFantasyTheme
          ? "var(--theme-focus-bg)"
          : undefined}
        onclick={() => {
          activeTab = "lore";
        }}>{themeStore.jargon.tab_lore.toUpperCase()}</button
      >
    {/if}
    <button
      id={tabIds.inventory}
      type="button"
      role="tab"
      aria-selected={activeTab === "inventory"}
      aria-controls={panelIds.inventory}
      tabindex={activeTab === "inventory" ? 0 : -1}
      data-testid="tab-inventory"
      class={activeTab === "inventory"
        ? isFantasyTheme
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--theme-focus)]"
          : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : isFantasyTheme
          ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
          : "hover:text-theme-text transition"}
      style:border-color={activeTab === "inventory" && isFantasyTheme
        ? "var(--theme-focus-border)"
        : undefined}
      style:background-color={activeTab === "inventory" && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      onclick={() => (activeTab = "inventory")}
      >{themeStore.jargon.tab_inventory.toUpperCase()}</button
    >
    <button
      id={tabIds.map}
      type="button"
      role="tab"
      aria-selected={activeTab === "map"}
      aria-controls={panelIds.map}
      tabindex={activeTab === "map" ? 0 : -1}
      data-testid="tab-map"
      class={activeTab === "map"
        ? isFantasyTheme
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--theme-focus)]"
          : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : isFantasyTheme
          ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
          : "hover:text-theme-text transition"}
      style:border-color={activeTab === "map" && isFantasyTheme
        ? "var(--theme-focus-border)"
        : undefined}
      style:background-color={activeTab === "map" && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      onclick={() => (activeTab = "map")}>MAP</button
    >
  </div>
</div>
