<script lang="ts">
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import type { Entity } from "schema";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { buildGuestEntityUrl } from "$lib/services/publishing/guest-link";
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
    showIncompleteOnly = false,
    onToggleSelect,
    connectionSummary,
    onFilterType,
    onFilterLabel,
    activeLabels,
    onContextMenu,
  }: {
    entity: Entity;
    vaultId: string;
    selected?: boolean;
    showIncompleteOnly?: boolean;
    onToggleSelect?: (
      id: string,
      options?: { shift?: boolean; ctrl?: boolean },
    ) => void;
    connectionSummary: ConnectionSummary;
    onFilterType?: (type: string) => void;
    onFilterLabel?: (label: string) => void;
    activeLabels?: Set<string>;
    onContextMenu?: (id: string, x: number, y: number) => void;
  } = $props();

  const cat = $derived(categories.getCategory(entity.type));
  // Type accent: colored left border so entity types stay scannable at a
  // glance in Table view too, matching the List view treatment (#2329).
  const typeColor = $derived(cat?.color ?? null);
  // In guest mode the entity popout route can't resolve the snapshot, so the
  // title link falls back to the guest page (clicks are intercepted anyway).
  const href = $derived(
    sessionModeStore.isGuestMode
      ? buildGuestEntityUrl(vaultId, entity.id, "")
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
      // Keep the selection in sync so the guest page's sidebar and ?entity=
      // deep-link URL reflect what was opened, matching deep-link behavior.
      vault.selectedEntityId = entity.id;
      modalUIStore.openZenMode(entity.id);
      return;
    }
    void goto(href);
  }

  // Whole-row selection toggle
  function handleRowClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) return; // let the title link handle it
    if (target.closest("button")) return; // let filter chips handle it
    if (target.closest("[data-row-select]")) return; // let the checkbox toggle
    onToggleSelect?.(entity.id, {
      shift: event.shiftKey,
      ctrl: event.ctrlKey || event.metaKey,
    });
  }

  function handleTitleClick(event: MouseEvent) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      // Let the browser handle modifier-clicks (open in new tab/window).
      return;
    }
    if (sessionModeStore.isGuestMode) {
      event.preventDefault();
      openEntity();
    }
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    onContextMenu?.(entity.id, event.clientX, event.clientY);
  }
</script>

<tr
  class="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1 p-3 md:table-row md:p-0 group cursor-pointer border-b border-theme-border/60 transition-colors hover:bg-theme-primary/5 {selected
    ? 'bg-theme-primary/10'
    : ''}"
  style:border-left-width={typeColor ? "3px" : null}
  style:border-left-color={typeColor}
  data-testid="entity-table-row"
  data-selected={selected}
  onclick={handleRowClick}
  ondblclick={openEntity}
  oncontextmenu={handleContextMenu}
>
  <!-- Select -->
  <td class="hidden md:table-cell px-3 py-2 align-top" data-row-select>
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
  <td class="col-span-1 p-0 md:table-cell md:px-3 md:py-2 align-top min-w-0">
    <a
      {href}
      onclick={handleTitleClick}
      class="font-header text-sm font-semibold text-theme-text hover:text-theme-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 rounded block truncate md:inline md:whitespace-normal md:overflow-visible"
      data-testid="entity-table-row-link"
    >
      {entity.title}
    </a>
  </td>

  <!-- Type -->
  <td
    class="col-span-1 p-0 md:table-cell md:px-3 md:py-2 align-top whitespace-nowrap justify-self-end md:justify-self-auto"
  >
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
        {cat?.label ?? (entity.type || "note")}
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
    class="hidden md:table-cell px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90"
    data-testid="entity-table-connections-{entity.id}"
  >
    {#if connectionSummary.total > 0}
      <span class="font-medium text-theme-text">{connectionSummary.total}</span>
      <span class="text-theme-muted">
        {connectionSummary.inbound} in · {connectionSummary.outbound} out
      </span>
    {:else if showIncompleteOnly}
      <span
        class="inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        >0 connections</span
      >
    {:else}
      <span class="font-medium text-theme-text">0</span>
    {/if}
  </td>

  <!-- Summary snippet -->
  <td class="col-span-2 p-0 md:table-cell md:px-3 md:py-2 align-top">
    {#if snippet}
      <span class="line-clamp-2 text-xs text-theme-muted/90">{snippet}</span>
    {:else if showIncompleteOnly}
      <span
        class="inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        aria-label="No summary">Missing summary</span
      >
    {:else}
      <span class="text-theme-muted/50 hidden md:inline" aria-label="No summary"
        >—</span
      >
    {/if}
  </td>

  <!-- Labels -->
  <td class="hidden md:table-cell px-3 py-2 align-top">
    {#if chips.length}
      <span class="flex flex-wrap gap-1">
        {#each chips as chip (chip)}
          {#if onFilterLabel}
            <button
              type="button"
              onclick={() => onFilterLabel(chip)}
              title="Filter by {chip}"
              data-testid="entity-table-row-label-filter"
              class="text-[7px] px-1 rounded uppercase tracking-[0.1em] font-mono transition-all border cursor-pointer {activeLabels?.has(
                chip,
              )
                ? 'bg-theme-primary text-theme-bg border-theme-primary'
                : chip === 'chatty'
                  ? 'bg-theme-secondary/15 text-theme-secondary border-transparent hover:border-theme-secondary/50 hover:bg-theme-secondary/25'
                  : 'bg-theme-primary/10 text-theme-primary border-transparent hover:border-theme-primary/50 hover:bg-theme-primary/20'} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-accent/40"
              >{chip}</button
            >
          {:else}
            <span
              class="text-[7px] px-1 rounded uppercase tracking-[0.1em] font-mono border {activeLabels?.has(
                chip,
              )
                ? 'bg-theme-primary text-theme-bg border-theme-primary'
                : 'border-transparent bg-theme-primary/10 text-theme-primary'}"
              >{chip}</span
            >
          {/if}
        {/each}
        {#if extraChips > 0}
          <span class="text-[7px] text-theme-muted font-mono flex items-center"
            >+{extraChips}</span
          >
        {/if}
      </span>
    {:else if showIncompleteOnly}
      <span
        class="inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        aria-label="No labels">No labels</span
      >
    {:else}
      <span class="text-theme-muted/50" aria-label="No labels">—</span>
    {/if}
  </td>

  <!-- Created -->
  <td
    class="hidden md:table-cell px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90"
  >
    {#if createdAt}
      {formatDate(createdAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No created date">—</span>
    {/if}
  </td>

  <!-- Modified -->
  <td
    class="hidden md:table-cell px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90"
  >
    {#if modifiedAt}
      {formatDate(modifiedAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No modified date">—</span>
    {/if}
  </td>
</tr>
