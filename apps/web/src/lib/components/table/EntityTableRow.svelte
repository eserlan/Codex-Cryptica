<script lang="ts">
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import type { Entity } from "schema";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { entitySnippet } from "./entityTableSnippet";
  import {
    getEntityCreatedAt,
    getEntityLabels,
    getEntityModifiedAt,
    type ConnectionSummary,
  } from "./entityTableSort";

  let {
    entity,
    vaultId,
    selected = false,
    onToggleSelect,
    connectionSummary,
    onFilterType,
    onFilterLabel,
  }: {
    entity: Entity;
    vaultId: string;
    selected?: boolean;
    onToggleSelect?: (id: string) => void;
    connectionSummary: ConnectionSummary;
    onFilterType?: (type: string) => void;
    onFilterLabel?: (label: string) => void;
  } = $props();

  const cat = $derived(categories.getCategory(entity.type));
  // In guest mode the entity popout route can't resolve the snapshot, so the
  // title link falls back to the guest page (clicks are intercepted anyway).
  const href = $derived(
    sessionModeStore.isGuestMode
      ? `${base}/guest/${vaultId}`
      : `${base}/vault/${vaultId}/entity/${entity.id}`,
  );
  const snippet = $derived(entitySnippet(entity));
  const chips = $derived(getEntityLabels(entity).slice(0, 3));
  const extraChips = $derived(
    Math.max(0, getEntityLabels(entity).length - chips.length),
  );
  const createdAt = $derived(getEntityCreatedAt(entity));
  const modifiedAt = $derived(getEntityModifiedAt(entity));

  function formatDate(ts: number | undefined): string {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Guest snapshots have no vault entity route; open the zen detail view
  // in place instead (same view the host route ends up in).
  function openEntity() {
    if (sessionModeStore.isGuestMode) {
      modalUIStore.openZenMode(entity.id);
      return;
    }
    void goto(href);
  }

  // Whole-row navigation as a convenience; the title cell hosts the real link
  // so keyboard users get a focusable target.
  function handleRowClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) return; // let the title link handle it
    if (target.closest("button")) return; // let filter chips handle it
    if (target.closest("[data-row-select]")) return; // let the checkbox toggle
    openEntity();
  }

  function handleTitleClick(event: MouseEvent) {
    if (sessionModeStore.isGuestMode) {
      event.preventDefault();
      openEntity();
    }
  }
</script>

<tr
  class="group cursor-pointer border-b border-theme-border/60 transition-colors hover:bg-theme-primary/5 {selected
    ? 'bg-theme-primary/10'
    : ''}"
  data-testid="entity-table-row"
  data-selected={selected}
  onclick={handleRowClick}
>
  <!-- Select -->
  <td class="px-3 py-2 align-top" data-row-select>
    <input
      type="checkbox"
      checked={selected}
      onchange={() => onToggleSelect?.(entity.id)}
      aria-label="Select {entity.title}"
      data-testid="entity-table-row-select"
      class="h-4 w-4 cursor-pointer accent-theme-primary"
    />
  </td>

  <!-- Name -->
  <td class="px-3 py-2 align-top">
    <a
      {href}
      onclick={handleTitleClick}
      class="font-header text-sm font-semibold text-theme-text hover:text-theme-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 rounded"
      data-testid="entity-table-row-link"
    >
      {entity.title}
    </a>
  </td>

  <!-- Type -->
  <td class="px-3 py-2 align-top whitespace-nowrap">
    {#if onFilterType}
      <button
        type="button"
        onclick={() => onFilterType(entity.type)}
        title="Filter by {cat?.label ?? entity.type}"
        data-testid="entity-table-row-type-filter"
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {cat
          ? ''
          : 'border-theme-border text-theme-muted'}"
        style={cat ? `border-color: ${cat.color}55; color: ${cat.color};` : ""}
      >
        {#if cat}
          <span class="{getIconClass(cat.icon)} h-3.5 w-3.5" aria-hidden="true"
          ></span>
        {/if}
        {cat?.label ?? entity.type}
      </button>
    {:else if cat}
      <span
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
        style="border-color: {cat.color}55; color: {cat.color};"
      >
        <span class="{getIconClass(cat.icon)} h-3.5 w-3.5" aria-hidden="true"
        ></span>
        {cat.label}
      </span>
    {:else}
      <span class="text-xs text-theme-muted">{entity.type}</span>
    {/if}
  </td>

  <!-- Connections -->
  <td
    class="px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90"
    data-testid="entity-table-connections-{entity.id}"
  >
    <span class="font-medium text-theme-text">{connectionSummary.total}</span>
    {#if connectionSummary.total > 0}
      <span class="text-theme-muted">
        {connectionSummary.inbound} in · {connectionSummary.outbound} out
      </span>
    {/if}
  </td>

  <!-- Summary snippet -->
  <td class="px-3 py-2 align-top">
    {#if snippet}
      <span class="line-clamp-2 text-xs text-theme-muted/90">{snippet}</span>
    {:else}
      <span class="text-theme-muted/50" aria-label="No summary">—</span>
    {/if}
  </td>

  <!-- Labels -->
  <td class="px-3 py-2 align-top">
    {#if chips.length}
      <span class="flex flex-wrap gap-1">
        {#each chips as chip (chip)}
          {#if onFilterLabel}
            <button
              type="button"
              onclick={() => onFilterLabel(chip)}
              title="Filter by {chip}"
              data-testid="entity-table-row-label-filter"
              class="rounded bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted cursor-pointer hover:text-theme-text hover:bg-theme-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
              >{chip}</button
            >
          {:else}
            <span
              class="rounded bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted"
              >{chip}</span
            >
          {/if}
        {/each}
        {#if extraChips > 0}
          <span class="text-[10px] text-theme-muted/60">+{extraChips}</span>
        {/if}
      </span>
    {:else}
      <span class="text-theme-muted/50" aria-label="No labels">—</span>
    {/if}
  </td>

  <!-- Created -->
  <td class="px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90">
    {#if createdAt}
      {formatDate(createdAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No created date">—</span>
    {/if}
  </td>

  <!-- Modified -->
  <td class="px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90">
    {#if modifiedAt}
      {formatDate(modifiedAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No modified date">—</span>
    {/if}
  </td>
</tr>
