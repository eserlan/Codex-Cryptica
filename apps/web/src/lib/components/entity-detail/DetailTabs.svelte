<script lang="ts">
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { calendarEngine } from "chronology-engine";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import {
    createEntityDetailTabIds,
    getNextEntityDetailTabInList,
    entityDetailTabs,
    type EntityDetailTab,
    getTemporalLabel,
  } from "./detail-tabs";

  let {
    entity,
    activeTab = $bindable(),
    isEditing,
    editType = $bindable(),
    idPrefix,
    canGuestEdit = false,
    onDateClick,
  } = $props<{
    entity: Entity;
    activeTab: EntityDetailTab;
    isEditing: boolean;
    editType: string;
    idPrefix: string;
    canGuestEdit?: boolean;
    onDateClick?: (year: number, month: number) => void;
  }>();

  function getNavigableDate(): { year: number; month: number } | null {
    const d = entity.start_date ?? entity.date ?? entity.end_date;
    if (!d || d.year === undefined) return null;
    if ("precision" in d && d.unitId) {
      const months = calendarEngine.getMonths(calendarStore.config);
      const idx = months.findIndex((m) => m.id === d.unitId);
      return { year: d.year, month: idx >= 0 ? idx + 1 : 1 };
    }
    const month =
      "month" in d && (d as { month?: number }).month !== undefined
        ? (d as { month?: number }).month!
        : 1;
    return { year: d.year, month };
  }

  let tabIds = $derived.by(() => createEntityDetailTabIds(idPrefix).tabIds);
  let panelIds = $derived.by(() => createEntityDetailTabIds(idPrefix).panelIds);
  let visibleTabs = $derived.by(() => {
    let tabs: EntityDetailTab[] =
      vault.isGuest && !canGuestEdit
        ? entityDetailTabs.filter((tab) => tab !== "lore")
        : [...entityDetailTabs];
    if (entity.type !== "character") {
      tabs = tabs.filter((tab) => tab !== "chats");
    }
    return tabs;
  });
  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");

  const formatDate = (date: Entity["date"]) => {
    if (!date || date.year === undefined) return "";
    try {
      return calendarEngine.format(date as any, calendarStore.config);
    } catch {
      if (date.label) return date.label;
      let str = `${date.year}`;
      const month = "month" in date ? (date as any).month : undefined;
      if (month !== undefined) str += `/${month}`;
      if (date.day !== undefined) str += `/${date.day}`;
      return str;
    }
  };

  const dateText = $derived.by(() => {
    if (!entity) return "";
    if (entity.date?.year !== undefined) {
      return formatDate(entity.date);
    }
    const parts: string[] = [];
    if (entity.start_date?.year !== undefined) {
      parts.push(
        `${getTemporalLabel(entity.type, "start")}: ${formatDate(entity.start_date)}`,
      );
    }
    if (entity.end_date?.year !== undefined) {
      parts.push(
        `${getTemporalLabel(entity.type, "end")}: ${formatDate(entity.end_date)}`,
      );
    }
    return parts.join(" – ");
  });

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

<div class="px-4 pt-2 pb-0 md:px-6 md:pt-4 md:pb-0">
  {#if isEditing}
    <div class="mb-2">
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
      class="text-[10px] font-bold tracking-widest uppercase font-header mb-2"
      style:color="var(--theme-meta-text)"
    >
      {entity.type}{#if dateText}
        {@const _nav = onDateClick ? getNavigableDate() : null}
        {#if _nav}
          <button
            type="button"
            class="font-mono font-normal normal-case ml-2 hover:text-theme-primary transition-colors cursor-pointer"
            title="Go to this date in the calendar"
            onclick={() => onDateClick!(_nav.year, _nav.month)}
            >({dateText}
            <span
              class="icon-[lucide--calendar-search] inline-block h-3 w-3 align-middle opacity-60"
            ></span>)</button
          >
        {:else}
          <span class="font-mono font-normal normal-case ml-2"
            >({dateText})</span
          >
        {/if}
      {/if}
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
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--color-accent-primary)]"
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
    {#if !vault.isGuest || canGuestEdit}
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
            ? "border px-3 py-1.5 rounded-sm text-[color:var(--color-accent-primary)]"
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
      id={tabIds.map}
      type="button"
      role="tab"
      aria-selected={activeTab === "map"}
      aria-controls={panelIds.map}
      tabindex={activeTab === "map" ? 0 : -1}
      data-testid="tab-map"
      class={activeTab === "map"
        ? isFantasyTheme
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--color-accent-primary)]"
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

    {#if visibleTabs.includes("chats")}
      <button
        id={tabIds.chats}
        type="button"
        role="tab"
        aria-selected={activeTab === "chats"}
        aria-controls={panelIds.chats}
        tabindex={activeTab === "chats" ? 0 : -1}
        data-testid="tab-chats"
        class={activeTab === "chats"
          ? isFantasyTheme
            ? "border px-3 py-1.5 rounded-sm text-[color:var(--color-accent-primary)]"
            : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
          : isFantasyTheme
            ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
            : "hover:text-theme-text transition"}
        style:border-color={activeTab === "chats" && isFantasyTheme
          ? "var(--theme-focus-border)"
          : undefined}
        style:background-color={activeTab === "chats" && isFantasyTheme
          ? "var(--theme-focus-bg)"
          : undefined}
        onclick={() => (activeTab = "chats")}>CHATS</button
      >
    {/if}

    <button
      id={tabIds.timeline}
      type="button"
      role="tab"
      aria-selected={activeTab === "timeline"}
      aria-controls={panelIds.timeline}
      tabindex={activeTab === "timeline" ? 0 : -1}
      data-testid="tab-timeline"
      class={activeTab === "timeline"
        ? isFantasyTheme
          ? "border px-3 py-1.5 rounded-sm text-[color:var(--color-accent-primary)]"
          : "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : isFantasyTheme
          ? "transition text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-title-ink)]"
          : "hover:text-theme-text transition"}
      style:border-color={activeTab === "timeline" && isFantasyTheme
        ? "var(--theme-focus-border)"
        : undefined}
      style:background-color={activeTab === "timeline" && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      onclick={() => (activeTab = "timeline")}>TIMELINE</button
    >
  </div>
</div>
