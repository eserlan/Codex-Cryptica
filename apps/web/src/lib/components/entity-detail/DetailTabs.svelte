<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";

  let {
    activeTab = $bindable(),
    isEditing,
    editType = $bindable(),
  } = $props<{
    activeTab: "status" | "lore" | "inventory";
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
        {#each categories.list as cat}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div
    class="flex gap-6 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2"
  >
    <button
      class={activeTab === "status"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "status")}>STATUS</button
    >
    <button
      class={activeTab === "lore"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => {
        activeTab = "lore";
      }}>LORE & NOTES</button
    >
    <button
      class={activeTab === "inventory"
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = "inventory")}>INVENTORY</button
    >
  </div>
</div>
